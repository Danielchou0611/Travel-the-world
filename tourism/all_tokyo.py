import requests
import json

def get_regional_attractions(region_q_code, region_name):
    url = 'https://query.wikidata.org/sparql'
    
    # 這裡把 wd:Q17 (日本) 改成變數 region_q_code (例如東京 wd:Q1490)
    # 使用 P131* 代表抓取該行政區及其下轄的所有地區
    query = f"""
    SELECT DISTINCT ?item ?itemLabel ?typeLabel ?coords ?image WHERE {{
      VALUES ?targetType {{ wd:Q570116 wd:Q33506 wd:Q545942 wd:Q260297 wd:Q1359562 wd:Q180537 }}
      
      ?item wdt:P131* wd:{region_q_code}. 
      ?item wdt:P31/wdt:P279* ?targetType.
      ?item wdt:P625 ?coords.
      ?item wdt:P31 ?type.
      
      OPTIONAL {{ ?item wdt:P18 ?image. }}
      
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "zh-tw,zh,ja,en". }}
    }}
    """

    print(f"正在抓取 {region_name} 的資料...")
    try:
        response = requests.get(url, params={'format': 'json', 'query': query}, 
                                headers={'User-Agent': 'MyTravelApp/1.0'}, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        attractions = []
        for result in data['results']['bindings']:
            attractions.append({
                'id': result['item']['value'].split('/')[-1],
                'name': result['itemLabel']['value'],
                'type': result['typeLabel']['value'],
                'coordinates': result['coords']['value'],
                'image': result.get('image', {}).get('value', 'No Image')
            })
        return attractions
    except Exception as e:
        print(f"{region_name} 抓取失敗: {e}")
        return []

# --- 執行抓取東京 ---
# Q1490 是東京都
tokyo_results = get_regional_attractions("Q1490", "Tokyo")

if tokyo_results:
    with open('tokyo_attractions.json', 'w', encoding='utf-8') as f:
        json.dump(tokyo_results, f, ensure_ascii=False, indent=4)
    print(f"成功！抓取到 {len(tokyo_results)} 筆東京景點，存入 'tokyo_attractions.json'")