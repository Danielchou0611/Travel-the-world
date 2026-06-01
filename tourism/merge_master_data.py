import json
import os

def merge_master_data():
    input_dir = 'japan_data_master'
    output_file = '日本全_v2.json'
    
    if not os.path.exists(input_dir):
        print(f"❌ 找不到目錄: {input_dir}")
        return

    all_attractions = []
    json_files = [f for f in os.listdir(input_dir) if f.endswith('.json')]
    json_files.sort()

    print(f"📂 開始從 {input_dir} 合併究極版資料...")

    for filename in json_files:
        file_path = os.path.join(input_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            all_attractions.extend(data)
    
    # 寫入檔案
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_attractions, f, ensure_ascii=False, indent=4)
    
    print(f"\n🎉 合併完成！總計景點數: {len(all_attractions)} 筆")
    print(f"💾 輸出檔案: {output_file}")

if __name__ == "__main__":
    merge_master_data()
