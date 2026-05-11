# pipline

獨立版的日本景點資料轉換工具。

目前有 4 個主要腳本：

- `build_japan_attractions.py`
  把原始景點 JSON 整理成標準化 CSV 與評分後 CSV，並保留原始景點 ID
- `csv_to_json.py`
  把 CSV 直接轉成 JSON
- `simplify_interest_json.py`
  把 scored CSV 轉成較適合推薦或 interest 使用的 JSON
- `run_pipeline.py`
  一次跑完整的推薦資料流程，預設輸出 `interest.json`

## 1. build_japan_attractions.py

用途：

- 讀取原始景點 JSON
- 整理欄位格式
- 補 prefecture / category / lat / lng
- 產生標準化資料與評分後資料

用法：

```bash
cd pipline
python3 build_japan_attractions.py /path/to/input.json /path/to/output-dir
```

輸出檔名預設會用 input 檔名 stem：

- `<stem>_normalized.csv`
- `<stem>_scored.csv`
- `<stem>_pipeline_report.json`

例如：

```bash
cd pipline
python3 build_japan_attractions.py ../raw-data/japan_with_rating.json ./output
```

會產生：

- `output/japan_with_rating_normalized.csv`
- `output/japan_with_rating_scored.csv`
- `output/japan_with_rating_pipeline_report.json`

參數：

- `input_json`: 原始 JSON 路徑
- `output_dir`: 輸出資料夾
- `--prefecture-lookup`: 自訂 lookup CSV；預設使用 `pipline/reference/source_id_metadata_lookup.csv`
- `--output-prefix`: 自訂輸出檔名前綴

支援的原始 JSON 欄位：

腳本目前支援這些常見欄位名稱：

- `id` 或 `source_id`
- `name`
- `type` 或 `category`
- `coordinates`，格式如 `Point(136.489825 35.012782)`
- `lat` / `lng`
- `google_rating`
- `google_review_count`
- `google_name_matched`
- `image` 或 `image_url`

如果 JSON 沒有 `prefecture`、`category`、`lat`、`lng`，會優先用 `source_id` 去 lookup CSV 回填。

## 2. csv_to_json.py

用途：

- 把 CSV 檔直接轉成 JSON array
- 會做基本型別轉換
- 空字串會轉成 `null`
- 數字會轉成 `int` 或 `float`

預設用法：

```bash
cd pipline
python3 csv_to_json.py
```

預設會讀：

- `output/japan_with_rating_scored.csv`

預設會輸出：

- `output/japan_with_rating_scored.json`

自訂輸入輸出：

```bash
cd pipline
python3 csv_to_json.py input.csv output.json
```

可選參數：

- `--indent 2`: pretty print JSON，預設是 2
- `--indent 0`: 輸出壓縮版 JSON

## 3. simplify_interest_json.py

用途：

- 讀取 `japan_with_rating_scored.csv`
- 移除 `source_id`
- 移除 `interest_tags`
- 保留較乾淨的主分類 `category`
- 額外產生推薦可用的 `interests` 陣列標籤

預設用法：

```bash
cd pipline
python3 simplify_interest_json.py
```

預設會讀：

- `output/japan_with_rating_scored.csv`

預設會輸出：

- `output/japan_with_rating_interest.json`

自訂輸入輸出：

```bash
cd pipline
python3 simplify_interest_json.py input.csv output.json
```

可選參數：

- `--indent 2`: pretty print JSON，預設是 2
- `--indent 0`: 輸出壓縮版 JSON

## 4. run_pipeline.py

用途：

- 一次執行 `build_japan_attractions.py`
- 接著執行 `simplify_interest_json.py`
- 直接產出推薦用的 `interest.json`

預設用法：

```bash
cd pipline
python3 run_pipeline.py ../raw-data/japan_with_rating.json
```

預設會輸出：

- `output/japan_with_rating_normalized.csv`
- `output/japan_with_rating_scored.csv`
- `output/japan_with_rating_pipeline_report.json`
- `output/japan_with_rating_interest.json`

自訂輸入輸出：

```bash
cd pipline
python3 run_pipeline.py input.json ./output --output-prefix my_data
```

可選參數：

- `--prefecture-lookup /path/to/lookup.csv`
- `--output-prefix my_data`
- `--indent 2`

說明：

- 如果你的最終目標是 `japan_with_rating_interest.json`，通常不需要跑 `csv_to_json.py`
- `csv_to_json.py` 只在你另外需要 `scored.json` 給其他 consumer 時才需要

### simplify_interest_json.py 輸出欄位

- `id`: 原始景點 ID（直接沿用輸入 JSON 的 `id` / `source_id`）
- `name`: 景點名稱
- `region`: 地區
- `category`: 主分類
- `interests`: interest 標籤陣列
- `google_rating`: Google 評分
- `review_count`: Google 評論數
- `station_anchor`: 對應車站
- `distance_to_station_km`: 與車站距離
- `interest_match`: 原始 interest match 分數
- `rating_norm`: 評分正規化分數
- `review_norm`: 評論數正規化分數
- `station_distance_efficiency`: 車站距離效率分數
- `xai_score`: 綜合排序分數
- `image_url`: 圖片網址
- `lat`: 緯度
- `lng`: 經度
- `google_name_matched`: 對應到的 Google 名稱

### category 目前的主分類

- `博物館`
- `文化藝術`
- `景點`
- `遊樂`
- `自然`
- `溫泉`
- `購物`
- `寺社`

### interests 目前可能出現的標籤

- `歷史`
- `藝術`
- `科學`
- `自然`
- `宗教`
- `購物`
- `親子`
- `室內`
- `戶外`
- `打卡`

## 建議流程

如果你要從原始 JSON 一路做到推薦用 JSON，建議直接跑：

```bash
cd pipline
python3 run_pipeline.py ../raw-data/japan_with_rating.json
```

通常會得到這幾份結果：

- `output/japan_with_rating_normalized.csv`
- `output/japan_with_rating_scored.csv`
- `output/japan_with_rating_interest.json`

如果你另外需要 `scored.json`，再補跑：

```bash
cd pipline
python3 csv_to_json.py
```

```bash
cd ../demo-web
cp ../pipline/output/japan_with_rating_interest.json .
```
