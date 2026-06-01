import os
import subprocess
import json
import sys

# 取得目前腳本路徑的絕對位置
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
scraper_path = os.path.join(os.path.dirname(BASE_DIR), 'google_maps_scraper_tool', 'google-maps-scraper')

all_prefectures = [
    '北海道', '青森縣', '岩手縣', '宮城縣', '秋田縣', '山形縣', '福島縣', '茨城縣',
    '栃木縣', '群馬縣', '埼玉縣', '千葉縣', '東京都', '神奈川縣', '新潟縣', '富山縣',
    '石川縣', '福井縣', '山梨縣', '長野縣', '岐阜縣', '靜岡縣', '愛知縣', '三重縣',
    '滋賀縣', '京都府', '大阪府', '兵庫縣', '奈良縣', '和歌山縣', '鳥取縣', '島根縣',
    '岡山縣', '廣島縣', '山口縣', '德島縣', '香川縣', '愛媛縣', '高知縣', '福岡縣',
    '佐賀縣', '長崎縣', '熊本縣', '大分縣', '宮崎縣', '鹿兒島縣', '沖繩縣'
]

# 決定要執行的縣市：如果有傳入參數就用參數，否則跑全部
targets = sys.argv[1:] if len(sys.argv) > 1 else all_prefectures

# 過濾掉不在清單中的輸入
targets = [p for p in targets if p in all_prefectures]

if not targets:
    print(f"❌ 找不到指定的縣市。可用的縣市如下：\n{', '.join(all_prefectures)}")
    sys.exit(1)

query_dir = os.path.join(BASE_DIR, 'restaurant', 'prefecture_queries')
output_dir = os.path.join(BASE_DIR, 'restaurant', 'google_maps_data')
log_file = os.path.join(BASE_DIR, 'restaurant', 'scraper.log')

os.makedirs(output_dir, exist_ok=True)

def convert_format(raw_file, final_file):
    """將 Google Maps 原始格式轉為 Tourism 簡潔格式"""
    if not os.path.exists(raw_file):
        return
    
    converted_data = []
    seen_ids = set()
    
    try:
        with open(raw_file, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                try:
                    res = json.loads(line)
                    # 去重
                    pid = res.get('place_id')
                    if pid in seen_ids: continue
                    seen_ids.add(pid)
                    
                    # 轉換格式
                    item = {
                        "id": pid,
                        "name": res.get('title'),
                        "type": res.get('category'),
                        "coordinates": f"Point({res.get('longtitude')} {res.get('latitude')})",
                        "image": res.get('thumbnail', 'No Image')
                    }
                    converted_data.append(item)
                except: continue
        
        with open(final_file, 'w', encoding='utf-8') as f:
            json.dump(converted_data, f, ensure_ascii=False, indent=4)
        return len(converted_data)
    except Exception as e:
        print(f"⚠️ 格式轉換失敗: {e}")
        return 0

if not os.path.exists(scraper_path):
    print(f"❌ 找不到工具：{scraper_path}")
    exit(1)

print("🚀 全日本餐廳大規模發現計畫 (格式統一版)")
print(f"📝 詳細日誌請見: {log_file}")
print("---------------------------------------------")

for pref in targets:
    input_file = os.path.join(query_dir, f"{pref}.txt")
    raw_output = os.path.join(output_dir, f"{pref}_raw.json")
    final_output = os.path.join(output_dir, f"{pref}.json")
    
    if os.path.exists(final_output) and os.path.getsize(final_output) > 100:
        print(f"⏩ 跳過已完成: {pref}")
        continue
        
    print(f"🔥 正在抓取並轉換: {pref} ... ", end="", flush=True)
    
    # 執行爬蟲，將輸出重導向到 log 檔案，減少畫面訊息
    cmd = [scraper_path, "-input", input_file, "-json", "-lang", "ja", "-results", raw_output]
    
    try:
        with open(log_file, 'a') as log:
            subprocess.run(cmd, check=True, stdout=log, stderr=log)
        
        # 抓取完立即轉換格式
        count = convert_format(raw_output, final_output)
        
        # 刪除肥大的原始檔（可選，若想留著可註解掉）
        if os.path.exists(raw_output):
            os.remove(raw_output)
            
        print(f"✅ 完成！(共 {count} 筆)")
        
    except KeyboardInterrupt:
        print("\n🛑 使用者中斷。")
        break
    except Exception as e:
        print(f"❌ 失敗: {e}")

print("\n🎉 任務結束！")
