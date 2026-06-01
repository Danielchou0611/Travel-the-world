import os
import subprocess
import json
import tempfile
import re
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def resolve_scraper_path():
    candidates = [
        os.path.join(os.path.dirname(BASE_DIR), 'google_maps_scraper_tool', 'google-maps-scraper'),
        os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), 'google_maps_scraper_tool', 'google-maps-scraper')
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[-1]

# 嘗試在常見專案層級尋找 scraper
scraper_path = resolve_scraper_path()

prefectures = [
    '北海道', '青森縣', '岩手縣', '宮城縣', '秋田縣', '山形縣', '福島縣', '茨城縣',
    '栃木縣', '群馬縣', '埼玉縣', '千葉縣', '東京都', '神奈川縣', '新潟縣', '富山縣',
    '石川縣', '福井縣', '山梨縣', '長野縣', '岐阜縣', '靜岡縣', '愛知縣', '三重縣',
    '滋賀縣', '京都府', '大阪府', '兵庫縣', '奈良縣', '和歌山縣', '鳥取縣', '島根縣',
    '岡山縣', '廣島縣', '山口縣', '德島縣', '香川縣', '愛媛縣', '高知縣', '福岡縣',
    '佐賀縣', '長崎縣', '熊本縣', '大分縣', '宮崎縣', '鹿兒島縣', '沖繩縣'
]

query_dir = os.path.join(BASE_DIR, 'temple_queries')
v2_dir = os.path.join(BASE_DIR, 'japan_data_v2')
v2_rated_dir = os.path.join(BASE_DIR, 'japan_data_v2_with_rating')
log_file = os.path.join(BASE_DIR, 'temple_scraper.log')

# 目前啟用：擴充版關鍵字庫（含類別詞與常見同義詞）
CATEGORY_KEYWORDS = [
    # 類別主詞
    "博物",
    "文化藝術",
    "景點",
    "遊樂",
    "自然",
    "溫泉",
    "購物",
    "寺社",

    # 博物 / 文化藝術
    "博物館",
    "資料館",
    "記念館",
    "紀念館",
    "美術館",
    "藝廊",
    "畫廊",
    "文化館",
    "藝術館",
    "文化財",
    "史料館",
    "郷土館",
    "博物馆",
    "文化艺术",
    "museum",
    "art museum",
    "gallery",

    # 景點 / 歷史 / 地標
    "觀光景點",
    "觀光名所",
    "打卡景點",
    "地標",
    "名所",
    "史跡",
    "遺跡",
    "古蹟",
    "城",
    "城跡",
    "天守閣",
    "展望台",
    "觀景台",
    "塔",
    "燈塔",
    "橋",
    "神話景點",
    "landmark",
    "viewpoint",
    "observatory",

    # 遊樂
    "遊樂園",
    "主題樂園",
    "動物園",
    "水族館",
    "遊園地",
    "アミューズメント",
    "レジャー",
    "體驗園區",
    "親子景點",
    "amusement park",
    "theme park",

    # 自然
    "自然景點",
    "國立公園",
    "國家公園",
    "公園",
    "庭園",
    "日本庭園",
    "花園",
    "山",
    "高原",
    "森林",
    "步道",
    "登山步道",
    "溪谷",
    "河谷",
    "湖",
    "瀑布",
    "海岸",
    "岬",
    "島",
    "自然景观",
    "nature",
    "national park",

    # 溫泉
    "溫泉",
    "温泉",
    "日歸溫泉",
    "日帰り温泉",
    "湯屋",
    "溫泉街",
    "足湯",
    "露天風呂",
    "銭湯",
    "スーパー銭湯",
    "onsen",
    "hot spring",

    # 購物
    "購物",
    "購物中心",
    "百貨公司",
    "百貨",
    "商場",
    "商城",
    "商店街",
    "市場",
    "朝市",
    "夜市",
    "伴手禮",
    "outlet",
    "mall",
    "shopping street",
    "department store",

    # 寺社 / 宗教
    "寺",
    "寺院",
    "佛寺",
    "神社",
    "神宮",
    "大社",
    "觀音",
    "八幡宮",
    "稻荷神社",
    "稲荷神社",
    "天滿宮",
    "天満宮",
    "御朱印",
    "パワースポット 神社",
    "shrine",
    "temple",

    # 其他你指定的關聯詞
    "大學",
    "大学",
    "校園景點",
    "海水浴場",
    "海灘",
    "沙灘",
    "ビーチ",
    "beach"
]

# 先停用舊查詢來源（保留備用）
USE_LEGACY_QUERY_FILE = False
USE_LEGACY_FAMOUS_BY_PREF = False

# EXTRA_DISCOVERY_KEYWORDS = [
#     "寺",
#     "寺院",
#     "神社",
#     "神宮",
#     "大社",
#     "観音",
#     "八幡宮",
#     "稲荷神社",
#     "天満宮",
#     "パワースポット 神社",
#     "城",
#     "城跡",
#     "庭園",
#     "日本庭園",
#     "博物館",
#     "美術館",
#     "展望台",
#     "タワー 展望台",
#     "温泉",
#     "日帰り温泉",
#     "市場",
#     "朝市",
#     "商店街"
# ]

FAMOUS_BY_PREF = {
    "東京都": ["浅草寺", "明治神宮", "増上寺", "神田明神"],
    "京都府": ["清水寺", "伏見稲荷大社", "鹿苑寺", "銀閣寺", "八坂神社", "東寺"],
    "大阪府": ["住吉大社", "四天王寺", "大阪天満宮"],
    "奈良縣": ["東大寺", "春日大社", "興福寺"],
    "兵庫縣": ["生田神社", "湊川神社", "書寫山圓教寺"],
    "神奈川縣": ["鶴岡八幡宮", "寒川神社"],
    "千葉縣": ["成田山新勝寺", "香取神宮"],
    "埼玉縣": ["氷川神社", "三峯神社"],
    "愛知縣": ["熱田神宮", "豊川稲荷"],
    "福岡縣": ["太宰府天満宮", "筥崎宮"],
    "宮城縣": ["瑞巌寺", "鹽竈神社"],
    "北海道": ["北海道神宮", "成田山札幌別院新栄寺"]
}

def build_queries(pref, input_file):
    queries = []

    if USE_LEGACY_QUERY_FILE and os.path.exists(input_file):
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                q = line.strip()
                if q:
                    queries.append(q)

    for keyword in CATEGORY_KEYWORDS:
        queries.append(f"{pref} {keyword} 日本")

    if USE_LEGACY_FAMOUS_BY_PREF:
        for famous in FAMOUS_BY_PREF.get(pref, []):
            queries.append(f"{pref} {famous} 日本")

    deduped = []
    seen = set()
    for query in queries:
        if query not in seen:
            deduped.append(query)
            seen.add(query)
    return deduped

def get_existing_names(file_path):
    if not os.path.exists(file_path): return set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return {item.get('name') for item in data if item.get('name')}
    except: return set()

def merge_and_save(pref, raw_temp_path):
    v2_path = os.path.join(v2_dir, f"{pref}.json")
    v2_rated_path = os.path.join(v2_rated_dir, f"{pref}.json")
    
    # 載入現有資料
    v2_data = []
    if os.path.exists(v2_path):
        with open(v2_path, 'r', encoding='utf-8') as f: v2_data = json.load(f)
    
    v2_rated_data = []
    if os.path.exists(v2_rated_path):
        with open(v2_rated_path, 'r', encoding='utf-8') as f: v2_rated_data = json.load(f)
        
    existing_v2_names = {item.get('name') for item in v2_data}
    existing_rated_names = {item.get('name') for item in v2_rated_data}
    
    new_v2_count = 0
    new_rated_count = 0
    
    if not os.path.exists(raw_temp_path): return 0, 0

    with open(raw_temp_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            try:
                res = json.loads(line)
                name = res.get('title')
                if not name: continue
                
                # 簡單去重
                if name not in existing_v2_names:
                    v2_data.append({
                        "id": res.get('place_id'),
                        "name": name,
                        "type": res.get('category', '寺廟'),
                        "coordinates": f"Point({res.get('longtitude')} {res.get('latitude')})",
                        "image": res.get('thumbnail', 'No Image')
                    })
                    existing_v2_names.add(name)
                    new_v2_count += 1
                
                if name not in existing_rated_names:
                    v2_rated_data.append({
                        "id": res.get('place_id'),
                        "name": name,
                        "type": res.get('category', '寺廟'),
                        "coordinates": f"Point({res.get('longtitude')} {res.get('latitude')})",
                        "image": res.get('thumbnail', 'No Image'),
                        "google_rating": res.get('review_rating'),
                        "google_review_count": res.get('review_count'),
                        "google_name_matched": name
                    })
                    existing_rated_names.add(name)
                    new_rated_count += 1
            except: continue
    
    # 寫回檔案 (漂亮排版)
    with open(v2_path, 'w', encoding='utf-8') as f:
        json.dump(v2_data, f, ensure_ascii=False, indent=4)
    with open(v2_rated_path, 'w', encoding='utf-8') as f:
        json.dump(v2_rated_data, f, ensure_ascii=False, indent=4)
        
    return new_v2_count, new_rated_count

print("⛩️  日本寺社/觀光類型地毯式補強計畫啟動！")
print("---------------------------------------------")

selected_prefectures = prefectures
if len(sys.argv) > 1:
    selected_prefectures = [p for p in sys.argv[1:] if p in prefectures]
    if not selected_prefectures:
        print("❌ 指定縣市無效，請使用完整名稱，例如：京都府")
        sys.exit(1)

for pref in selected_prefectures:
    input_file = os.path.join(query_dir, f"{pref}.txt")
    queries = build_queries(pref, input_file)
    print(f"🔥 正在抓取並整合: {pref} ({len(queries)} 組查詢) ... ", end="", flush=True)
    
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, encoding='utf-8') as q_tmp:
        q_tmp_path = q_tmp.name
        for query in queries:
            q_tmp.write(query + '\n')

    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as r_tmp:
        tmp_path = r_tmp.name
        
    cmd = [scraper_path, "-input", q_tmp_path, "-json", "-lang", "ja", "-results", tmp_path]
    
    try:
        with open(log_file, 'a') as log:
            subprocess.run(cmd, check=True, stdout=log, stderr=log)
        
        v2_new, rated_new = merge_and_save(pref, tmp_path)
        if os.path.exists(q_tmp_path): os.remove(q_tmp_path)
        if os.path.exists(tmp_path): os.remove(tmp_path)
        print(f"✅ 完成！(新增 {v2_new} 筆景點 / {rated_new} 筆評分資料)")
        
    except KeyboardInterrupt:
        if os.path.exists(q_tmp_path): os.remove(q_tmp_path)
        if os.path.exists(tmp_path): os.remove(tmp_path)
        print("\n🛑 使用者中斷。"); break
    except Exception as e:
        if os.path.exists(q_tmp_path): os.remove(q_tmp_path)
        if os.path.exists(tmp_path): os.remove(tmp_path)
        print(f"❌ 失敗: {e}")

print("\n🎉 補強任務結束！您的旅遊資料庫現在更完整了。")
