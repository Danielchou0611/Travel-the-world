# Restaurant Recommendation TODO

先確認規格，再開始實作。

## 目前現況

- 已有 `PointOfInterest` 資料表，可存：
  - `region`
  - `category`
  - `interests`
  - `google_rating`
  - `review_count`
  - `static_score`
  - `lat` / `lng`
- 已有匯入指令：`python manage.py import_pois <json_path>`
- 已有 API：
  - `GET /api/pois/`
  - `GET /api/pois/{poi_id}/`
  - `GET /api/metadata/`
  - `POST /api/recommendations/`
- 既有 `POST /api/recommendations/` 已經支援：
  - `region`
  - `category`
  - `preferences`
  - `top_k`
- 新檔案 `../japan_restaurant_with_rating_interest.json` 規模約 `175,979` 筆，主要欄位為：
  - `id`
  - `name`
  - `region`
  - `category`
  - `venue_type`
  - `interests`
  - `google_rating`
  - `review_count`
  - `static_score`
  - `lat` / `lng`
  - `raw_type`

## 已確認方向

- 景點與餐廳要並存
- 兩者都存同一個 SQL database
- 餐廳使用新資料表，不直接覆蓋既有 `PointOfInterest`
- 餐廳 API 命名改用 `restaurant`
- 餐廳種類以 `category` 為主
- 推薦先不使用 `interests`
- 推薦先只用原本的 `static_score`
- 推薦 / 查詢 API 可整合：
  - `region`
  - `category`
  - 參考地點或座標
  - `radius_m`
  - `top_k`
- 若有座標則做 nearby 篩選；若未提供座標則做一般地區 / 類別查詢
- nearby 半徑預設 `300m`，若使用者提供再調整
- 沒有 `region`、只有座標時，也允許 nearby 查詢
- response 盡量完整回傳可用欄位，包含 `raw_type`

## 需求拆解

- [ ] 把 `../japan_restaurant_with_rating_interest.json` 匯入 DB
- [ ] 提供餐廳版查詢 / 推薦 API
- [ ] 先用 `static_score` 作為排序 / 推薦分數
- [ ] 支援依地區列出所有餐廳
- [ ] 支援依地區 + 餐廳種類篩選餐廳
- [ ] 支援依座標查詢附近餐廳，預設半徑 `300m`，且半徑可調整

## 預計實作項目

### 1. 資料模型與匯入

- [ ] 新增獨立餐廳模型，例如 `Restaurant`
- [ ] 與既有 `PointOfInterest` 並存在同一個 database
- [ ] 決定是否新增欄位：
  - `venue_type`
  - `raw_type`
- [ ] 新增獨立匯入指令，例如 `import_restaurants`
- [ ] 大檔案匯入優化：
  - 目前檔案近 `18` 萬筆
  - 要注意 `update_or_create` 逐筆匯入速度可能偏慢
  - 若需要可改成 batch 匯入策略
- [ ] 補資料驗證：
  - 空欄位處理
  - `lat` / `lng` 缺值處理
  - `interests` 非 list 的保護

### 2. API 設計

- [ ] 新增餐廳 API，例如：
  - `GET /api/restaurants/`
  - `GET /api/restaurants/{restaurant_id}/`
  - `GET /api/restaurants/metadata/`
  - `POST /api/restaurants/recommendations/`
- [ ] 餐廳推薦 API 整合一般篩選與 nearby 條件
- [ ] 不另外拆 `/nearby/`，除非後續實作發現語意不清

### 3. 地區 / 類型查詢

- [ ] 支援依 `region` 查全部餐廳
- [ ] 支援依 `region + category` 篩選
- [ ] 評估是否也要支援：
  - `venue_type`
  - `raw_type`
  - 多個 `interests`
  - 搜尋關鍵字 `search`
- [ ] `metadata` 補餐廳相關欄位：
  - regions
  - categories
  - venue_types
  - 常用 interests

### 4. 有興趣標籤推薦分數

### 4. 推薦分數

- [ ] 推薦先直接使用 `static_score`
- [ ] `recommendations` API 先不接受 `preferences`
- [ ] `final_score` 可直接回傳 `static_score`
- [ ] 保留未來再把 `preferences` / `interests` 加回來的空間

### 5. 附近餐廳查詢

- [ ] nearby 條件整合進 `POST /api/restaurants/recommendations/`
- [ ] 距離計算先用 Python / SQL 實作球面距離
- [ ] 先不引入 GIS 套件，除非效能不足
- [ ] 預設半徑：
  - `300m`
- [ ] 可調整參數：
  - `radius_m`
  - `top_k`
  - `category`
  - `ordering`
- [ ] 明確回傳：
  - `distance_m`
  - `final_score`

### 6. 測試與文件

- [ ] 補單元測試：
  - interest score
  - region filter
  - region + category filter
  - nearby radius filter
- [ ] 補 API 測試：
  - nearby query
  - recommendation with preferences
  - metadata fields
- [ ] 更新 `README.md`：
  - 新 JSON 匯入方式
  - 新 API 範例
  - nearby query 範例

## 建議實作順序

- [ ] 1. 新增餐廳 model / migration
- [ ] 2. 完成 `import_restaurants`
- [ ] 3. 完成 `GET /api/restaurants/` 與 metadata
- [ ] 4. 完成 `POST /api/restaurants/recommendations/`
- [ ] 5. 在 recommendations 內支援 nearby 條件
- [ ] 6. 補測試與 README

## 待確認

- [ ] `venue_type` 只有 `餐廳` / `小店`，是否要開放篩選
- [ ] 半徑是否需要上限，例如 `3000m`
