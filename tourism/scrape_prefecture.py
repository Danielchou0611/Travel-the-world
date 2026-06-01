import json
import subprocess
import os
import time
import re
import sys

def parse_point(point_str):
    if not point_str or not isinstance(point_str, str): return None, None
    match = re.search(r'Point\(([-\d.]+) ([-\d.]+)\)', point_str)
    if match: return float(match.group(2)), float(match.group(1))
    return None, None

def calculate_distance(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2): return 999
    return ((lat1 - lat2)**2 + (lon1 - lon2)**2)**0.5

def is_name_match(name1, name2):
    if not name1 or not name2: return False
    if name1 in name2 or name2 in name1: return True
    suffixes = r'(博物館|美術館|記念館|紀念館|資料館|神社|寺|公園|瀑布|瀑|山|湖|岬|燈塔|城|遺跡|史跡)$'
    s1 = re.sub(suffixes, '', name1)
    s2 = re.sub(suffixes, '', name2)
    return len(s1) > 1 and (s1 in s2 or s2 in s1)

def scrape_by_pref(pref_name, chunk_size=20):
    input_file = f'japan_data_master/{pref_name}.json'
    output_file = f'japan_data_master_rated/{pref_name}.json'
    
    if not os.path.exists(input_file):
        print(f"❌ 找不到該縣市的輸入檔: {input_file}")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        all_data = json.load(f)
    
    rated_data_dict = {}
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            current_rated = json.load(f)
            rated_data_dict = {item['id']: item for item in current_rated}

    remaining_items = [item for item in all_data if item['id'] not in rated_data_dict]
    
    if not remaining_items:
        print(f"🎉 {pref_name} 已全部抓取完畢！")
        return

    print(f"🚀 開始抓取 {pref_name}，剩餘 {len(remaining_items)} / {len(all_data)}")
    scraper_path = os.path.abspath('../google_maps_scraper_tool/google-maps-scraper')

    for i in range(0, len(remaining_items), chunk_size):
        chunk = remaining_items[i : i + chunk_size]
        queries = [f"{pref_name} {item['name']}" for item in chunk]
        
        q_file = f'temp_{pref_name}_queries.txt'
        r_file = f'temp_{pref_name}_results.json'
        
        with open(q_file, 'w', encoding='utf-8') as f:
            for q in queries: f.write(q + '\n')
            
        try:
            subprocess.run([scraper_path, '-input', q_file, '-json', '-lang', 'ja', '-results', r_file], check=True, capture_output=True)
            
            batch_google = []
            if os.path.exists(r_file):
                with open(r_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        try: batch_google.append(json.loads(line))
                        except: continue

            for item in chunk:
                orig_lat, orig_lon = parse_point(item.get('coordinates'))
                best_match = None
                min_dist = 999
                
                for res in batch_google:
                    res_lat, res_lon = res.get('latitude'), res.get('longtitude')
                    dist = calculate_distance(orig_lat, orig_lon, res_lat, res_lon)
                    if (is_name_match(item['name'], res.get('title', '')) and dist < 0.05) or dist < 0.005:
                        if dist < min_dist:
                            min_dist = dist
                            best_match = res
                
                if best_match:
                    item['google_rating'] = best_match.get('review_rating')
                    item['google_review_count'] = best_match.get('review_count')
                    item['google_name_matched'] = best_match.get('title')
                else:
                    item['google_rating'] = None
                    item['google_review_count'] = 0
                    item['google_name_matched'] = "NOT_FOUND"
                
                rated_data_dict[item['id']] = item

            # 儲存該縣市進度
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(list(rated_data_dict.values()), f, ensure_ascii=False, indent=4)
            
            print(f"💾 {pref_name} 已儲存 {len(rated_data_dict)} 筆。")
            if os.path.exists(q_file): os.remove(q_file)
            if os.path.exists(r_file): os.remove(r_file)
            
        except Exception as e:
            print(f"⚠️ {pref_name} 發生錯誤: {e}")
            break

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方式: python3 scrape_prefecture.py [縣市名稱]")
    else:
        scrape_by_pref(sys.argv[1])
