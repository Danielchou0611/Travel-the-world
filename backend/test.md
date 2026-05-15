# Restaurant API Test Plan

這份文件先定義之後實作完成要驗證的內容，避免做到一半才補想測什麼。

## 測試目標

- 確認餐廳資料能正確匯入同一個 database
- 確認景點資料與餐廳資料可以並存
- 確認餐廳列表 API 的篩選正確
- 確認餐廳 recommendation API 在一般查詢與 nearby 查詢都正確
- 確認排序目前以 `static_score` 為主
- 確認回傳欄位完整，包含 `raw_type`

## 1. 匯入測試

- [ ] 執行 `python manage.py import_restaurants ../japan_restaurant_with_rating_interest.json`
- [ ] 匯入成功且沒有 JSON 格式錯誤
- [ ] 匯入後餐廳資料筆數大於 `0`
- [ ] 匯入後既有 `PointOfInterest` 資料仍存在
- [ ] 同一筆 `id` 重複匯入時不會新增重複資料
- [ ] `venue_type`、`raw_type`、`category`、`lat`、`lng` 有正確存入
- [ ] `raw_payload` 有保留原始資料

## 2. Metadata 測試

- [ ] `GET /api/restaurants/metadata/` 可成功回傳 `200`
- [ ] response 包含：
  - `regions`
  - `categories`
  - `venue_types`
  - `restaurant_count`
- [ ] `regions` 包含實際存在的地區，例如 `東京都`
- [ ] `categories` 包含實際存在的種類，例如 `拉麵`、`日式`
- [ ] `venue_types` 至少包含 `餐廳`、`小店`

## 3. List API 測試

- [ ] `GET /api/restaurants/` 可成功回傳 `200`
- [ ] 預設有分頁格式：
  - `count`
  - `next`
  - `previous`
  - `results`
- [ ] `results[]` 每筆包含：
  - `id`
  - `name`
  - `region`
  - `category`
  - `venue_type`
  - `raw_type`
  - `google_rating`
  - `review_count`
  - `static_score`
  - `lat`
  - `lng`

### 地區篩選

- [ ] `GET /api/restaurants/?region=東京都` 只回傳 `東京都` 餐廳

### 地區 + 類別篩選

- [ ] `GET /api/restaurants/?region=東京都&category=拉麵` 只回傳 `東京都` 的 `拉麵`

### 關鍵字搜尋

- [ ] `GET /api/restaurants/?search=渋谷` 能回傳名稱符合的資料

### 排序

- [ ] `GET /api/restaurants/?ordering=-static_score` 依 `static_score` 由大到小
- [ ] `GET /api/restaurants/?ordering=-google_rating` 依 `google_rating` 由大到小
- [ ] `GET /api/restaurants/?ordering=-review_count` 依 `review_count` 由大到小

## 4. Recommendation API 測試

- [ ] `POST /api/restaurants/recommendations/` 可成功回傳 `200`
- [ ] response 包含：
  - `count`
  - `filters`
  - `results`
- [ ] `results[]` 每筆包含：
  - `id`
  - `name`
  - `region`
  - `category`
  - `venue_type`
  - `raw_type`
  - `static_score`
  - `distance_m`
  - `final_score`
- [ ] `final_score` 目前應等於 `static_score`

### 一般推薦

- [ ] body：
  ```json
  {
    "region": "東京都",
    "top_k": 5
  }
  ```
- [ ] 只回傳 `東京都`
- [ ] 最多回傳 `5` 筆
- [ ] 結果依 `final_score` 由大到小排序

### 地區 + 類別推薦

- [ ] body：
  ```json
  {
    "region": "東京都",
    "category": "拉麵",
    "top_k": 10
  }
  ```
- [ ] 只回傳 `東京都`
- [ ] 只回傳 `category=拉麵`

## 5. Nearby Recommendation 測試

### 只有座標，使用預設半徑

- [ ] body：
  ```json
  {
    "lat": 35.681236,
    "lng": 139.767125,
    "top_k": 20
  }
  ```
- [ ] 可成功回傳 `200`
- [ ] `filters.radius_m` 應為 `300`
- [ ] 所有結果都應在 `300m` 內
- [ ] 所有結果 `distance_m` 不為 `null`

### 座標 + 自訂半徑

- [ ] body：
  ```json
  {
    "lat": 35.681236,
    "lng": 139.767125,
    "radius_m": 500,
    "top_k": 20
  }
  ```
- [ ] 所有結果都應在 `500m` 內

### 座標 + 類別

- [ ] body：
  ```json
  {
    "lat": 35.681236,
    "lng": 139.767125,
    "radius_m": 500,
    "category": "咖啡",
    "top_k": 10
  }
  ```
- [ ] 所有結果都在 `500m` 內
- [ ] 所有結果都為 `category=咖啡`

### 地區 + 座標 + 類別

- [ ] body：
  ```json
  {
    "region": "東京都",
    "category": "壽司",
    "lat": 35.681236,
    "lng": 139.767125,
    "radius_m": 500,
    "top_k": 10
  }
  ```
- [ ] 所有結果都為 `東京都`
- [ ] 所有結果都為 `category=壽司`
- [ ] 所有結果都在 `500m` 內

## 6. 邊界條件

### 無結果

- [ ] 指定不存在的 `region` 時，回傳空結果而非 `500`
- [ ] 指定不存在的 `category` 時，回傳空結果而非 `500`
- [ ] nearby 半徑內沒有餐廳時，回傳空結果而非 `500`

### 參數驗證

- [ ] `top_k=0` 應回 `400`
- [ ] `radius_m=0` 應回 `400`
- [ ] 缺少 `lat` 但有 `lng` 應回 `400`
- [ ] 缺少 `lng` 但有 `lat` 應回 `400`
- [ ] `lat` 超出範圍應回 `400`
- [ ] `lng` 超出範圍應回 `400`

### 單筆 detail

- [ ] `GET /api/restaurants/{restaurant_id}/` 查得到既有資料
- [ ] 不存在的 `restaurant_id` 應回 `404`

## 7. 效能與資料合理性

- [ ] 匯入 `17` 萬筆資料時間可接受
- [ ] 一般 list API 查詢時間可接受
- [ ] nearby query 查詢時間可接受
- [ ] `distance_m` 計算結果與人工估算沒有明顯偏差

## 8. 手動驗證範例

- [ ] 用 `東京都` 做 list / recommendation / nearby 各跑一次
- [ ] 用 `category=拉麵` 做一次交叉驗證
- [ ] 隨機抽 3 筆 nearby 結果，用地圖概念確認距離是否合理
