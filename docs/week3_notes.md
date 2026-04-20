# Week 3 自訂景點搜尋加入行程

## 目前實作

目前「新增自訂景點」先使用本地整理好的 scored CSV，不接 Google Places API。

前端讀取：

```text
frontend/public/data/attractions_scored.csv
```

來源資料由 pipeline 產生：

```text
data/processed/attractions_scored.csv
```

## 使用方式

1. 在「新增自訂景點」輸入框輸入景點名稱、地區、類別、車站或 tag。
2. 前端會搜尋 scored CSV 中的資料。
3. 點選「加入」後，景點會 append 到目前行程最後。
4. 行程會重新計算：
   - `order`
   - `startTime`
   - `endTime`
   - `travelTimeFromPreviousMin`
   - `finalScore`
5. 前端會呼叫目前的 mock PATCH flow，把更新後的行程 payload 印到 browser console。

## 圖片處理

目前 scored CSV 沒有圖片欄位，因此從 catalog 加入的景點會先用景點名稱與地區組成 Unsplash 圖片查詢 URL。

若圖片載入失敗，前端會自動改用固定 fallback 圖，避免 demo 時破圖。

## CSV 同步

若重新跑 scoring pipeline，需要同步前端 catalog：

```bash
python3 scripts/score_attractions.py
cp data/processed/attractions_scored.csv frontend/public/data/attractions_scored.csv
```

若要使用 `Travel-the-world-Daniel` 的完整資料，使用可重複執行的轉檔程式：

```bash
python3 scripts/convert_daniel_attractions.py
```

輸出：

- `data/processed/daniel_attractions_normalized.csv`
- `data/processed/daniel_attractions_scored.csv`
- `reports/daniel_conversion_report.json`

若要直接改成前端搜尋 catalog：

```bash
python3 scripts/convert_daniel_attractions.py --sync-frontend
```

這會把 `data/processed/daniel_attractions_scored.csv` 複製到：

```text
frontend/public/data/attractions_scored.csv
```

normalized 欄位保留 Google 欄位：

```text
source_id
name
prefecture
category
lat
lng
google_rating
google_star
google_review_count
image_url
has_image
source
```

目前 Daniel 原始資料沒有 Google rating/star/review count，因此欄位會留空；scored catalog 會用暫定預設值計算 demo 分數。

## 之後可調整

- 若後端提供 `/api/places/search/`，可把 `loadAttractionCatalog()` 改成呼叫 API
- 若改接 Google Places，搜尋結果應先轉成與 `AttractionCatalogItem` 相同的 shape
- 目前加入景點的預設停留時間是 75 分鐘，可之後依 `category` 調整
- 正式資料可加入 `image_url` 欄位，讓圖片來源穩定可控
- fallback 圖與圖片來源策略可之後改成專案自有素材或後端回傳
