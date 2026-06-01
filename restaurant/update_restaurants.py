import os
import subprocess
import json
import tempfile
import sys

# 取得目前腳本路徑的絕對位置
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # /mnt/c/Travel_Japan_Web/wikidata/restaurant
# 修正路徑邏輯：回到 wikidata 的上一層 (Travel_Japan_Web)，然後進入 google_maps_scraper_tool
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
scraper_path = os.path.join(PROJECT_ROOT, 'google_maps_scraper_tool', 'google-maps-scraper')

output_dir = os.path.join(BASE_DIR, 'japan_data_v1_with_rating')
log_file = os.path.join(BASE_DIR, 'scraper_update.log')
progress_file = os.path.join(BASE_DIR, 'keyword_progress.json')

# 確保輸出目錄存在
os.makedirs(output_dir, exist_ok=True)

# 核心餐廳關鍵字（舊關鍵字 + 新關鍵字）
LEGACY_KEYWORDS = [
    # --- 舊有的 (恢復啟用) ---
    "餐廳", "居酒屋", "咖啡廳", "家庭餐廳", "自助餐",
    "拉麵", "烏龍麵", "蕎麥麵",
    "壽司", "燒肉", "懷石料理", "鰻魚", "炸豬排",
    "天婦羅", "燒鳥", "御好燒",
    "咖哩", "義大利料理", "法國料理", "中華料理",
    "甜點", "小吃", "便當",

    # --- 本次新增的 (補強類別) ---
    # 日式細分
    "沾麵", "雜燴麵", "鐵板燒", "螃蟹料理", "河豚料理", "鄉土料理",
    "丼飯", "壽喜燒", "鍋料理", "串炸", "餃子",
    
    # 異國與輕食
    "漢堡", "早餐", "麵包店", "三明治",
    
    # 甜點與飲品
    "蛋糕店", "可麗餅", "冰淇淋", "酒吧", "立飲", "爵士酒吧",

    # 你指定的缺口補強
    "喫茶店", "食堂", "割烹", "料亭", "小料理",
    "韓國料理", "泰國料理", "越南料理", "西班牙料理", "地中海料理",
    "ビストロ", "バル", "牛たん", "ホルモン", "もつ鍋", "精進料理",

    # 進一步補強（高命中常見分類）
    "焼き鳥", "うなぎ", "とんかつ", "しゃぶしゃぶ", "すき焼き", "おでん",
    "海鮮料理", "寿司", "炉端焼き", "焼肉ホルモン", "天ぷら", "串カツ",
    "定食", "和食", "洋食", "ビアホール", "ワインバー", "カクテルバー",
    "ベーカリー", "パン屋", "カフェバー", "タパス", "ピザ", "パスタ",

]

NEW_KEYWORDS = [
    # 你剛補充的熱門缺口
    "カレーライス", "スープカレー", "スパイスカレー", "町中華",
    "海鮮丼", "立ち飲み", "食べ放題", "バイキング",

    # 日式細分
    "割烹料理店", "小料理屋", "割烹", "料亭", "割烹居酒屋", "創作和食",
    "釜飯店", "親子丼店", "海鮮丼店", "豬排丼", "牛かつ", "もんじゃ焼き",
    "炉端焼き", "炭火焼き", "地鶏料理", "鶏白湯ラーメン", "煮干しラーメン",
    "家系ラーメン", "二郎系ラーメン", "つけ麺", "担々麺", "油そば", "まぜそば",
    "精進料理", "京料理", "沖縄料理", "郷土料理", "おばんざい", "立ち食いそば",

    # 異國/少數菜系
    "ペルー料理", "ブラジル料理", "メキシコ料理", "中東料理", "トルコ料理",
    "モロッコ料理", "ロシア料理", "ポルトガル料理", "ギリシャ料理", "北欧料理",
    "アフリカ料理", "ネパール料理", "スリランカ料理", "パキスタン料理",
    "バングラデシュ料理", "インドネシア料理", "マレーシア料理", "フィリピン料理",

    # 飲品/夜生活
    "日本酒バー", "地酒バー", "焼酎バー", "クラフトビール", "ビアバー",
    "ワインビストロ", "オイスターバー", "スタンディングバー", "スナックバー", "角打ち",

    # 甜點/輕食
    "和菓子店", "どら焼き", "たい焼き", "みたらし団子", "抹茶スイーツ",
    "フルーツサンド", "パフェ専門店", "プリン専門店", "チーズケーキ専門店",
    "パンケーキカフェ", "ベーグル店", "サンドイッチ専門店"
]

CATEGORY_KEYWORDS = LEGACY_KEYWORDS + NEW_KEYWORDS


all_prefectures = [
    '北海道', '青森縣', '岩手縣', '宮城縣', '秋田縣', '山形縣', '福島縣', '茨城縣',
    '栃木縣', '群馬縣', '埼玉縣', '千葉縣', '東京都', '神奈川縣', '新潟縣', '富山縣',
    '石川縣', '福井縣', '山梨縣', '長野縣', '岐阜縣', '靜岡縣', '愛知縣', '三重縣',
    '滋賀縣', '京都府', '大阪府', '兵庫縣', '奈良縣', '和歌山縣', '鳥取縣', '島根縣',
    '岡山縣', '廣島縣', '山口縣', '德島縣', '香川縣', '愛媛縣', '高知縣', '福岡縣',
    '佐賀縣', '長崎縣', '熊本縣', '大分縣', '宮崎縣', '鹿兒島縣', '沖繩縣'
]

def merge_and_save(pref, raw_temp_path):
    """將新抓到的資料合併到現有的 JSON 中，並進行去重"""
    final_path = os.path.join(output_dir, f"{pref}.json")
    
    # 1. 載入現有資料 (去重用)
    existing_data = []
    seen_ids = set()
    if os.path.exists(final_path):
        try:
            with open(final_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                seen_ids = {item.get('id') for item in existing_data if item.get('id')}
        except Exception as e:
            print(f"⚠️ 無法讀取舊檔案 {pref}.json: {e}")

    new_count = 0
    # 2. 解析新抓到的資料 (raw json lines 格式)
    if not os.path.exists(raw_temp_path):
        return 0
    
    try:
        with open(raw_temp_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                try:
                    res = json.loads(line)
                    pid = res.get('place_id')
                    if pid and pid not in seen_ids:
                        existing_data.append({
                            "id": pid,
                            "name": res.get('title'),
                            "type": res.get('category'),
                            "coordinates": f"Point({res.get('longtitude')} {res.get('latitude')})",
                            "image": res.get('thumbnail', 'No Image'),
                            "google_rating": res.get('review_rating'),
                            "google_review_count": res.get('review_count', 0),
                            "google_name_matched": res.get('title', 'NOT_FOUND')
                        })
                        seen_ids.add(pid)
                        new_count += 1
                        if new_count % 50 == 0:
                            print(f"\n   ↳ {pref} 已新增 {new_count} 筆...", end="", flush=True)
                except: continue
                
        # 3. 儲存更新後的資料 (漂亮排版)
        with open(final_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=4)
            
        return new_count, len(existing_data)
    except Exception as e:
        print(f"⚠️ 合併失敗: {e}")
        return 0, len(existing_data)

def dedupe_keywords(keywords):
    deduped = []
    seen = set()
    for kw in keywords:
        if kw in seen:
            continue
        seen.add(kw)
        deduped.append(kw)
    return deduped

def load_progress():
    if not os.path.exists(progress_file):
        return {}
    try:
        with open(progress_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
    except Exception as e:
        print(f"⚠️ 讀取進度檔失敗，將重建: {e}")
    return {}

def save_progress(progress):
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)

if not os.path.exists(scraper_path):
    print(f"❌ 找不到工具：{scraper_path}")
    sys.exit(1)

# 決定要執行的縣市：如果有傳入參數就用參數，否則跑全部
targets = sys.argv[1:] if len(sys.argv) > 1 else all_prefectures
targets = [p for p in targets if p in all_prefectures]

if not targets:
    print(f"❌ 指定縣市無效。可用名稱如：東京都, 大阪府")
    sys.exit(1)

print("🚀 餐廳資料補強計畫 (動態生成 + 增量更新)")
print(f"📝 日誌: {log_file}")
print(f"📌 關鍵字進度檔: {progress_file}")
print("---------------------------------------------")

CATEGORY_KEYWORDS = dedupe_keywords(CATEGORY_KEYWORDS)
progress = load_progress()

for pref in targets:
    # 若該縣市已經有輸出檔、但還沒有進度紀錄，預設舊關鍵字都已跑過，
    # 這樣本次只會跑新增關鍵字，避免整批重跑。
    pref_output = os.path.join(output_dir, f"{pref}.json")
    if pref not in progress and os.path.exists(pref_output):
        progress[pref] = sorted(set(LEGACY_KEYWORDS))
        save_progress(progress)

    done_keywords = set(progress.get(pref, []))
    pending_keywords = [kw for kw in CATEGORY_KEYWORDS if kw not in done_keywords]

    if not pending_keywords:
        print(f"⏩ 跳過 {pref}: 所有關鍵字都已抓過")
        continue

    # 動態建構搜尋詞（只跑尚未抓過的關鍵字，避免重複）
    queries = [f"{pref} {kw} 日本" for kw in pending_keywords]
    
    print(f"🔥 正在更新: {pref} ({len(queries)} 組新關鍵字) ... ", end="", flush=True)
    
    # 使用臨時檔案存儲搜尋詞與結果
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, encoding='utf-8') as q_tmp:
        q_tmp_path = q_tmp.name
        for q in queries:
            q_tmp.write(q + '\n')

    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as r_tmp:
        tmp_path = r_tmp.name
        
    cmd = [scraper_path, "-input", q_tmp_path, "-json", "-lang", "ja", "-results", tmp_path]
    
    try:
        with open(log_file, 'a') as log:
            subprocess.run(cmd, check=True, stdout=log, stderr=log)
        
        # 抓取完立即合併
        added, total = merge_and_save(pref, tmp_path)
        progress[pref] = sorted(done_keywords.union(pending_keywords))
        save_progress(progress)
        
        # 清理臨時檔
        if os.path.exists(q_tmp_path): os.remove(q_tmp_path)
        if os.path.exists(tmp_path): os.remove(tmp_path)
        
        print(f"✅ 完成！(新增 {added} 筆餐廳，目前共 {total} 筆)")
        
    except KeyboardInterrupt:
        if os.path.exists(q_tmp_path): os.remove(q_tmp_path)
        if os.path.exists(tmp_path): os.remove(tmp_path)
        print("\n🛑 使用者中斷。")
        break
    except Exception as e:
        if os.path.exists(q_tmp_path): os.remove(q_tmp_path)
        if os.path.exists(tmp_path): os.remove(tmp_path)
        print(f"❌ 失敗: {e}")

print("\n🎉 任務結束！餐廳資料庫已補強。")
