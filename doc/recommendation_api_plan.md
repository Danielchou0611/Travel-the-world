# Recommendation API Plan

## 1. Goal

本文件定義推薦系統的責任切分：

- `pipeline`：離線產出 POI 靜態特徵
- `DB`：儲存 POI feature 與 user preference
- `API`：根據 user preference 動態計算 `interest_match` 與最終排序
- `frontend`：送出偏好、接收推薦結果

重點是：

- 不需要為每個使用者重跑整個 pipeline
- `interest_match` 不應該是 pipeline 固定產物
- 使用者推薦應在 API 層即時計算

## 2. Responsibility Split

### Pipeline

負責：

- 讀取原始景點資料
- 正規化欄位
- 建立景點分類與 `interests` tags
- 輸出 POI 靜態特徵

不負責：

- 根據單一使用者計算 `interest_match`
- 產出 personalized ranking

### Database

負責：

- 儲存 POI 靜態特徵
- 儲存 user preference profile
- 之後如有需要，可儲存 recommendation cache

### API

負責：

- 接收 user preference
- 撈出候選 POIs
- 計算 `interest_match`
- 合成最終 `final_score`
- 回傳排序結果

## 3. Pipeline Output Adjustment

目前 pipeline 應保留的欄位：

- `id`
- `name`
- `region`
- `category`
- `interests`
- `google_rating`
- `review_count`
- `rating_norm`
- `review_norm`
- `station_distance_efficiency`
- `distance_to_station_km`
- `lat`
- `lng`
- `image_url`
- `google_name_matched`

建議調整：

- `interest_match` 不要作為固定值寫死在 pipeline 產物
- pipeline 可保留 `static_score` 作為靜態排序分數
- pipeline 的定位應是 `POI feature builder`，不是 recommender

## 4. Database Schema

### pois

建議欄位：

- `id`
- `name`
- `region`
- `category`
- `interests`：JSON 或 array
- `google_rating`
- `review_count`
- `rating_norm`
- `review_norm`
- `station_distance_efficiency`
- `static_score`
- `distance_to_station_km`
- `lat`
- `lng`
- `image_url`
- `google_name_matched`

### users

建議欄位：

- `id`
- `preference_profile`：JSON
- `travel_region`
- `created_at`
- `updated_at`

範例：

```json
{
  "歷史": 1.0,
  "藝術": 0.6,
  "自然": 0.8,
  "親子": 0.2,
  "戶外": 0.7
}
```

### Optional: recommendation_cache

只有在未來需要快取時再新增，現在不必先做。

### Optional: recommendation_query_logs

若要保留每次推薦查詢紀錄，建議再加：

- `id`
- `user_id`
- `region`
- `category`
- `top_k`
- `preferences`
- `result_poi_ids`
- `created_at`

這張表適合拿來 debug、看推薦輸入條件、未來做 A/B test。

### 實作對應

目前 repo 已補上 Django model：

- `backend/recommendations/models.py`
- `pois` -> `PointOfInterest`
- `user_preferences` -> `UserPreferenceProfile`
- `recommendation_query_logs` -> `RecommendationQueryLog`

## 5. User Preference Schema

建議用 key-value 權重表示法：

```json
{
  "歷史": 1.0,
  "藝術": 0.5,
  "打卡": 0.8
}
```

特性：

- 前端問卷或 tag selector 容易轉換
- 後端容易做 match 計算
- 之後可延伸成更多 tag，不需大改 schema

預設規則：

- 沒有出現的 tag 視為 `0`
- 權重範圍先統一用 `0.0 ~ 1.0`

## 6. API Design

### GET /pois

用途：

- 取得靜態景點資料
- 可搭配 region/category/filter 使用

建議 query params：

- `region`
- `category`
- `search`
- `interests=歷史,戶外`
- `ordering=-static_score`

Response example:

```json
{
  "count": 20,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "Q183536",
      "name": "東京鐵塔",
      "region": "東京都",
      "category": "景點",
      "interests": ["景點", "戶外", "打卡"],
      "google_rating": 4.5,
      "review_count": 95720,
      "rating_norm": 0.9,
      "review_norm": 0.9619,
      "station_distance_efficiency": 0.6114,
      "static_score": 0.8784,
      "distance_to_station_km": 3.2,
      "station_anchor": "Tokyo Station",
      "lat": 35.6586111,
      "lng": 139.7455556,
      "image_url": "http://commons.wikimedia.org/wiki/Special:FilePath/Tokyo%20Tower%202023.jpg",
      "google_name_matched": "東京タワー"
    }
  ]
}
```

### GET /pois/{id}

用途：

- 單一景點詳情頁
- 前端點卡片後可再拿完整資料

### GET /metadata

用途：

- 初始化前端 filter 下拉選單
- 一次拿 regions、categories、poi_count

Response example:

```json
{
  "regions": ["京都府", "大阪府", "東京都"],
  "categories": ["博物館", "景點", "遊樂"],
  "poi_count": 1200
}
```

### PUT /users/{user_id}/preferences

用途：

- 儲存使用者偏好
- 問卷完成後先落 DB，推薦時只要傳 `user_id`

Request example:

```json
{
  "travel_region": "東京都",
  "preference_profile": {
    "歷史": 1.0,
    "藝術": 0.5,
    "打卡": 0.8
  }
}
```

### POST /recommendations

用途：

- 接收 user preference
- 回傳 personalized ranking

Request example:

```json
{
  "region": "東京都",
  "preferences": {
    "歷史": 1.0,
    "藝術": 0.5,
    "打卡": 0.8
  },
  "top_k": 20
}
```

也支援只傳 `user_id`：

```json
{
  "user_id": 7,
  "region": "東京都",
  "category": "景點",
  "top_k": 20
}
```

Response example:

```json
{
  "count": 1,
  "filters": {
    "region": "東京都",
    "category": "景點",
    "top_k": 20
  },
  "preferences": {
    "歷史": 1.0,
    "藝術": 0.5,
    "打卡": 0.8
  },
  "results": [
    {
      "id": "Q183536",
      "name": "東京鐵塔",
      "region": "東京都",
      "category": "景點",
      "interests": ["景點", "戶外", "打卡"],
      "image_url": "http://commons.wikimedia.org/wiki/Special:FilePath/Tokyo%20Tower%202023.jpg",
      "final_score": 0.82,
      "score_breakdown": {
        "interest_match": 0.75,
        "static_score": 0.88
      }
    }
  ]
}
```

## 7. Scoring Logic

推薦公式應拆成兩層：

### Static features

來自 pipeline / DB：

- `rating_norm`
- `review_norm`
- `station_distance_efficiency`

`static_score` 由 pipeline 預先計算：

```text
static_score =
0.5 * rating_norm +
0.35 * review_norm +
0.15 * station_distance_efficiency
```

### Dynamic user match

由 API 根據 `user_preferences` 與 `poi.interests` 即時計算：

```text
interest_match = f(user_preferences, poi.interests)
```

第一版可先用簡單平均或加總：

```text
interest_match = average(user_preferences[tag] for tag in poi.interests)
```

缺少的 tag 預設為 `0`。

### Final score

第一版建議公式：

```text
final_score =
0.45 * interest_match +
0.55 * static_score
```

注意：

- 權重應放在可配置常數，不要寫死在 controller
- 之後可以改成 config file 或 environment-based tuning

## 8. Request Flow

`POST /recommendations` 流程：

1. 接收 `region`、`preferences`、`top_k`
2. 從 DB 撈出候選 POIs
3. 逐筆計算 `interest_match`
4. 合成 `final_score`
5. 依分數排序
6. 回傳前 `top_k`

對目前資料量來說，這樣的即時計算是可行的。

目前 pipeline 規模約數千筆 POI，先做 application-side scoring 即可，暫時不需要複雜的預先快取機制。

## 9. Development Order

建議順序：

1. 調整 pipeline schema，移除固定 `interest_match`
2. 保留並整理 POI 靜態特徵欄位
3. 匯入 DB
4. 實作 `POST /recommendations`
5. 補最小測試
6. 如果 Wen 開始做 itinerary，再新增 `distance_matrix`

## 10. Minimum Tests

建議至少覆蓋：

- `category mapping` 正確
- `interest tag generation` 正確
- user 偏好越接近 POI interests，`interest_match` 越高
- 同興趣條件下，高 `rating_norm` / `review_norm` 的景點應排序較前
- `region` filter 正常生效
- 缺少的 preference tag 預設視為 `0`

## 11. Risks And Notes

- 目前 `interests` 為 rule-based tag，精度有限
- 第一版推薦應先追求可解釋與可調整，不急著導入複雜模型
- 若之後需要更高準確度，再考慮 embedding / similarity model
- itinerary 規劃與推薦 API 應分階段進行，不建議一次混做
