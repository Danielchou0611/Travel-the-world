import json
import os

def merge_japan_data():
    input_dir = 'japan_data'
    output_file = 'japan_all_merged.json'
    
    # 檢查輸入目錄是否存在
    if not os.path.exists(input_dir):
        print(f"❌ 找不到目錄: {input_dir}")
        return

    all_attractions = []
    file_count = 0

    print(f"📂 開始從 {input_dir} 合併資料...")

    # 取得資料夾內所有的 .json 檔案
    json_files = [f for f in os.listdir(input_dir) if f.endswith('.json')]
    
    # 排序檔案名稱，確保合併順序穩定
    json_files.sort()

    for filename in json_files:
        file_path = os.path.join(input_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_attractions.extend(data)
                    file_count += 1
                    print(f"  ✅ 已加入: {filename} ({len(data)} 筆)")
                else:
                    print(f"  ⚠️ 跳過 {filename}: 格式不正確 (應為列表)")
        except Exception as e:
            print(f"  ❌ 讀取 {filename} 時出錯: {e}")

    # 將合併後的結果寫入新檔案
    if all_attractions:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_attractions, f, ensure_ascii=False, indent=4)
        
        print(f"\n🎉 合併完成！")
        print(f"------------------------------------")
        print(f"📁 來源檔案數: {file_count} 個")
        print(f"📊 總計景點數: {len(all_attractions)} 筆")
        print(f"💾 輸出檔案: {output_file}")
        print(f"------------------------------------")
        print(f"💡 備註：原本的 {input_dir} 資料夾內容已保留，未做任何修改。")
    else:
        print("😭 沒有找到任何有效的景點資料可供合併。")

if __name__ == "__main__":
    merge_japan_data()
