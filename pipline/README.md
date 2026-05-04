# pipline

獨立版的日本景點資料轉換工具。

## 用法

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
python3 build_japan_attractions.py ../data/raw/japan_with_rating.json ./output
```

會產生：

- `output/japan_with_rating_normalized.csv`
- `output/japan_with_rating_scored.csv`
- `output/japan_with_rating_pipeline_report.json`

## 參數

- `input_json`: 原始 JSON 路徑
- `output_dir`: 輸出資料夾
- `--prefecture-lookup`: 自訂 lookup CSV；預設使用 `pipline/reference/source_id_metadata_lookup.csv`
- `--output-prefix`: 自訂輸出檔名前綴

## JSON 欄位

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
