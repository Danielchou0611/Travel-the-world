import requests
import json
import time
import os

def get_japan_master_data():
    prefectures = [
        ("北海道", "Q1037393"), ("青森縣", "Q71699"), ("岩手縣", "Q48326"), ("宮城縣", "Q47896"),
        ("秋田縣", "Q81863"), ("山形縣", "Q125863"), ("福島縣", "Q71707"), ("茨城縣", "Q83273"),
        ("栃木縣", "Q44843"), ("群馬縣", "Q129499"), ("埼玉縣", "Q128186"), ("千葉縣", "Q80011"),
        ("東京都", "Q1490"), ("神奈川縣", "Q127513"), ("新潟縣", "Q132705"), ("富山縣", "Q132929"),
        ("石川縣", "Q131281"), ("福井縣", "Q133879"), ("山梨縣", "Q132720"), ("長野縣", "Q127877"),
        ("岐阜縣", "Q131277"), ("靜岡縣", "Q131320"), ("愛知縣", "Q80434"), ("三重縣", "Q128196"),
        ("滋賀縣", "Q131358"), ("京都府", "Q120730"), ("大阪府", "Q122723"), ("兵庫縣", "Q130290"),
        ("奈良縣", "Q131287"), ("和歌山縣", "Q131314"), ("鳥取縣", "Q133935"), ("島根縣", "Q132751"),
        ("岡山縣", "Q132936"), ("廣島縣", "Q617375"), ("山口縣", "Q127264"), ("德島縣", "Q160734"),
        ("香川縣", "Q161454"), ("愛媛縣", "Q123376"), ("高知縣", "Q134093"), ("福岡縣", "Q123258"),
        ("佐賀縣", "Q160420"), ("長崎縣", "Q169376"), ("熊本縣", "Q130308"), ("大分縣", "Q133924"),
        ("宮崎縣", "Q130300"), ("鹿兒島縣", "Q15701"), ("沖繩縣", "Q766445")
    ]

    url = 'https://query.wikidata.org/sparql'
    headers = {
        'User-Agent': 'JapanTravelMaster/2.0 (contact: your_email@example.com)',
        'Accept': 'application/sparql-results+json'
    }

    # 統一存放路徑
    output_dir = 'japan_data_master'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 45 個類別的「究極 Q 碼清單」
    target_types = [
        # --- 基礎大類 ---
        "wd:Q570116", "wd:Q33506", "wd:Q545942", "wd:Q260297", "wd:Q1359562", 
        "wd:Q180537", "wd:Q1030434", "wd:Q1127022", "wd:Q45595", "wd:Q35509", 
        "wd:Q186915", "wd:Q120526", "wd:Q194138", "wd:Q57410", "wd:Q185202", 
        "wd:Q10712", "wd:Q62049", "wd:Q5461", "wd:Q43501", "wd:Q214041",
        # --- 地標與視覺 ---
        "wd:Q12531", "wd:Q39715", "wd:Q482811", "wd:Q12280", "wd:Q8502",
        "wd:Q233", "wd:Q182034", "wd:Q23442", "wd:Q40391", "wd:Q1151608",
        "wd:Q215284", "wd:Q23413", "wd:Q11696", "wd:Q131645", "wd:Q10708",
        # --- 深度日本與冷門 ---
        "wd:Q1107656", # 日本庭園
        "wd:Q367098",  # 禪宗庭園 / 枯山水
        "wd:Q150329",  # 自然紀念物
        "wd:Q625376",  # 地質公園
        "wd:Q11030",   # 動漫
        "wd:Q1107",    # 漫畫
        "wd:Q1505352", # 錢湯
        "wd:Q151062",  # 威士忌蒸餾所
        "wd:Q170700",  # 傳統工藝
        "wd:Q1133303", # 忍者設施
        "wd:Q557451",  # 重要傳統建造物群保存地區 (傳建)
        "wd:Q1475727", # 商店街 / 拱廊街
        "wd:Q1142510", # 能劇場
        "wd:Q2117565"  # 歌舞伎劇場
    ]
    
    print(f"🚀 啟動 Master 抓取任務，目標資料夾: {output_dir}/")

    for name, q_code in prefectures:
        file_path = os.path.join(output_dir, f"{name}.json")
        
        if os.path.exists(file_path) and os.path.getsize(file_path) > 100:
            print(f"⏩ 跳過已完成的: {name}")
            continue

        print(f"📡 正在合併抓取: {name}...", end="", flush=True)
        
        query = f"""
        SELECT DISTINCT ?item ?itemLabel ?typeLabel ?coords ?image WHERE {{
          VALUES ?targetType {{ {" ".join(target_types)} }}
          ?item wdt:P131* wd:{q_code}. 
          ?item wdt:P31/wdt:P279* ?targetType.
          ?item wdt:P625 ?coords.
          ?item wdt:P31 ?type.
          OPTIONAL {{ ?item wdt:P18 ?image. }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "zh-tw,zh,ja,en". }}
        }}
        """
        
        try:
            response = requests.get(url, params={'format': 'json', 'query': query}, headers=headers, timeout=300)
            
            if response.status_code == 200:
                data = response.json()
                results = data['results']['bindings']
                
                attractions = []
                seen_ids = set() # 核心去重機制
                
                for res in results:
                    item_id = res['item']['value'].split('/')[-1]
                    if item_id in seen_ids:
                        continue
                    
                    seen_ids.add(item_id)
                    attractions.append({
                        'id': item_id,
                        'name': res['itemLabel']['value'],
                        'type': res['typeLabel']['value'],
                        'coordinates': res['coords']['value'],
                        'image': res.get('image', {}).get('value', 'No Image')
                    })
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(attractions, f, ensure_ascii=False, indent=4)
                
                print(f" ✅ ({len(attractions)} 筆唯一資料)")
            else:
                print(f" ❌ (HTTP {response.status_code})")
            
            time.sleep(3) # 保護 API，避免過快被 Ban
            
        except Exception as e:
            print(f" ⚠️ 錯誤: {e}")
            time.sleep(5)

    print("\n🏆 Master 任務完成！所有資料均已去重並分類。")

if __name__ == "__main__":
    get_japan_master_data()
