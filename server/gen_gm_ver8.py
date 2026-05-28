from google import genai
from google.genai import types
import json
import logging
import time
import requests
import os                     # 新增：匯入 os 模組
from dotenv import load_dotenv # 新增：匯入 dotenv 套件
import uuid
import random
# --- 載入環境變數 ---
# 這行會去尋找同一目錄下的 .env 檔案，並把裡面的變數載入到系統環境中
load_dotenv()

# --- 讀取 API Keys ---
# 使用 os.getenv() 是最安全的做法，如果找不到該變數，它會回傳 None 而不會報錯導致程式當機
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GMAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
def verify_place_with_google_maps(place_name, destination, api_key=GMAPS_KEY):#"AIzaSyB968naig5ejBNau0ngGRCk3sIDm14pIxE"):
    """
    呼叫 Google Places API (Text Search) 驗證景點是否存在。
    為了節省成本，實務上可以先查本地 DB，沒有再打 API。
    """
    # 這裡我們加上 destination (如：京都) 讓搜尋更精準
    search_query = f"{destination} {place_name}"
    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={search_query}&key={api_key}"
    
    try:
        response = requests.get(url).json()
        # 如果 status 是 OK，且有回傳結果，代表景點大概率存在
        if response.get("status") == "OK" and len(response.get("results", [])) > 0:
            # 你甚至可以直接用 API 回傳的精確 lat, lng 覆蓋 AI 猜測的座標！
            real_lat = response["results"][0]["geometry"]["location"]["lat"]
            real_lng = response["results"][0]["geometry"]["location"]["lng"]
            return True, real_lat, real_lng
        else:
            return False, None, None
    except Exception as e:
        print(f"地圖 API 呼叫失敗: {e}")
        # 若 API 壞掉，為了不阻斷流程，可視情況暫時放行
        return True, None, None
def normalize_region_name(destination: str) -> str:
    """
    將口語地名轉換為資料庫使用的標準 47 都道府縣名稱。
    例如: "京都" -> "京都府", "東京" -> "東京都", "沖繩" -> "沖繩縣"
    """
    official_regions = [
        "三重縣","京都府","佐賀縣","兵庫縣","北海道","千葉縣","和歌山縣","埼玉縣",
        "大分縣","大阪府","奈良縣","宮城縣","宮崎縣","富山縣","山口縣","山形縣",
        "山梨縣","岐阜縣","岡山縣","岩手縣","島根縣","廣島縣","德島縣","愛媛縣",
        "愛知縣","新潟縣","東京都","栃木縣","沖繩縣","滋賀縣","熊本縣","石川縣",
        "神奈川縣","福井縣","福岡縣","福島縣","秋田縣","群馬縣","茨城縣","長崎縣",
        "長野縣","青森縣","靜岡縣","香川縣","高知縣","鳥取縣","鹿兒島縣"
    ]
    
    mapping = {}
    for region in official_regions:
        # 1. 確保輸入「全名」時能正確回傳 (例如輸入"京都府"回傳"京都府")
        mapping[region] = region 
        
        # 2. 自動產生簡稱對應 (把最後一個字 "都"、"府"、"縣" 拿掉)
        if region != "北海道": 
            short_name = region[:-1]
            mapping[short_name] = region
            
    # 3. 處理一些常見的異體字或特例 (可視未來使用者輸入習慣擴充)
    mapping["冲绳"] = "沖繩縣" 
    mapping["群馬"] = "群馬縣" 
    
    # 若在字典中找不到對應，就維持使用者原本的輸入
    return mapping.get(destination, destination)
# 設定日誌，方便在後端 debug
#logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
#logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("execution_log.txt", encoding='utf-8'), # 儲存日誌的 txt
        logging.StreamHandler()                                     # 同時在終端機印出
    ]
)
# 在 gen_gm_ver8.py 中新增以下程式碼
def normalize_generation_preferences(user_prefs: dict) -> dict:
    """
    根據 P/J 類型整理生成參數。
    J 人：完全尊重前端表單。
    P 人：後端決定天數、不限制預算、用收藏景點作為行程核心。
    """
    prefs = dict(user_prefs or {})
    traveler_type = prefs.get("type", "J")

    if traveler_type == "P":
        # P 人天數由後端隨機決定
        prefs["days"] = random.choice([3, 5, 7])

        # P 人不限制預算
        prefs["budget"] = None
        prefs["budgetLabel"] = "無預算限制"

        # P 人如果前端沒有興趣，就給一組寬鬆的預設值
        if not prefs.get("interests"):
            prefs["interests"] = ["自然", "文化", "美食"]

        # P 人偏隨性，不要太緊湊
        prefs["explorationStyle"] = prefs.get("explorationStyle", 45)
        prefs["foodVsAttractions"] = prefs.get("foodVsAttractions", 50)

    else:
        prefs["type"] = "J"
        prefs["budgetLabel"] = f"NT$ {prefs.get('budget', 30000):,}"

    return prefs
def build_p_rag_prompt(destination: list, user_prefs: dict, rag_context: str) -> str:
    days = user_prefs.get("days", 3)
    destinations_str = "、".join(destination)
    must_visit = user_prefs.get("mustVisit", "")
    interests = "、".join(user_prefs.get("interests", []))

    return f"""
    你是一位感性、自由、但仍懂地理動線的日本旅遊 AI 嚮導。
    這次使用者是「P 人 / 隨興探險家」，請規劃一份 {days} 天、沒有預算限制、重視心情流動與地點氛圍的行程。

    【使用者類型】
    - 類型：P 人 / 隨興探險家
    - 目的地地區：{destinations_str}
    - 天數：{days} 天
    - 預算：無預算限制
    - 興趣參考：{interests}
    - 使用者已抽到或收藏的地點：{must_visit}
     
    【🚨 絕對核心限制：RAG 檢索】
    你 **絕對只能** 從下方提供的【官方景點候選清單】與【官方餐廳與美食候選清單】中挑選地點。
    嚴禁自行捏造不在清單上的景點或餐廳。
    【🚨 強制納入規則】
    1. 上方「使用者已抽到／已收藏地點」中的每一個地點，都必須出現在最終 JSON 的 days[*].attractions 裡。
    2. 必須使用完全相同的 `name`，不可改名、不可翻譯、不可替換成相似景點。
    3. 這些地點具有最高優先級。若行程空間不足，先保留這些地點，再刪減其他候選景點。
    4. 這些地點可以分散到不同天，但不可省略。
    5. 最終輸出前，請逐一檢查所有已收藏地點是否都已出現在行程中。
    ---
    {rag_context}
    ---

    【P 人行程規劃邏輯】
    1. 行程不需要像 J 人一樣精準排滿，請保留空氣感與彈性。
    2. 每天安排 2 到 3 個主要地點即可，不要過度緊湊。
    3. 使用者已收藏或抽到的地點，請保證納入行程。
    4. 不需要考慮預算限制，可以安排品質較好的餐廳或體驗。
    5. 每一天要有一個自然的情緒節奏，例如：
       - 早晨：咖啡、神社、安靜散步
       - 下午：街區、自然景觀、美術館、看海
       - 晚上：居酒屋、夜景、在地餐廳
    6. 仍然要注意地理動線，同一天的地點不要相距太遠。
    7. 整趟旅程的景點與餐廳不可重複。
    8. "image" 請填空字串 ""；"position.lat"、"position.lng"、"rating" 請先填 0，系統後續會補上真實值。
    9. "description" 請控制在 30 字以內。
    10. "xai.summary" 不要寫得太理性，請用 20 字以內說明這個地點符合哪種心情或氛圍。
    11. 請直接輸出 JSON，不要加 Markdown，不要加任何說明文字。
    """
def build_selected_spots_context(selected_spots: list) -> tuple[str, dict]:
    if not selected_spots:
        return "", {}

    lines = ["【🚨 使用者已抽到／已收藏地點：必須排入行程】"]
    url_mapping = {}

    for spot in selected_spots:
        name = spot.get("name", "")
        if not name:
            continue

        url_mapping[name] = {
            "image": spot.get("image_url", ""),
            "id": spot.get("id", ""),
            "lat": spot.get("lat", 0.0) or 0.0,
            "lng": spot.get("lng", 0.0) or 0.0,
            "rating": spot.get("google_rating", 0.0) or 0.0,
        }

        interests = ", ".join(spot.get("interests", []))

        lines.append(
            f"- {name} | "
            f"ID: {spot.get('id', '')} | "
            f"地區: {spot.get('region', '')} | "
            f"分類: {spot.get('category', '')} | "
            f"標籤: {interests} | "
            f"描述: {spot.get('context') or spot.get('description') or ''} | "
            f"圖片網址: {spot.get('image_url', '')}"
        )

    return "\n".join(lines), url_mapping


def get_selected_spot_names(user_prefs: dict) -> list[str]:
    selected_spots = user_prefs.get("selectedSpots", [])
    return [
        spot.get("name", "").strip()
        for spot in selected_spots
        if spot.get("name", "").strip()
    ]


def find_missing_selected_spots(generated_data: dict, user_prefs: dict) -> list[str]:
    required_names = get_selected_spot_names(user_prefs)

    generated_names = set()
    for day in generated_data.get("days", []):
        for attr in day.get("attractions", []):
            name = attr.get("name", "").strip()
            if name:
                generated_names.add(name)

    return [
        name for name in required_names
        if name not in generated_names
    ]
def sequence_p_route(spots: list, max_retries: int = 3) -> dict:
    """
    專門為 P 人規劃的感性排序：將傳入的 12 個景點，依照 4 個狀態氛圍與地理位置重新排序。
    """
    logger.info(f"✨ 開始進行 P 人專屬感性排序，共 {len(spots)} 個景點")
    
    # 準備給 AI 看的景點清單字串
    spots_str = "\n".join([
        f"ID: {s['id']} | 名稱: {s['name']} | 地區: {s['area']} | 描述: {s.get('whisper', '')}" 
        for s in spots
    ])

    prompt = f"""
    你現在是一位充滿感性、不按牌理出牌，但又懂旅遊動線的「P人旅遊規劃師」。
    使用者挑選了以下 {len(spots)} 個景點，請你幫忙把它們排序，裝進 4 個不同的「心情狀態」中。

    【景點清單】
    {spots_str}

    【排序任務規範】
    請回傳一個包含這 {len(spots)} 個景點 ID 的陣列，必須嚴格遵守以下順序結構（每 3 個一組）：
    - 第 1~3 個 ID (醒過來的那個早晨)：適合早晨、喝咖啡、清爽舒適的地點。
    - 第 4~6 個 ID (沒有目的地的下午)：適合散步、逛街、充滿未知感的地方。
    - 第 7~9 個 ID (想安靜的時候)：適合獨處、自然景觀、寺廟、遠離喧囂的地方。
    - 第 10~12 個 ID (今晚不想回旅館)：適合夜晚、居酒屋、夜景、熱鬧的地方。

    【動線加分項】
    在符合心情狀態的前提下，請盡量讓同一組（同一個狀態）裡的地點位於同一個「地區」，避免無謂的長途奔波。
    """

    # 定義強制的 JSON 輸出格式
    sequence_schema = {
        "type": "object",
        "properties": {
            "ordered_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "按照早晨、下午、安靜、夜晚順序排列的 12 個景點 ID"
            }
        },
        "required": ["ordered_ids"]
    }

    for attempt in range(1, max_retries + 1):
        try:
            """ response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=sequence_schema,
                    temperature=0.3, # 溫度稍微低一點，確保邏輯正確
                )
            ) """
            response = client.models.generate_content(
            #model="gemma-4-31b-it",
            #model="gemma-4-31b-it",
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=sequence_schema,  # 注意新版叫 response_json_schema
               # temperature=0.1,
                thinking_config=types.ThinkingConfig(
                    thinking_level="medium"
                    #thinking_budget=2048
                    ),
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                )
                ) 
            )
            raw_text = response.text.strip().replace("```json", "").replace("```", "")
            result_json = json.loads(raw_text)
            with open("sort_trip.json", "w", encoding="utf-8") as f:
                json.dump(result_json, f, ensure_ascii=False, indent=2)
            # 🌟 核心防呆：安全地讀取 ordered_ids 欄位，避免 KeyError
            ordered_ids = result_json.get("ordered_ids")
            if ordered_ids and isinstance(ordered_ids, list):
                logger.info("✅ P 人行程排序後處理成功！")
                return {"status": "success", "data": ordered_ids}
            else:
                logger.warning(f"⚠️ JSON 中缺乏正確的 ordered_ids 欄位 (嘗試 {attempt}/{max_retries})")
        except json.JSONDecodeError as e:
            logger.warning(f"⚠️ JSON 解析失敗 (嘗試 {attempt}/{max_retries}): {e}")
        except Exception as e:
            logger.error(f"❌ 排序失敗 (嘗試 {attempt}): {e}")
            if attempt < max_retries: time.sleep(2)
            
    return {"status": "error", "message": "排序失敗"}
logger = logging.getLogger(__name__)
RESTAURANT_LIKE_CATEGORIES = {
    "中華",
    "咖哩",
    "咖啡",
    "壽司",
    "居酒屋",
    "拉麵",
    "日式",
    "海鮮",
    "燒肉",
    "甜點",
    "異國料理",
    "綜合餐廳",
    "義式",
    "西式",
    "酒吧",
    "韓式",
    "麵包輕食",
}

RESTAURANT_LIKE_INTERESTS = {
    "餐廳",
    "美食",
    "咖啡",
    "拉麵",
    "居酒屋",
    "海鮮",
    "壽司",
    "甜點",
    "燒肉",
    "鰻魚",
}
SCENIC_CATEGORY_BY_INTEREST = {
    "文化": ["寺社", "博物館", "文化藝術"],
    "自然": ["溫泉", "景點", "自然"],
    "購物": ["購物", "遊樂"],
}
SCENIC_CATEGORIES = [
    "景點",
    "寺社",
    "自然",
    "博物館",
    "文化藝術",
    "溫泉",
    "購物",
    "遊樂",
]

RESTAURANT_CATEGORIES_FOR_RAG = [
    "中華",
    "咖哩",
    "咖啡",
    "壽司",
    "居酒屋",
    "拉麵",
    "日式",
    "海鮮",
    "燒肉",
    "甜點",
    "異國料理",
    "綜合餐廳",
    "義式",
    "西式",
    "酒吧",
    "韓式",
    "麵包輕食",
]
ALL_SCENIC_CATEGORIES = [
    "景點",
    "寺社",
    "自然",
    "博物館",
    "文化藝術",
    "溫泉",
    "購物",
    "遊樂",
]
VALID_INTERESTS = {"美食", "文化", "購物", "自然"}
def get_user_interests(user_prefs: dict) -> list[str]:
    raw_interests = user_prefs.get("interests", [])

    if isinstance(raw_interests, str):
        raw_interests = [raw_interests]

    interests = [
        str(interest).strip()
        for interest in raw_interests
        if str(interest).strip()
    ]

    return [
        interest
        for interest in interests
        if interest in VALID_INTERESTS
    ]


def get_scenic_categories_by_interests(user_prefs: dict) -> list[str]:
    interests = get_user_interests(user_prefs)

    # 沒有選興趣：每種景點類都抓一點
    if not interests:
        return ALL_SCENIC_CATEGORIES

    categories = []

    for interest in interests:
        categories.extend(SCENIC_CATEGORY_BY_INTEREST.get(interest, []))

    # 如果使用者只選「美食」，景點還是要給一些候選，避免整份行程只有餐廳
    if not categories:
        return ALL_SCENIC_CATEGORIES

    return list(dict.fromkeys(categories))


def should_emphasize_food(user_prefs: dict) -> bool:
    interests = get_user_interests(user_prefs)
    return "美食" in interests
def is_restaurant_like(place: dict) -> bool:
    category = str(place.get("category", "")).strip()
    interests = place.get("interests", [])

    if category in RESTAURANT_LIKE_CATEGORIES:
        return True

    if isinstance(interests, list):
        return any(str(interest).strip() in RESTAURANT_LIKE_INTERESTS for interest in interests)

    return False


def dedupe_by_id_or_name(items: list[dict]) -> list[dict]:
    seen = set()
    output = []

    for item in items:
        key = item.get("id") or item.get("name")
        if not key or key in seen:
            continue

        seen.add(key)
        output.append(item)

    return output


def add_place_to_mapping(url_mapping: dict, place: dict):
    name = place.get("name", "")
    if not name:
        return

    url_mapping[name] = {
        "image": place.get("image_url", ""),
        "id": place.get("id", ""),
        "lat": place.get("lat", 0.0) or 0.0,
        "lng": place.get("lng", 0.0) or 0.0,
        "rating": place.get("google_rating", 0.0) or 0.0,
    }
def fetch_restaurant_pois_for_region(region: str, per_dest_rest_count: int) -> list[dict]:
    DJANGO_API_URL = "http://127.0.0.1:8000/api/pois/"
    restaurants = []

    # 每個分類抓一點，避免全部都是咖啡或全部都是拉麵
    per_category_limit = max(3, per_dest_rest_count // 4)

    for category in RESTAURANT_LIKE_CATEGORIES:
        try:
            params = {
                "region": region,
                "category": category,
                "page_size": per_category_limit,
                "ordering": "-google_rating",
            }

            response = requests.get(DJANGO_API_URL, params=params)

            if response.status_code != 200:
                logger.warning(f"餐廳 POI 查詢失敗：region={region}, category={category}, status={response.status_code}")
                continue

            data = response.json()
            results = data.get("results", [])

            restaurants.extend(results)

        except Exception as e:
            logger.warning(f"餐廳 POI 查詢錯誤：region={region}, category={category}, error={e}")

    restaurants = dedupe_by_id_or_name(restaurants)

    restaurants = sorted(
        restaurants,
        key=lambda item: item.get("google_rating") or 0,
        reverse=True,
    )

    return restaurants[:per_dest_rest_count]
def fetch_pois_by_categories_for_region(
    region: str,
    categories: list[str],
    total_limit: int,
    per_category_limit: int | None = None,
) -> list[dict]:
    DJANGO_API_URL = "http://127.0.0.1:8000/api/pois/"
    items = []

    if not categories:
        return []

    if per_category_limit is None:
        per_category_limit = max(
            3,
            (total_limit + len(categories) - 1) // len(categories) + 2
        )

    for category in categories:
        try:
            params = {
                "region": region,
                "category": category,
                "page_size": per_category_limit,
                "ordering": "-google_rating",
            }

            response = requests.get(DJANGO_API_URL, params=params)

            if response.status_code != 200:
                logger.warning(
                    f"POI 查詢失敗：region={region}, category={category}, status={response.status_code}"
                )
                continue

            data = response.json()
            results = data.get("results", [])

            logger.info(
                f"🔎 POI category query: region={region}, category={category}, count={len(results)}"
            )

            items.extend(results)

        except Exception as e:
            logger.warning(
                f"POI 查詢錯誤：region={region}, category={category}, error={e}"
            )

    items = dedupe_by_id_or_name(items)

    items = sorted(
        items,
        key=lambda item: item.get("google_rating") or 0,
        reverse=True,
    )

    return items[:total_limit]
# --- 1. RAG 檢索器 (Retriever) - 【改為呼叫 Django API】 ---
def retrieve_local_knowledge(
    destinations: list,
    required_count: int,
    user_prefs: dict
) -> tuple[str, dict]:
    """
    根據 user_prefs["interests"] 決定要抓哪些景點 category。
    美食：餐廳候選增加
    文化：寺社 / 博物館 / 文化藝術
    自然：溫泉 / 景點 / 自然
    購物：購物 / 遊樂
    空 interests：每類都抓一點
    """
    url_mapping = {}

    if isinstance(destinations, str):
        destinations = [destinations]

    num_dests = len(destinations) if destinations else 1

    selected_interests = get_user_interests(user_prefs)
    scenic_categories = get_scenic_categories_by_interests(user_prefs)
    food_emphasis = should_emphasize_food(user_prefs)

    per_dest_scenic_count = max(required_count // num_dests, 8)

    days = user_prefs.get("days", 3)

    # 有美食興趣：餐廳候選明顯多一點
    # 沒有美食興趣：餐廳仍保留一些，因為行程每天需要吃飯
    if food_emphasis:
        rest_count = days * 3 + 12
    elif not selected_interests:
        # 空 interests：每個類型各取一點，餐廳不特別加權
        rest_count = days * 2 + 8
    else:
        rest_count = days * 1 + 6

    per_dest_rest_count = max(rest_count // num_dests, 4)

    scenic_places = []
    restaurant_places = []

    try:
        for dest in destinations:
            region = normalize_region_name(dest)

            logger.info(
                f"🧭 RAG interests={selected_interests or 'ALL'}, "
                f"region={region}, scenic_categories={scenic_categories}, "
                f"food_emphasis={food_emphasis}"
            )

            # 1. 景點候選：依 interests 對應 category 抓
            region_scenic = fetch_pois_by_categories_for_region(
                region=region,
                categories=scenic_categories,
                total_limit=per_dest_scenic_count,
                per_category_limit=None,
            )

            logger.info(
                f"📍 景點類檢索完成：region={region}, count={len(region_scenic)}"
            )

            scenic_places.extend(region_scenic)

            # 2. 餐廳候選：美食興趣時多抓；非美食時少抓
            region_restaurants = fetch_pois_by_categories_for_region(
                region=region,
                categories=RESTAURANT_CATEGORIES_FOR_RAG,
                total_limit=per_dest_rest_count,
                per_category_limit=None,
            )

            logger.info(
                f"🍜 餐廳類檢索完成：region={region}, count={len(region_restaurants)}"
            )

            restaurant_places.extend(region_restaurants)

        scenic_places = dedupe_by_id_or_name(scenic_places)[:30]
        restaurant_places = dedupe_by_id_or_name(restaurant_places)

        if not scenic_places:
            logger.warning(
                f"⚠️ Django API 沒有取得 {destinations} 的景點 category 資料"
            )
            return "目前資料庫無該地區的景點資料。", {}

        context_lines = ["【📍 官方景點候選清單】"]

        for p in scenic_places:
            add_place_to_mapping(url_mapping, p)

            interests_str = ", ".join(p.get("interests", []))
            line = (
                f"- {p.get('name', '')} ({p.get('category', '景點')}) | "
                f"地區: {p.get('region', '')} | "
                f"評分: {p.get('google_rating', '無')} ({p.get('review_count', 0)}則) | "
                f"標籤: {interests_str} | "
                f"交通: 距 {p.get('station_anchor', '')} {p.get('distance_to_station_km', 0)}km | "
                f"圖片網址: {p.get('image_url', '')}"
            )
            context_lines.append(line)

        context_lines.append("\n【🍜 官方餐廳與美食候選清單】")

        if not restaurant_places:
            context_lines.append("- (目前無推薦餐廳資料)")
        else:
            for r in restaurant_places:
                add_place_to_mapping(url_mapping, r)

                interests_str = ", ".join(r.get("interests", []))
                line = (
                    f"- {r.get('name', '')} ({r.get('category', '美食')}) | "
                    f"地區: {r.get('region', '')} | "
                    f"評分: {r.get('google_rating', '無')} ({r.get('review_count', 0)}則) | "
                    f"標籤: {interests_str} | "
                    f"圖片: {r.get('image_url', '')}"
                )
                context_lines.append(line)

        with open("sql_history.json", "w", encoding="utf-8") as f:
            json.dump(context_lines, f, ensure_ascii=False, indent=2)

        return "\n".join(context_lines), url_mapping

    except requests.exceptions.RequestException as e:
        logger.error(
            f"與 Django API 連線失敗！請確認組員的伺服器有開啟: {e}"
        )
        return "", {}
def retrieve_local_knowledge2(destinations: list, required_count: int, user_prefs: dict) -> tuple[str, dict]:
    """
    呼叫組員的 Django API 讀取景點資料。若符合的高分景點數量不足，會自動降低星等標準。
    """
    DJANGO_API_URL = "http://127.0.0.1:8000/api/pois/"
    url_mapping = {}
    if isinstance(destinations, str):
        destinations = [destinations]
    num_dests = len(destinations) if len(destinations) > 0 else 1
    per_dest_required = max(required_count // num_dests, 8) # 每個城市至少抓 8 個點防呆
    try:
        # 建立降級策略：從嚴格到寬鬆 (4.2 -> 3.8 -> 3.0 -> 0.0)
        thresholds = [4.2, 3.8, 3.0, 0.0]
        top_places = []
        
        for dest in destinations:
            rest_region = normalize_region_name(dest)
            region_places = []
            for min_rating in thresholds:
                params = {
                    "region": rest_region,
                    "page_size": 5000, # 拿多一點來方便 Python 端過濾
                    "ordering": "-google_rating" # 讓 Django 幫忙由高到低排序
                }
                
                response = requests.get(DJANGO_API_URL, params=params)
                
                if response.status_code == 200:
                    api_data = response.json()
                    all_results = api_data.get("results", [])
                    
                    # 篩選：確保評分達標
                    filtered_places = [
                        place for place in all_results
                        if (place.get("google_rating") or 0) >= min_rating
                        and not is_restaurant_like(place)
                        #if place.get("google_rating") is not None
                        #and place.get("google_rating", 0) >= min_rating
                        #and not is_restaurant_like(place)
                    ]
                    restaurant_like_count = sum(1 for place in all_results if is_restaurant_like(place))
                    no_rating_count = sum(1 for place in all_results if place.get("google_rating") is None)
                    logger.info(
                        f"🔎 region={rest_region}, min_rating={min_rating}, "
                        f"raw={len(all_results)}, "
                        f"restaurant_like={restaurant_like_count}, "
                        f"no_rating={no_rating_count}, "
                        f"filtered={len(filtered_places)}"
                    )

                    logger.info(
                        "🔎 raw sample: " + json.dumps(
                            [
                                {
                                    "name": p.get("name"),
                                    "region": p.get("region"),
                                    "category": p.get("category"),
                                    "google_rating": p.get("google_rating"),
                                    "interests": p.get("interests"),
                                    "is_restaurant_like": is_restaurant_like(p),
                                }
                                for p in all_results[:5]
                            ],
                            ensure_ascii=False
                        )
                    )
                    # 如果找到的數量大於等於我們需要的數量，就停止降級
                    if len(filtered_places) >= per_dest_required:
                        region_places = filtered_places[:per_dest_required + 5]
                        break
                    region_places = filtered_places[:per_dest_required + 5]
                else:
                    logger.error(f"呼叫 Django API 失敗: HTTP {response.status_code}")
                    return "資料庫連線異常。", {}
            top_places.extend(region_places)

        if not top_places:
            logger.warning(f"⚠️ Django API 完全沒有 {destinations} 的資料！")
            return "目前資料庫無該地區的景點資料。", {}
        top_places = dedupe_by_id_or_name(top_places)[:30]
        # 轉為文字 Context
        context_lines = ["【📍 官方景點候選清單】"]
        for p in top_places:
            url_mapping[p['name']] = {
                "image": p.get('image_url', ''),
                "id": p.get('id', ''),
                "lat": p.get('lat', 0.0),            # 👈 新增
                "lng": p.get('lng', 0.0),            # 👈 新增
                "rating": p.get('google_rating', 0.0) # 👈 新增
            }
            interests_str = ", ".join(p.get("interests", []))
            line = (f"- {p['name']} ({p.get('google_name_matched', '')}) | "
                    f"評分: {p.get('google_rating', '無')} ({p.get('review_count', 0)}則) | "
                    f"標籤: {interests_str} | "
                    f"交通: 距 {p.get('station_anchor', '')} {p.get('distance_to_station_km', 0)}km | "
                    f"圖片網址: {p.get('image_url', '')}") # ✅ 確保圖片網址餵給 AI
            context_lines.append(line)
        

        # --- 2. 抓取餐廳 (Restaurants) ---
        # 根據使用者的 foodVsAttractions 決定抓取多少餐廳 (數值越低代表越重視美食)
        days = user_prefs.get('days', 3)
        food_weight = user_prefs.get('foodVsAttractions', 50)
        #rest_count = 30 if food_weight < 30 else 15 # 吃貨抓20間，普通抓10間給AI選
        # 動態計算餐廳需求量：每天至少預備 2 間餐廳，再加上 Buffer 讓 AI 挑
        base_rest_needed = days * 2
        buffer = 15 if food_weight < 30 else 8 # 偏好美食就給更多 Buffer
        rest_count = base_rest_needed + buffer
        per_dest_rest_count = max(rest_count // num_dests, 4)
        context_lines.append("\n【🍜 官方餐廳與美食候選清單】")
        try:
            all_restaurants = []

            for dest in destinations:
                rest_region = normalize_region_name(dest)

                rests = fetch_restaurant_pois_for_region(
                    region=rest_region,
                    per_dest_rest_count=per_dest_rest_count,
                )

                all_restaurants.extend(rests)

            all_restaurants = dedupe_by_id_or_name(all_restaurants)
            if not all_restaurants:
                context_lines.append("- (目前無推薦餐廳資料)")
            else:
                for r in all_restaurants:
                    add_place_to_mapping(url_mapping, r)

                    interests_str = ", ".join(r.get("interests", []))
                    line = (
                        f"- {r.get('name', '')} ({r.get('category', '美食')}) | "
                        f"地區: {r.get('region', '')} | "
                        f"評分: {r.get('google_rating', '無')} ({r.get('review_count', 0)}則) | "
                        f"標籤: {interests_str} | "
                        f"圖片: {r.get('image_url', '')}"
                    )
                    context_lines.append(line)   
        except Exception as e:
            logger.error(f"抓取餐廳失敗: {e}")
            context_lines.append("- (餐廳 API 連線異常)")
        with open("sql_history.json", "w", encoding="utf-8") as f:
                json.dump(context_lines, f, ensure_ascii=False, indent=2)
        return "\n".join(context_lines), url_mapping
        
    except requests.exceptions.RequestException as e:
        logger.error(f"與 Django API 連線失敗！請確認組員的伺服器有開啟: {e}")
        return "", {}
def build_modify_prompt(current_itinerary: dict, user_request: str, rag_context: str) -> str:
    # 將目前的 JSON 轉成字串讓 AI 讀取
    current_json_str = json.dumps(current_itinerary, ensure_ascii=False, indent=2)
    
    return f"""
    你現在是一位專精於旅遊規劃的資深 AI 嚮導。
    使用者對於目前的行程安排有一些意見，請根據【使用者的修改需求】，調整【目前的行程】。

    【目前的行程】
    ```json
    {current_json_str}
    ```

    【使用者的修改需求】
    💬 "{user_request}"

    【🚨 絕對核心限制：資料庫檢索增強 (RAG)】
    你 **絕對只能** 從下方我提供的【官方景點候選清單】中挑選地點來替換或新增。
    嚴禁自行捏造不在清單上的景點。
    ---
    {rag_context}
    ---

    【修改邏輯規範】
    1. 【精準修改】：只針對使用者提到的需求進行修改（例如替換某個景點、刪除某個行程）。使用者沒提到的天數或時段，請**盡可能保持原樣**。
    2. 美食安排：🚨【強制要求】每一天的行程中，務必「至少」安排 1 到 2 間【官方餐廳與美食候選清單】中的店家作為午餐或晚餐！絕不可出現沒有安排任何餐廳的天數。請注意「地理位置合理性」，餐廳應盡量安排在當天景點的附近。
    3. 【交通合理性】：修改後，請再次確認該天的行程串接是否合理。
    4. 輸出必須是一份完整的、包含所有天數的最新 JSON 行程表，格式必須與原始結構完全一致。
    5. 🚨 【格式絕對限制】：請「直接」輸出 JSON 內容，絕對不要加上 ```json 的 Markdown 標記，也絕對不要在 JSON 前後加上任何問候語、解釋或額外文字！
    6. 🚨 【絕不重複】：修改後的所有景點與餐廳絕對不可重複出現。
    7. "image" 請填空字串 ""，而 "position" 中的 "lat" 和 "lng"、以及 "rating" 欄位請一律直接填入數字 0！系統會在後續自動為你補上正確的真實數值。
    """
def modify_itinerary( current_itinerary: dict, user_request: str, user_prefs: dict, max_retries: int = 3) -> dict:
    """
    處理使用者從前端聊天室發出的修改請求
    """
    logger.info(f"💬 收到使用者的修改需求: {user_request}")
    destination = user_prefs.get('destination', ["京都"])
    # 步驟 1：檢索 RAG 知識 (一樣需要載入候選名單供 AI 替換)
    rag_context,url_mapping = retrieve_local_knowledge(destination, required_count=15, user_prefs=user_prefs)
    if not rag_context or "無該城市" in rag_context:
        return {"status": "error", "message": "資料庫異常，無法進行修改。"}

    # 步驟 2：構建修改專用的 Prompt
    prompt = build_modify_prompt(current_itinerary, user_request, rag_context)

    # 步驟 3：執行生成與重試機制
    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
            #model="gemma-4-31b-it",
            #model="gemma-4-31b-it",
            #model="gemini-2.5-flash",
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=itinerary_schema,  # 注意新版叫 response_json_schema
                #temperature=0.1,
                thinking_config=types.ThinkingConfig(
                    thinking_level="medium"
                    #thinking_budget=2048
                    ),
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                )
                ) 
            )
            

            # --- 💪 增強版的解析寫法 ---
            raw_text = response.text.strip()
            
            # 清除 LLM 經常自動加上的 Markdown 標記
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:] # 拔掉開頭的 ```json
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:] # 拔掉開頭的 ```
                
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3] # 拔掉結尾的 ```
                
            raw_text = raw_text.strip() # 再次清除前後空白與換行
            result_json = json.loads(raw_text)
            for day in result_json.get('days', []):
                for attr in day.get('attractions', []):
                    place_name = attr.get('name', '')
                    if place_name in url_mapping:
                        attr['image'] = url_mapping[place_name]['image']
                        attr['id'] = url_mapping[place_name]['id']
                        attr['position'] = {
                            'lat': url_mapping[place_name]['lat'],
                            'lng': url_mapping[place_name]['lng']
                        }
                        attr['rating'] = url_mapping[place_name]['rating'] # 👈 塞入真實評分
            # (可選) 這裡一樣可以加入 verify_place_with_google_maps 來做二次防護
            
            logger.info("✅ 行程修改成功！")
            
            # 如果有存 DB 的需求，可以在這裡 Update 資料庫
            # update_db_itinerary(...)
            
            return {
                "status": "success",
                "data": result_json
            }
            
        except json.JSONDecodeError as e:
            logger.warning(f"⚠️ JSON 格式破裂 (嘗試 {attempt}/{max_retries}): {e}")
        except Exception as e:
            logger.error(f"❌ 修改過程中發生錯誤 (嘗試 {attempt}/{max_retries}): {e}")
            
        if attempt < max_retries:
            time.sleep(2)
            
    return {"status": "error", "message": "行程修改失敗，請換個說法再試一次。"}
# --- 2. RAG 專屬 Prompt ---
def build_rag_prompt(destination: list, user_prefs: dict, rag_context: str) -> str:
    # 直接從對齊前端格式的字典中取值
    days = user_prefs.get('days', 3)
    budget = user_prefs.get('budget', 30000)
    interests = "、".join(user_prefs.get('interests', []))
    destinations_str = "、".join(destination)
    # 解析滑桿數值邏輯，轉換成 AI 易懂的指令
    exp_val = user_prefs.get('explorationStyle', 50)
    pace_desc = "非常悠閒，每天安排 2 個點即可" if exp_val < 30 else "步調緊湊，每天安排 4-5 個點" if exp_val > 70 else "步調適中，每天安排 3-4 個點"
    
    food_val = user_prefs.get('foodVsAttractions', 50)
    focus_desc = "強烈偏重當地美食與餐廳體驗" if food_val < 30 else "強烈偏重著名景點與地標觀光" if food_val > 70 else "均衡安排美食與觀光景點"

    must_visit = user_prefs.get('mustVisit', "")
    rag_note = f"並參考使用者提供的攻略內容：{user_prefs.get('ragContent')}" if user_prefs.get('ragContent') else ""

    return f"""
    你是一位嚴謹的旅遊 AI 嚮導。
    這次使用者是「J 人 / 行程指揮官」，請為使用者規劃 {days} 天跨越【{destinations_str}】的結構化行程。

    【使用者偏好與參數】
    - 目的地城市：{destinations_str}
    - 興趣標籤：{interests}
    - 預算：NT$ {budget}
    - 旅遊步調：{pace_desc}
    - 內容偏重：{focus_desc}
    - 必去景點：{must_visit}
    {rag_note}

    【🚨 絕對核心限制：RAG 檢索】
    你 **絕對只能** 從下方提供的【官方景點候選清單】中挑選地點。
    ---
    {rag_context}
    ---

    【任務邏輯規範】
    1. 行程密度：請嚴格遵守「{pace_desc}」的規範安排每日景點數量。
    2. 美食安排：每一天的行程中，務必安排 1 到 2 間美食餐廳作為午餐或晚餐！
    3. 🚨【跨城市路線合理性】：本次行程包含多個城市（{destinations_str}）。請在天數分配上進行合理的「區域塊狀分組」（例如 7 天行程：第 1~3 天完全集中在大阪，第 4~7 天完全移動並集中在京都）。【絕對禁止】在同一天內或相鄰天數來回切換不同縣市，務必將跨縣市的大型交通移動次數降到最低！
    4. 🚨【絕不重複】：整趟旅程的所有景點與餐廳「絕對不可以重複出現」。
    5. 欄位極速輸出規範：為了大幅提升生成速度，"image" 欄位請一律直接填入空字串 ""；；而 "position" 中的 "lat"、"lng" 以及 "rating" 請直接填入數字 0，系統會自動在後續補上真實數值。
    6. "xai" 欄位規範：
       - `summary`: 必須直接提及使用者的興趣（如 {", ".join(user_prefs.get('interests', []))}）與此景點的關聯。
       - `scores`: 請提供 2-3 個評分維度，例如：「興趣符合度」、「交通便利度」、「人氣熱度」。
       - 20字以內
    7. 🚨 【格式絕對限制】：請直接輸出 JSON 內容，絕對不要加上 ```json 的 Markdown 標記，也絕對不要在 JSON 前後加上任何問候語或額外文字！
    8. ⚡ 【速度與長度最佳化】：為了加快你的輸出速度，請將所有景點與餐廳的 `description` (詳細介紹) 嚴格控制在「30字以內」的精華短語！
    """
# --- 1. 定義更新後的 JSON Schema ---
# 加入 day_number 讓行程有時間序
itinerary_schema = {
    "type": "object",
    "properties": {
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {"type": "integer"},
                    "date": {"type": "string", "description": "例如：'第1天' 或 '4/18 (五)'"},
                    "attractions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string", "description": "唯一編號，如 'a01'"},
                                "name": {"type": "string"},
                                "image": {"type": "string", "description": "景點圖片的 URL 網址"},
                                "category": {"type": "string", "enum": ["文化", "美食", "購物", "自然"]},
                                "description": {"type": "string", "description": "詳細介紹景點"},
                                "duration": {"type": "string", "description": "預計停留時間，如 '2–3 小時'"},
                                "estimatedCost": {"type": "string", "description": "預計花費，如 '免費' 或 '¥2,000'"},
                                "location": {"type": "string", "description": "地區，如 '京都・東山区'"},
                                "position": {
                                    "type": "object",
                                    "properties": {
                                        "lat": {"type": "number"},
                                        "lng": {"type": "number"}
                                    },
                                    "required": ["lat", "lng"]
                                },
                                "rating": {"type": "number", "description": "Google評分"},
                                "xai": {
                                    "type": "object",
                                    "properties": {
                                        "summary": {"type": "string", "description": "說明此景點為何符合使用者偏好"},
                                        "scores": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "label": {"type": "string", "description": "評分維度名稱，例如：文化符合度、交通便利度"},
                                                    "value": {"type": "integer", "description": "請給予 0 到 100 之間的分數"}
                                                },
                                                "required": ["label", "value"]
                                            }
                                        }
                                    },
                                    "required": ["summary", "scores"]
                                }
                            },
                            "required": ["id", "name", "image", "category", "description", "duration", "estimatedCost", "location", "rating", "position", "xai"]
                        }
                    }
                },
                "required": ["day", "date", "attractions"]
            }
        }
    }
}



# --- 2. Prompt 優化：動態生成提示詞 ---
def build_prompt(destination: str, user_prefs: dict) -> str:
    # 解析偏好參數
    days = user_prefs.get('days', 3)
    budget = user_prefs.get('budget', '中等')
    style = user_prefs.get('style', '經典必訪')
    dietary = user_prefs.get('dietary_restrictions', '無特別限制')
    
    return f"""
    你現在是一位專精於旅遊規劃的資深 AI 嚮導。
    請根據以下【目的地】與【使用者偏好】，為使用者規劃一份結構化的行程。

    【任務參數】
    - 目的地：{destination}
    - 總天數：{days} 天
    - 預算等級：{budget}
    - 旅遊風格：{style}
    - 飲食禁忌：{dietary}

    【任務邏輯規範】
    1. 請為每天規劃 3-4 個合理的行程節點，確保同一天的地點在交通上方便串接。
    2. 必須嚴格遵守「飲食禁忌」來推薦餐廳（若為無肉不歡，請勿推薦素食；若為素食，必須推薦有提供素食的餐廳）。
    3. 【絕對禁止捏造】：你推薦的 `place_name` 必須是「Google Maps 上真實存在且可搜尋到」的官方名稱（例如：請用「大原三千院」，絕對不可自行發明如「大原三千翔」等詞彙）。
    4. 總輸出請涵蓋第 1 天到第 {days} 天的完整行程。
    5. 若你對某個地點的真實性不確定，請改推薦該地區絕對知名、具代表性的真實景點。
    6. "xai_reason" 欄位請精準說明該地點為何契合使用者的預算或旅遊風格。
    7. ⚡ 【速度與長度最佳化】：為了加快你的輸出速度，請將所有景點與餐廳的 `description` (詳細介紹) 嚴格控制在「30字以內」的精華短語！
    """

# --- 3. Mock Database Function ---
def save_to_db(user_id: str, destination: str, itinerary_data: dict):
    """模擬將資料寫入關聯式資料庫或 NoSQL 的行為"""
    logger.info(f"💾 正在將 {destination} 的行程儲存至資料庫 (User: {user_id})...")
    # 這裡可以接 SQLAlchemy (PostgreSQL) 或 PyMongo (MongoDB) 的實作
    # db.itineraries.insert_one({...})
    return True
def parse_must_visit_names(user_prefs: dict) -> list[str]:
    raw = user_prefs.get("mustVisit", "")

    if not raw:
        return []

    return [
        name.strip()
        for name in raw.replace("，", "、").replace(",", "、").split("、")
        if name.strip()
    ]


def get_required_spot_names(user_prefs: dict) -> list[str]:
    selected_spots = user_prefs.get("selectedSpots", [])

    selected_names = [
        spot.get("name", "").strip()
        for spot in selected_spots
        if spot.get("name", "").strip()
    ]

    must_visit_names = parse_must_visit_names(user_prefs)

    # 去重但保留順序
    return list(dict.fromkeys(selected_names + must_visit_names))
# --- 4. 服務層：生成、重試與驗證 ---
client = genai.Client(api_key=GEMINI_KEY)
#model = genai.GenerativeModel('gemma-4-31b-it') 
def generate_itinerary(user_prefs: dict, max_retries: int = 3) -> dict:
    print(f"✅ selectedSpots count: {len(user_prefs.get('selectedSpots', []))}")
    print(f"✅ required spots: {get_required_spot_names(user_prefs)}")
    # 先依照 P/J 類型整理偏好
    user_prefs = normalize_generation_preferences(user_prefs)
    traveler_type = user_prefs.get("type", "J")
    days = user_prefs.get("days", 3)
    exp_style = user_prefs.get("explorationStyle", 50)
    destination = user_prefs.get("destination", ["京都"])
    # 步驟 1：檢索 RAG 知識
    #days = user_prefs.get('days', 3)
    required_count = days * 3 
    #exp_style = user_prefs.get('explorationStyle', 50)
    #destination = user_prefs.get('destination', ["京都"])
    # 根據步調決定每天「最少需要」幾個點
    if exp_style > 70:
        points_per_day = 4  # 緊湊：每天排 4 點
    elif exp_style < 30:
        points_per_day = 2  # 悠閒：每天排 2 點
    else:
        points_per_day = 3  # 適中：每天排 3 點
        
    # 計算最低需求量，並額外加上 5~10 個「候補額度 (Buffer)」給 AI 挑選
    required_count = (days * points_per_day) + 5
    # 步驟 1：檢索 RAG 知識 (傳入所需數量)
    rag_context, url_mapping = retrieve_local_knowledge(destination, required_count,user_prefs)
    selected_spots_context, selected_url_mapping = build_selected_spots_context(
        user_prefs.get("selectedSpots", [])
    )

    url_mapping.update(selected_url_mapping)

    if traveler_type == "P" and selected_spots_context:
        rag_context = selected_spots_context + "\n\n" + rag_context
    #rag_context = retrieve_local_knowledge(destination)
    if not rag_context or "無該城市" in rag_context:
        return {"status": "error", "message": "資料庫缺乏景點資訊"}
        
    # 步驟 2：構建 Prompt
    #prompt = build_rag_prompt(destination, user_prefs, rag_context)
    if traveler_type == "P":
        prompt = build_p_rag_prompt(destination, user_prefs, rag_context)
    else:
        prompt = build_rag_prompt(destination, user_prefs, rag_context)


    for attempt in range(1, max_retries + 1):
        try:
            # 💡 再次建議：使用 'gemini-1.5-flash' 以獲得最穩定的 JSON 輸出
            response = client.models.generate_content(
            #model="gemma-4-31b-it",
            model= "gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=itinerary_schema,  # 注意新版叫 response_json_schema
                #temperature=0.1,
                thinking_config=types.ThinkingConfig(
                    thinking_level="medium"
                    #thinking_budget=2048
                    )
                ,automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                )
                )
            )

            
            # 清洗並解析 JSON
            raw_text = response.text.strip().replace("```json", "").replace("```", "")
            generated_data = json.loads(raw_text)
            if traveler_type == "P":
                missing_selected = find_missing_selected_spots(generated_data, user_prefs)

                if missing_selected:
                    raise ValueError(
                        f"P 人行程缺少使用者已選地點：{', '.join(missing_selected)}"
                    )
            for day in generated_data.get('days', []):
                for attr in day.get('attractions', []):
                    place_name = attr.get('name', '')
                    # 如果 AI 生成的名稱有在我們提供的名單內
                    if place_name in url_mapping:
                        attr['image'] = url_mapping[place_name]['image']  # 注入真實圖片網址
                        attr['id'] = url_mapping[place_name]['id']        # 注入真實資料庫 ID
                        attr['position'] = {
                            'lat': url_mapping[place_name]['lat'],
                            'lng': url_mapping[place_name]['lng']
                        }
                        attr['rating'] = url_mapping[place_name]['rating'] # 👈 塞入真實評分
            # --- 步驟 3：包裝前端所需的完整 Trip 物件 ---
            total_attractions = sum(len(day['attractions']) for day in generated_data['days'])
            if traveler_type == "P":
                total_budget_label = "無預算限制"
            else:
                total_budget_label = f"NT$ {user_prefs.get('budget', 0):,}"
            final_trip = {
                "id": f"trip-{uuid.uuid4().hex[:8]}", # 產生唯一 ID
                "preferences": user_prefs,            # 原封不動退回使用者設定
                "summary": {
                    "totalDays": user_prefs.get("days", 0),
                    "totalBudget": total_budget_label,
                    "totalAttractions": total_attractions,
                    "avgPerDay": round(total_attractions / user_prefs.get("days", 1), 1)
                },
                "days": generated_data["days"],
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

            logger.info("✅ 成功生成符合前端格式的 Trip 物件")
            with open("initial_itinerary.json", "w", encoding="utf-8") as f:
                json.dump(final_trip, f, ensure_ascii=False, indent=2)
            return {
                "status": "success",
                "data": final_trip # 這個 data 就是前端 api.ts 預期收到的內容
            }
            
        except Exception as e:
            logger.error(f"❌ 生成失敗 (嘗試 {attempt}/{max_retries}): {e}")
            if attempt < max_retries: time.sleep(2)
            
    return {"status": "error", "message": "行程生成失敗，請稍後再試"}

# --- 5. 測試執行 ---
if __name__ == "__main__":
    test="p"
    if test=="p":
        # ==========================================
        # 🌟 新增：階段 3 - 測試 P 人專屬感性排序 🌟
        # ==========================================
        logger.info("\n=== 階段 3：模擬前端 P 人頁面點擊「AI 順一下」 ===")
        
        # 模擬前端畫面上收集到的 12 個景點 (包含收藏與隨機補足的點)
        mock_p_spots = [
            {"id": "f1", "name": "鴨川河岸", "area": "京都", "whisper": "下班的人席地而坐,河水把日子帶走。"},
            {"id": "f2", "name": "新宿御苑深處", "area": "東京", "whisper": "離車站 10 分鐘,聽不到車聲。"},
            {"id": "f3", "name": "嵐山小火車", "area": "京都", "whisper": "1 小時的窗外風景,不需要努力。"},
            {"id": "f4", "name": "高雄夜市旁的居酒屋", "area": "大阪", "whisper": "店長不會說中文,但會幫你倒酒。"},
            {"id": "f5", "name": "深川的小書店", "area": "東京", "whisper": "二樓的二手書多到要側著走。"},
            {"id": "f6", "name": "金澤兼六園清晨", "area": "金澤", "whisper": "9 點前進場,日本三名園還沒醒。"},
            {"id": "f7", "name": "下北澤散步", "area": "東京", "whisper": "二手衣店一家比一家奇怪。"},
            {"id": "f8", "name": "京都本能寺燒亡之地", "area": "京都", "whisper": "歷史故事在地上,沒有立牌。"},
            {"id": "a01", "name": "伏見稻荷大社", "area": "京都", "whisper": "早晨的千本鳥居沒有觀光客。"},
            {"id": "a02", "name": "錦市場", "area": "京都", "whisper": "邊走邊吃的京都廚房。"},
            {"id": "a03", "name": "道頓堀", "area": "大阪", "whisper": "霓虹燈和章魚燒的熱鬧夜晚。"},
            {"id": "a04", "name": "清水寺", "area": "京都", "whisper": "從舞台看夕陽慢慢落下。"}
        ]
        
        # 呼叫 P 人排序 API
        p_sort_result = sequence_p_route(spots=mock_p_spots)
        
        if p_sort_result["status"] == "success":
            ordered_ids = p_sort_result["data"]
            logger.info(f"🎉 排序成功！AI 回傳的新順序 ID：{ordered_ids}")
            
            # 為了方便終端機閱讀，把 ID 轉回中文景點名稱印出來
            id_to_name = {s["id"]: s["name"] for s in mock_p_spots}
            
            print("\n--- ✨ AI 安排的 P 人心情狀態排序 ---")
            themes = ["🌅 醒過來的那個早晨", "🚶 沒有目的地的下午", "🍃 想安靜的時候", "🌃 今晚不想回旅館"]
            
            for i, theme in enumerate(themes):
                print(f"\n{theme}")
                # 每個主題取 3 個景點
                theme_ids = ordered_ids[i*3 : (i+1)*3]
                for tid in theme_ids:
                    # 如果 AI 回傳了奇怪的 ID (防呆機制)，會顯示為 Unknown
                    print(f" - {id_to_name.get(tid, 'Unknown ID: ' + str(tid))}")
        else:
            logger.error(f"❌ P 人排序測試失敗: {p_sort_result['message']}")
    else:
        # --- 測試執行與模擬前端流程 ---
        logger.info("=== 階段 1：模擬前端首次請求行程 ===")
        frontend_payload = {
            "days": 4,
            "budget": 30000,
            "interests": ["美食", "文化"],
            "destination": ["大阪", "京都"], # 🌟 多城市陣列
            "explorationStyle": 50,
            "foodVsAttractions": 50,
            "mustVisit": "",
            "ragContent": "",
            "specialRequirements": ""
        }
        
        # 移除不存在的 user_id 參數
        initial_result = generate_itinerary(
            user_prefs=frontend_payload
        )
        
        if initial_result["status"] == "success":
            current_itinerary_state = initial_result["data"]
            logger.info("🎉 初版行程生成成功！(寫入 initial_itinerary.json)")
            
            with open("initial_itinerary.json", "w", encoding="utf-8") as f:
                json.dump(current_itinerary_state, f, ensure_ascii=False, indent=2)
                
            print("\n--- 初版行程 ---")
            # ✅ 已修正：適配新的 nested JSON Schema (days -> attractions)
            for day_data in current_itinerary_state.get("days", []):
                print(f"\n[ Day {day_data.get('day')} - {day_data.get('date')} ]")
                for attr in day_data.get("attractions", []):
                    print(f"- {attr.get('name')} ({attr.get('category')}) | 推薦理由: {attr.get('xai', {}).get('summary', '')}")
                
            logger.info("\n=== 階段 2：模擬使用者在聊天室提出修改 ===")
            # 假設使用者覺得清水寺或嵐山人太多，想要換成看海或爬山的秘境
            user_chat_message = "我覺得人潮眾多的地方太多了，能不能把其中一個景點換成可以看海或是遠離喧囂爬山的地方？"
            logger.info(f"使用者輸入: {user_chat_message}")
            
            # 2. 呼叫對話修改服務
            modify_result = modify_itinerary(
                current_itinerary=current_itinerary_state, # 傳入剛剛生成的狀態
                user_request=user_chat_message,
                user_prefs=current_itinerary_state.get("preferences")
            )
            
            if modify_result["status"] == "success":
                updated_itinerary_state = modify_result["data"]
                logger.info("🎉 行程修改成功！(寫入 updated_itinerary.json)")
                
                with open("updated_itinerary.json", "w", encoding="utf-8") as f:
                    json.dump(updated_itinerary_state, f, ensure_ascii=False, indent=2)
                    
                print("\n--- 修改後的行程 ---")
                for day_data in updated_itinerary_state.get("days", []):
                    print(f"\n[ Day {day_data.get('day')} - {day_data.get('date')} ]")
                    for attr in day_data.get("attractions", []):
                        print(f"- {attr.get('name')} ({attr.get('category')}) | 推薦理由: {attr.get('xai', {}).get('summary', '')}")
                    
            else:
                logger.error(f"❌ 修改失敗: {modify_result['message']}")
                
        else:
            logger.error(f"❌ 初始生成失敗: {initial_result['message']}")