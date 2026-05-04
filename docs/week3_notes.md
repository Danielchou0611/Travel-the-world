# Week 3 自訂景點搜尋加入行程

## 目前實作

目前「新增自訂景點」先使用本地整理好的 scored CSV，不接 Google Places API。

前端讀取：

```text
frontend/public/data/attractions_scored.csv
```

來源資料由主 pipeline 產生：

```text
data/processed/japan_attractions_scored.csv
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

目前若 scored CSV 沒有 `image_url`，從 catalog 加入的景點會先用景點名稱與地區組成 Unsplash 圖片查詢 URL。

若圖片載入失敗，前端會自動改用固定 fallback 圖，避免 demo 時破圖。

## CSV 同步

若重新跑主 pipeline，需要同步前端 catalog：

```bash
python3 scripts/build_japan_attractions.py --sync-frontend
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
google_name_matched
image_url
has_image
source
```

目前 `japan_with_rating.json` 若缺 `google_rating`，scored catalog 會用暫定預設值計算 demo 分數。

## 之後可調整

- 若後端提供 `/api/places/search/`，可把 `loadAttractionCatalog()` 改成呼叫 API
- 若改接 Google Places，搜尋結果應先轉成與 `AttractionCatalogItem` 相同的 shape
- 目前加入景點的預設停留時間是 75 分鐘，可之後依 `category` 調整
- 正式資料可加入 `image_url` 欄位，讓圖片來源穩定可控
- fallback 圖與圖片來源策略可之後改成專案自有素材或後端回傳
