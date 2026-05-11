# Recommendation Backend

這個目錄提供旅遊景點推薦系統的 Django + DRF 後端，負責：

- 景點資料查詢
- 篩選條件 metadata
- 使用者偏好讀寫
- 推薦結果計算

## Quick Start

### Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run

```bash
cd backend
python manage.py migrate
python manage.py import_pois ../japan_with_rating_interest.json
python manage.py runserver
```

預設 base URL：

```text
http://127.0.0.1:8000
```

### Test User Preference Flow

先建立測試帳號：

```bash
cd backend
python manage.py create_test_user --username gary --password 123456
```

再跑偏好測試：

```bash
cd ..
./backend/test_user_preferences.sh http://127.0.0.1:8000 1
```

## API Overview

- `GET /`
- `GET /api/pois/`
- `GET /api/pois/{poi_id}/`
- `GET /api/metadata/`
- `GET /api/users/{user_id}/preferences/`
- `PUT /api/users/{user_id}/preferences/`
- `PATCH /api/users/{user_id}/preferences/`
- `POST /api/recommendations/`

## POI ID 說明

POI 相關 API 回傳的 `id`，不是 Django 自動產生的資料庫主鍵，而是景點的業務 id。

實際對應關係如下：

- 原始 JSON 的 `id`
- 匯入後存進資料表欄位 `poi_id`
- API 回傳時再用欄位名稱 `id` 輸出

也就是說，同一個值在不同層的名稱不同：

```json
{
  "source_json_id": "tokyo_shibuya_sky",
  "db_poi_id": "tokyo_shibuya_sky",
  "api_id": "tokyo_shibuya_sky"
}
```

所以查單一景點時：

```text
/api/pois/tokyo_shibuya_sky/
```

這裡的 `{poi_id}` 要帶的就是這個業務 id。

## Common Response Shapes

### Root Response

`GET /`

```json
{
  "service": "travel-world recommendation api",
  "status": "ok",
  "endpoints": {
    "admin": "/admin/",
    "metadata": "/api/metadata/",
    "pois": "/api/pois/",
    "recommendations": "/api/recommendations/"
  }
}
```

### POI Object

`GET /api/pois/` 的 `results[]` 與 `GET /api/pois/{poi_id}/` 都使用同樣的 POI 格式：

```json
{
  "id": "tokyo_shibuya_sky",
  "name": "Shibuya Sky",
  "region": "Tokyo",
  "category": "viewpoint",
  "interests": ["night_view", "photo"],
  "google_rating": 4.6,
  "review_count": 1200,
  "rating_norm": 0.92,
  "review_norm": 0.73,
  "station_distance_efficiency": 0.88,
  "static_score": 0.87,
  "distance_to_station_km": 0.35,
  "station_anchor": "Shibuya Station",
  "lat": 35.658,
  "lng": 139.701,
  "image_url": "https://example.com/image.jpg",
  "google_name_matched": "SHIBUYA SKY"
}
```

### Paginated POI List Response

`GET /api/pois/`

```json
{
  "count": 123,
  "next": "http://127.0.0.1:8000/api/pois/?region=Tokyo&page_size=50&page=2",
  "previous": null,
  "results": [
    {
      "id": "tokyo_shibuya_sky",
      "name": "Shibuya Sky",
      "region": "Tokyo",
      "category": "viewpoint",
      "interests": ["night_view", "photo"],
      "google_rating": 4.6,
      "review_count": 1200,
      "rating_norm": 0.92,
      "review_norm": 0.73,
      "station_distance_efficiency": 0.88,
      "static_score": 0.87,
      "distance_to_station_km": 0.35,
      "station_anchor": "Shibuya Station",
      "lat": 35.658,
      "lng": 139.701,
      "image_url": "https://example.com/image.jpg",
      "google_name_matched": "SHIBUYA SKY"
    }
  ]
}
```

欄位說明：

- `count`：符合查詢條件的總筆數
- `next`：下一頁 URL，沒有下一頁時為 `null`
- `previous`：上一頁 URL，第一頁通常為 `null`
- `results`：本頁實際回傳的景點資料

## API Details

### `GET /api/pois/`

查詢景點列表。

支援 query params：

- `region`
- `category`
- `search`
- `interests`
- `ordering`
- `page`
- `page_size`

`interests` 需用逗號分隔，例如：

```text
food,shopping
```

`ordering` 支援值：

- `static_score`
- `-static_score`
- `google_rating`
- `-google_rating`
- `review_count`
- `-review_count`

使用範例：

- 第一頁 50 筆東京景點：`/api/pois/?region=Tokyo&page_size=50`
- 第二頁 50 筆東京景點：`/api/pois/?region=Tokyo&page_size=50&page=2`
- 中文地區名稱範例：`/api/pois/?region=東京都&page_size=50`

如果呼叫：

```text
/api/pois/?region=Tokyo&page_size=50
```

代表：

- 只查 `region=Tokyo`
- 本次最多回 50 筆
- 若 `count` 大於 50，需用 `next` 或 `page=2` 繼續抓

回傳格式：

```json
{
  "count": 123,
  "next": "http://127.0.0.1:8000/api/pois/?region=Tokyo&page_size=50&page=2",
  "previous": null,
  "results": [
    {
      "id": "tokyo_shibuya_sky",
      "name": "Shibuya Sky",
      "region": "Tokyo",
      "category": "viewpoint",
      "interests": ["night_view", "photo"],
      "google_rating": 4.6,
      "review_count": 1200,
      "rating_norm": 0.92,
      "review_norm": 0.73,
      "station_distance_efficiency": 0.88,
      "static_score": 0.87,
      "distance_to_station_km": 0.35,
      "station_anchor": "Shibuya Station",
      "lat": 35.658,
      "lng": 139.701,
      "image_url": "https://example.com/image.jpg",
      "google_name_matched": "SHIBUYA SKY"
    }
  ]
}
```

### `GET /api/pois/{poi_id}/`

查單一景點。

回傳格式：

```json
{
  "id": "tokyo_shibuya_sky",
  "name": "Shibuya Sky",
  "region": "Tokyo",
  "category": "viewpoint",
  "interests": ["night_view", "photo"],
  "google_rating": 4.6,
  "review_count": 1200,
  "rating_norm": 0.92,
  "review_norm": 0.73,
  "station_distance_efficiency": 0.88,
  "static_score": 0.87,
  "distance_to_station_km": 0.35,
  "station_anchor": "Shibuya Station",
  "lat": 35.658,
  "lng": 139.701,
  "image_url": "https://example.com/image.jpg",
  "google_name_matched": "SHIBUYA SKY"
}
```

查不到時回傳 `404 Not Found`。

### `GET /api/metadata/`

查詢前端篩選用的 metadata。

回傳格式：

```json
{
  "regions": ["Kyoto", "Osaka", "Tokyo"],
  "categories": ["food", "shopping", "viewpoint"],
  "poi_count": 1234
}
```

### `GET /api/users/{user_id}/preferences/`

讀取某個使用者目前已儲存的偏好設定。

成功回傳：

```json
{
  "user_id": 1,
  "travel_region": "Tokyo",
  "preference_profile": {
    "food": 0.9,
    "shopping": 0.6,
    "nature": 0.3
  },
  "updated_at": "2026-05-11T12:34:56Z"
}
```

如果使用者尚未建立偏好：

```json
{
  "detail": "Preference profile not found."
}
```

狀態碼為 `404 Not Found`。

### `PUT /api/users/{user_id}/preferences/`

### `PATCH /api/users/{user_id}/preferences/`

建立或更新使用者偏好。兩者都會回傳更新後的完整 profile。

Request body：

```json
{
  "travel_region": "Tokyo",
  "preference_profile": {
    "food": 0.9,
    "shopping": 0.6,
    "nature": 0.3
  }
}
```

Response：

```json
{
  "user_id": 1,
  "travel_region": "Tokyo",
  "preference_profile": {
    "food": 0.9,
    "shopping": 0.6,
    "nature": 0.3
  },
  "updated_at": "2026-05-11T12:34:56Z"
}
```

### `POST /api/recommendations/`

根據使用者偏好或指定偏好計算推薦結果。

Request body 範例：

```json
{
  "user_id": 1,
  "region": "Tokyo",
  "category": "viewpoint",
  "preferences": {
    "night_view": 1.0,
    "photo": 0.8
  },
  "top_k": 5
}
```

Response：

```json
{
  "count": 2,
  "filters": {
    "region": "Tokyo",
    "category": "viewpoint",
    "top_k": 5
  },
  "preferences": {
    "night_view": 1.0,
    "photo": 0.8
  },
  "results": [
    {
      "id": "tokyo_shibuya_sky",
      "name": "Shibuya Sky",
      "region": "Tokyo",
      "category": "viewpoint",
      "interests": ["night_view", "photo"],
      "image_url": "https://example.com/image.jpg",
      "final_score": 0.935,
      "score_breakdown": {
        "interest_match": 1.0,
        "static_score": 0.87
      }
    }
  ]
}
```

如果 request 同時沒有提供 `preferences` 和 `user_id`，會回傳驗證錯誤：

```json
{
  "non_field_errors": ["Either preferences or user_id is required."]
}
```

## MySQL

預設使用 SQLite 方便本地開發。若要切換到 MySQL，設定以下環境變數：

```bash
export DB_ENGINE=mysql
export DB_NAME=travel_world
export DB_USER=root
export DB_PASSWORD=secret
export DB_HOST=127.0.0.1
export DB_PORT=3306
```
