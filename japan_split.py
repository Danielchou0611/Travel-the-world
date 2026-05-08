import requests
import json
import time
import os

def get_japan_all_prefectures():
    # 修正後的 47 個都道府縣 Q 碼 (都道府縣層級，而非島嶼或歷史實體)
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
        'User-Agent': 'JapanTravelDataFixer/2.1 (contact: your_email@example.com)',
        'Accept': 'application/sparql-results+json'
    }

    output_dir = 'japan_data'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for name, q_code in prefectures:
        file_path = os.path.join(output_dir, f"{name}.json")
        
        # 斷點續傳：檔案如果存在且大於 100 內容（代表不是空的），就跳過
        if os.path.exists(file_path) and os.path.getsize(file_path) > 100:
            print(f"⏩ 跳過已完成的: {name}")
            continue

        print(f"🚀 正在抓取: {name} ({q_code})...", end="", flush=True)
        
        # 景點類型：景點、博物館、神社、寺廟、古蹟、公園
        query = f"""
        SELECT DISTINCT ?item ?itemLabel ?typeLabel ?coords ?image WHERE {{
          VALUES ?targetType {{ wd:Q570116 wd:Q33506 wd:Q545942 wd:Q260297 wd:Q1359562 wd:Q180537 }}
          ?item wdt:P131* wd:{q_code}. 
          ?item wdt:P31/wdt:P279* ?targetType.
          ?item wdt:P625 ?coords.
          ?item wdt:P31 ?type.
          OPTIONAL {{ ?item wdt:P18 ?image. }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "zh-tw,zh,ja,en". }}
        }}
        """
        
        try:
            response = requests.get(url, params={'format': 'json', 'query': query}, headers=headers, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                results = data['results']['bindings']
                
                attractions = []
                for res in results:
                    attractions.append({
                        'id': res['item']['value'].split('/')[-1],
                        'name': res['itemLabel']['value'],
                        'type': res['typeLabel']['value'],
                        'coordinates': res['coords']['value'],
                        'image': res.get('image', {}).get('value', 'No Image')
                    })
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(attractions, f, ensure_ascii=False, indent=4)
                
                print(f" ✅ 成功 (共 {len(attractions)} 筆)")
            else:
                print(f" ❌ 失敗 (HTTP {response.status_code})")
            
            # 避免被 Ban
            time.sleep(3) 
            
        except Exception as e:
            print(f" ⚠️ 錯誤: {e}")
            time.sleep(5)

    print("\n🎉 全日本資料抓取任務結束！")

if __name__ == "__main__":
    get_japan_all_prefectures()
