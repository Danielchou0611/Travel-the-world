import json
import subprocess
import os
import time
import re
import argparse

def parse_point(point_str):
    if not point_str or not isinstance(point_str, str):
        return None, None
    match = re.search(r'Point\(([-\d.]+) ([-\d.]+)\)', point_str)
    if match:
        return float(match.group(2)), float(match.group(1))
    return None, None

def calculate_distance(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 999
    # 簡單歐幾里得距離，約略值
    return ((lat1 - lat2)**2 + (lon1 - lon2)**2)**0.5

def safe_save(data, file_path):
    temp_file = file_path + ".tmp"
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    os.replace(temp_file, file_path)

def get_prefecture_map():
    """從 japan_data 目錄建立 ID -> 縣市名稱 的對照表"""
    pref_map = {}
    data_dir = 'japan_data'
    if not os.path.exists(data_dir):
        return pref_map
    
    for filename in os.listdir(data_dir):
        if filename.endswith('.json'):
            pref_name = filename.replace('.json', '')
            path = os.path.join(data_dir, filename)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    items = json.load(f)
                    for item in items:
                        if 'id' in item:
                            pref_map[item['id']] = pref_name
            except:
                continue
    return pref_map

def is_name_match(name1, name2):
    """檢查名字是否匹配，考慮翻譯與簡繁體"""
    if not name1 or not name2: return False
    # 1. 完全包含
    if name1 in name2 or name2 in name1: return True
    # 2. 移除常見後綴再比對
    s1 = re.sub(r'(博物館|美術館|記念館|紀念館|資料館|神社|寺)$', '', name1)
    s2 = re.sub(r'(博物館|美術館|記念館|紀念館|資料館|神社|寺)$', '', name2)
    if len(s1) > 1 and (s1 in s2 or s2 in s1): return True
    return False

def scrape_ratings(input_file, output_file, chunk_size=20, repair_mode=False):
    with open(input_file, 'r', encoding='utf-8') as f:
        all_data = json.load(f)
    
    # 建立 ID 索引以便快速更新
    all_data_dict = {item['id']: item for item in all_data}
    
    final_results_dict = {}
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if content:
                try:
                    current_data = json.loads(content)
                    final_results_dict = {item['id']: item for item in current_data}
                    print(f"✅ 成功讀取進度。目前總數: {len(final_results_dict)}")
                except:
                    print("❌ 警告：結果檔格式損壞！")
                    return

    # 建立縣市對照表
    print("🔍 正在建立縣市對照表...")
    pref_map = get_prefecture_map()

    # 決定哪些需要處理
    to_process_ids = []
    if repair_mode:
        for item_id, item in final_results_dict.items():
            name = item.get('name', '')
            matched = item.get('google_name_matched', '')
            # 需要修復的情況：NOT_FOUND 或者 名字完全不匹配
            if matched == "NOT_FOUND" or not is_name_match(name, matched):
                to_process_ids.append(item_id)
        print(f"🔧 修復模式：預計重抓 {len(to_process_ids)} 筆不匹配或遺失的資料。")
    else:
        # 一般模式：抓取尚未出現在結果檔中的 ID
        processed_ids = set(final_results_dict.keys())
        to_process_ids = [item['id'] for item in all_data if item['id'] not in processed_ids]
        print(f"🚀 一般模式：預計抓取 {len(to_process_ids)} 筆新資料。")

    if not to_process_ids:
        print("🎉 沒有需要處理的資料！")
        return

    scraper_path = os.path.abspath('../google_maps_scraper_tool/google-maps-scraper')
    
    for i in range(0, len(to_process_ids), chunk_size):
        batch_ids = to_process_ids[i : i + chunk_size]
        batch_items = [all_data_dict[id] for id in batch_ids]
        
        # 優化搜尋詞：加入縣市名稱
        queries = []
        for item in batch_items:
            pref = pref_map.get(item['id'], '')
            queries.append(f"{pref} {item['name']}".strip())
        
        print(f"\n📦 批次 {i//chunk_size + 1} ({i}/{len(to_process_ids)})...")
        
        query_file = 'temp_queries_active.txt'
        with open(query_file, 'w', encoding='utf-8') as f:
            for q in queries: f.write(q + '\n')
        
        results_file = 'temp_batch_results.json'
        cmd = [scraper_path, '-input', query_file, '-json', '-lang', 'ja', '-results', results_file]
        
        try:
            # 執行爬蟲
            subprocess.run(cmd, check=True, capture_output=True)
            
            # 讀取結果
            batch_google_results = []
            if os.path.exists(results_file):
                with open(results_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.strip():
                            try:
                                res_obj = json.loads(line)
                                if res_obj: batch_google_results.append(res_obj)
                            except: continue

            # 匹配邏輯
            for item in batch_items:
                orig_lat, orig_lon = parse_point(item.get('coordinates'))
                best_match = None
                min_dist = 999
                
                # 在這批回傳的結果中找最適合的
                for res in batch_google_results:
                    res_lat, res_lon = res.get('latitude'), res.get('longtitude')
                    res_title = res.get('title', '')
                    dist = calculate_distance(orig_lat, orig_lon, res_lat, res_lon)
                    
                    # 優先判定：名字有匹配 且 距離在合理範圍 (2km)
                    if is_name_match(item['name'], res_title) and dist < 0.02:
                        if dist < min_dist:
                            min_dist = dist
                            best_match = res
                    
                    # 次要判定：如果名字沒直接匹配，但座標極近 (300公尺)，也可能是翻譯問題
                    elif dist < 0.003:
                        if dist < min_dist:
                            min_dist = dist
                            best_match = res
                
                if best_match:
                    new_rating = best_match.get('review_rating')
                    new_matched_name = best_match.get('title')
                else:
                    new_rating = None
                    new_matched_name = "NOT_FOUND"

                # 如果是修復模式，印出變更
                if repair_mode:
                    old_matched = final_results_dict[item['id']].get('google_name_matched', 'NONE')
                    if old_matched != new_matched_name:
                        print(f"🔄 修改 [{item['name']}]:")
                        print(f"   舊: {old_matched}")
                        print(f"   新: {new_matched_name} (評分: {new_rating})")
                    else:
                        print(f"✅ 確認 [{item['name']}]: 匹配不變 ({new_matched_name})")

                item['google_rating'] = new_rating
                item['google_review_count'] = best_match.get('review_count') if best_match else 0
                item['google_name_matched'] = new_matched_name
                
                # 更新結果字典
                final_results_dict[item['id']] = item
            
            # 存檔
            output_list = list(final_results_dict.values())
            safe_save(output_list, output_file)
            print(f"💾 進度已儲存。總數: {len(output_list)}")
            
            if os.path.exists(query_file): os.remove(query_file)
            if os.path.exists(results_file): os.remove(results_file)
            time.sleep(1)
            
        except Exception as e:
            print(f"⚠️ 發生錯誤: {e}")
            break

    print("\n🏁 任務完成。")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--repair', action='store_true', help='啟動修復模式，重新抓取不匹配的資料')
    parser.add_argument('--chunk', type=int, default=20, help='批次大小')
    args = parser.parse_args()

    scrape_ratings('日本全.json', '日本全_with_ratings.json', chunk_size=args.chunk, repair_mode=args.repair)
