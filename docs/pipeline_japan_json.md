# Japan JSON Pipeline

## 目標

把單一檔案的 `data/raw/japan_with_rating.json` 轉成前端可直接使用的 scored catalog。

## 流程

1. 讀入 `data/raw/japan_with_rating.json`
2. 轉成 normalized CSV
3. 若 JSON 缺少 `prefecture/category/coordinates`，依 `source_id` 用 `data/reference/source_id_metadata_lookup.csv` 回填
4. 計算 `xai_score`
5. 輸出 scored CSV
6. 視需要同步到 `frontend/public/data/attractions_scored.csv`

## 指令

```bash
python3 scripts/build_japan_attractions.py --sync-frontend
```

## 輸出

- `data/processed/japan_attractions_normalized.csv`
- `data/processed/japan_attractions_scored.csv`
- `reports/japan_attractions_pipeline_report.json`
- `frontend/public/data/attractions_scored.csv` (`--sync-frontend` 時)
- `data/reference/source_id_metadata_lookup.csv` 作為 prefecture/category/coordinate fallback

## 欄位說明

normalized CSV 會保留：

- `source_id`
- `name`
- `prefecture`
- `category`
- `lat`
- `lng`
- `google_rating`
- `google_star`
- `google_review_count`
- `google_name_matched`
- `image_url`
- `has_image`
- `source`

scored CSV 會額外產生：

- `region`
- `review_count`
- `interest_tags`
- `station_anchor`
- `distance_to_station_km`
- `interest_match`
- `rating_norm`
- `review_norm`
- `station_distance_efficiency`
- `xai_score`

## 備註

- 目前 `prefecture` 是算分必要欄位，因為要對應 `station_anchor`
- 若輸入 JSON 之後直接附上 `prefecture`、`lat`、`lng`，pipeline 會優先使用 JSON 自身欄位，不依賴 lookup CSV
