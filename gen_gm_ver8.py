from google import genai
from google.genai import types
import json
import logging
import time
import requests
import os                     # 新增：匯入 os 模組
from dotenv import load_dotenv # 新增：匯入 dotenv 套件
import uuid
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
logger = logging.getLogger(__name__)
# --- 1. RAG 檢索器 (Retriever) - 【改為呼叫 Django API】 ---
def retrieve_local_knowledge(destination: str, required_count: int, user_prefs: dict) -> str:
    """
    呼叫組員的 Django API 讀取景點資料。若符合的高分景點數量不足，會自動降低星等標準。
    """
    DJANGO_API_URL = "http://127.0.0.1:8000/api/pois/"
    url_mapping = {}
    try:
        # 建立降級策略：從嚴格到寬鬆 (4.2 -> 3.8 -> 3.0 -> 0.0)
        thresholds = [4.2, 3.8, 3.0, 0.0]
        top_places = []
        rest_region = normalize_region_name(destination)
        for min_rating in thresholds:
            params = {
                "region": rest_region,
                "page_size": 50, # 拿多一點來方便 Python 端過濾
                "ordering": "-google_rating" # 讓 Django 幫忙由高到低排序
            }
            
            response = requests.get(DJANGO_API_URL, params=params)
            
            if response.status_code == 200:
                api_data = response.json()
                all_results = api_data.get("results", [])
                
                # 篩選：確保評分達標
                filtered_places = [
                    place for place in all_results 
                    if place.get("google_rating") is not None and place.get("google_rating", 0) >= min_rating
                ]
                
                # 如果找到的數量大於等於我們需要的數量，就停止降級
                if len(filtered_places) >= required_count:
                    top_places = filtered_places[:30] # 最多取前 30 名，避免 Token 爆炸
                    logger.info(f"🔍 API 檢索成功：使用最低星等 {min_rating}，找到 {len(top_places)} 個候選景點")
                    break
                else:
                    top_places = filtered_places[:30] 
            else:
                logger.error(f"呼叫 Django API 失敗: HTTP {response.status_code}")
                return "資料庫連線異常。"

        if not top_places:
            logger.warning(f"⚠️ Django API 完全沒有 {destination} 的資料！")
            return "目前資料庫無該地區的景點資料。"
            
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
        context_lines.append("\n【🍜 官方餐廳與美食候選清單】")
        try:
            # 使用組員新增的 POST 推薦端點
            rest_region = normalize_region_name(destination)
            rest_payload = {
                "region": rest_region,
                "top_k": rest_count
            }
            res_resp = requests.post("http://127.0.0.1:8000/api/restaurants/recommendations/", json=rest_payload)
            
            if res_resp.status_code == 200:
                rests = res_resp.json().get("results", [])
                for r in rests:
                    url_mapping[r['name']] = {
                        "image": r.get('image_url', ''),
                        "id": r.get('id', ''),
                        "lat": r.get('lat', 0.0),            # 👈 新增
                        "lng": r.get('lng', 0.0),            # 👈 新增
                        "rating": r.get('google_rating', 0.0) # 👈 新增
                    }
                    interests_str = ", ".join(r.get("interests", []))
                    line = (f"- {r['name']} ({r.get('category', '美食')}) | "
                            f"地區: {r.get('region', '')} | "
                            f"評分: {r.get('google_rating', '無')} ({r.get('review_count', 0)}則) | "
                            f"標籤: {interests_str} | "
                            f"圖片: {r.get('image_url', '')}")
                    context_lines.append(line)
            else:
                context_lines.append("- (目前無推薦餐廳資料)")
        except Exception as e:
            logger.error(f"抓取餐廳失敗: {e}")
            context_lines.append("- (餐廳 API 連線異常)")
        with open("sql_history.json", "w", encoding="utf-8") as f:
                json.dump(context_lines, f, ensure_ascii=False, indent=2)
        return "\n".join(context_lines), url_mapping
        
    except requests.exceptions.RequestException as e:
        logger.error(f"與 Django API 連線失敗！請確認組員的伺服器有開啟: {e}")
        return ""
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
def modify_itinerary(destination: str, current_itinerary: dict, user_request: str, user_prefs: dict, max_retries: int = 3) -> dict:
    """
    處理使用者從前端聊天室發出的修改請求
    """
    logger.info(f"💬 收到使用者的修改需求: {user_request}")
     
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
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=itinerary_schema,  # 注意新版叫 response_json_schema
                temperature=0.1,
                thinking_config=types.ThinkingConfig(
                    #thinking_level="high"
                    thinking_budget=2048
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
def build_rag_prompt(destination: str, user_prefs: dict, rag_context: str) -> str:
    # 直接從對齊前端格式的字典中取值
    days = user_prefs.get('days', 3)
    budget = user_prefs.get('budget', 30000)
    interests = "、".join(user_prefs.get('interests', []))
    
    # 解析滑桿數值邏輯，轉換成 AI 易懂的指令
    exp_val = user_prefs.get('explorationStyle', 50)
    pace_desc = "非常悠閒，每天安排 2 個點即可" if exp_val < 30 else "步調緊湊，每天安排 4-5 個點" if exp_val > 70 else "步調適中，每天安排 3-4 個點"
    
    food_val = user_prefs.get('foodVsAttractions', 50)
    focus_desc = "強烈偏重當地美食與餐廳體驗" if food_val < 30 else "強烈偏重著名景點與地標觀光" if food_val > 70 else "均衡安排美食與觀光景點"

    must_visit = user_prefs.get('mustVisit', "")
    rag_note = f"並參考使用者提供的攻略內容：{user_prefs.get('ragContent')}" if user_prefs.get('ragContent') else ""

    return f"""
    你是一位嚴謹的旅遊 AI 嚮導。請為使用者規劃 {days} 天的【{destination}】行程。

    【使用者偏好與參數】
    - 興趣標籤：{interests}
    - 預算：NT$ {budget}
    - 旅遊步調：{pace_desc} (數值: {exp_val}/100)
    - 內容偏重：{focus_desc} (數值: {food_val}/100)
    - 必去景點：{must_visit}
    {rag_note}

    【🚨 絕對核心限制：RAG 檢索】
    你 **絕對只能** 從下方提供的【官方景點候選清單】中挑選地點。
    ---
    {rag_context}
    ---

    【任務邏輯規範】
    1. 行程密度：請嚴格遵守「{pace_desc}」的規範安排每日景點數量。
    2. 美食安排：🚨【強制要求】每一天的行程中，務必「至少」安排 1 到 2 間【官方餐廳與美食候選清單】中的店家作為午餐或晚餐！絕不可出現沒有安排任何餐廳的天數。請注意「地理位置合理性」，餐廳應盡量安排在當天景點的附近。
    3. 偏好權重：請根據「{focus_desc}」來篩選景點與餐廳的比例。
    4. 欄位極速輸出規範：為了大幅提升生成速度，"image" 欄位請一律直接填入空字串 ""；；而 "position" 中的 "lat"、"lng" 以及 "rating" 請直接填入數字 0，系統會自動在後續補上真實數值。
    5. "xai" 欄位規範：
       - `summary`: 必須直接提及使用者的興趣（如 {", ".join(user_prefs.get('interests', []))}）與此景點的關聯。
       - `scores`: 請提供 2-3 個評分維度，例如：「興趣符合度」、「交通便利度」、「人氣熱度」。
       - 20字以內
    6. 🚨 【格式絕對限制】：請直接輸出 JSON 內容，絕對不要加上 ```json 的 Markdown 標記，也絕對不要在 JSON 前後加上任何問候語或額外文字！
    7. ⚡ 【速度與長度最佳化】：為了加快你的輸出速度，請將所有景點與餐廳的 `description` (詳細介紹) 嚴格控制在「30字以內」的精華短語！
    8. 🚨 【絕不重複】：行程中的所有景點與餐廳「絕對不可以重複出現」，每一個地點在整趟旅程中只能被安排一次！
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
                                "category": {"type": "string", "enum": ["景點", "美食", "購物", "住宿"]},
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

# --- 4. 服務層：生成、重試與驗證 ---
client = genai.Client(api_key=GEMINI_KEY)
#model = genai.GenerativeModel('gemma-4-31b-it') 
def generate_itinerary(destination: str, user_prefs: dict, max_retries: int = 3) -> dict:
    # 步驟 1：檢索 RAG 知識
    days = user_prefs.get('days', 3)
    required_count = days * 3 
    exp_style = user_prefs.get('explorationStyle', 50)
    
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
    #rag_context = retrieve_local_knowledge(destination)
    if not rag_context or "無該城市" in rag_context:
        return {"status": "error", "message": "資料庫缺乏景點資訊"}
        
    # 步驟 2：構建 Prompt
    prompt = build_rag_prompt(destination, user_prefs, rag_context)
    
    for attempt in range(1, max_retries + 1):
        try:
            # 💡 再次建議：使用 'gemini-1.5-flash' 以獲得最穩定的 JSON 輸出
            response = client.models.generate_content(
            #model="gemma-4-31b-it",
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=itinerary_schema,  # 注意新版叫 response_json_schema
                temperature=0.1,
                thinking_config=types.ThinkingConfig(
                    #thinking_level="high"
                    thinking_budget=2048
                    )
                ,automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                )
                )
            )

            
            # 清洗並解析 JSON
            raw_text = response.text.strip().replace("```json", "").replace("```", "")
            generated_data = json.loads(raw_text)
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
            
            final_trip = {
                "id": f"trip-{uuid.uuid4().hex[:8]}", # 產生唯一 ID
                "preferences": user_prefs,            # 原封不動退回使用者設定
                "summary": {
                    "totalDays": user_prefs.get("days", 0),
                    "totalBudget": f"NT$ {user_prefs.get('budget', 0):,}",
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
    # --- 測試執行與模擬前端流程 ---
    logger.info("=== 階段 1：模擬前端首次請求行程 ===")
    test_prefs = {
        "days": 2,
        "budget": 30000,
        "interests": ["自然", "秘境"],
        "explorationStyle": 80, # 偏向緊湊
        "foodVsAttractions": 70, # 偏向景點
        "mustVisit": "",
        "ragContent": ""
    }
    
    # 移除不存在的 user_id 參數
    initial_result = generate_itinerary(
        destination="京都", 
        user_prefs=test_prefs
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
            destination="京都",
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