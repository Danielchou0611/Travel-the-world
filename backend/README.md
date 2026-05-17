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
python manage.py import_pois ../japan_with_rating_interest.json --sync
python manage.py import_restaurants ../japan_restaurant_with_rating_interest.json --sync
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
- `GET /api/restaurants/`
- `GET /api/restaurants/{restaurant_id}/`
- `GET /api/restaurants/metadata/`
- `POST /api/restaurants/recommendations/`
- `GET /api/users/{user_id}/preferences/`
- `PUT /api/users/{user_id}/preferences/`
- `PATCH /api/users/{user_id}/preferences/`
- `POST /api/recommendations/`

## Restaurant API Overview

餐廳資料與原本的景點資料並存在同一個 database，但使用獨立的 `restaurants` 資料表。

### Import Restaurants

```bash
cd backend
python manage.py import_restaurants ../japan_restaurant_with_rating_interest.json --sync
```

匯入模式說明：

- 預設：`upsert`，相同 `id` 更新，新 `id` 新增
- `--replace`：先清空整張表，再重新匯入
- `--sync`：以 JSON 為準同步，會更新/新增，並刪除 DB 中已不在 JSON 內的舊資料

例如：

```bash
python manage.py import_restaurants ../japan_restaurant_with_rating_interest.json --sync
python manage.py import_pois ../japan_with_rating_interest.json --sync
```

### Restaurant Recommendation Example

`POST /api/restaurants/recommendations/`

```json
{
  "region": "東京都",
  "category": "拉麵",
  "top_k": 10
}
```

附近查詢也走同一個 API：

```json
{
  "lat": 35.681236,
  "lng": 139.767125,
  "radius_m": 300,
  "top_k": 20
}
```

目前餐廳推薦排序直接使用 `static_score`，若有提供座標，回傳會額外包含 `distance_m`。

## Restaurant ID 說明

Restaurant 相關 API 回傳的 `id`，不是 Django 自動產生的資料庫主鍵，而是餐廳資料的業務 id。

實際對應關係如下：

- 原始 JSON 的 `id`
- 匯入後存進資料表欄位 `restaurant_id`
- API 回傳時再用欄位名稱 `id` 輸出

也就是說，同一個值在不同層的名稱不同：

```json
{
  "source_json_id": "ChIJoSq01FyNGGARuu4izIPSdRs",
  "db_restaurant_id": "ChIJoSq01FyNGGARuu4izIPSdRs",
  "api_id": "ChIJoSq01FyNGGARuu4izIPSdRs"
}
```

所以查單一餐廳時：

```text
/api/restaurants/ChIJoSq01FyNGGARuu4izIPSdRs/
```

這裡的 `{restaurant_id}` 要帶的就是這個業務 id。

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
    "recommendations": "/api/recommendations/",
    "restaurants": "/api/restaurants/",
    "restaurant_metadata": "/api/restaurants/metadata/",
    "restaurant_recommendations": "/api/restaurants/recommendations/"
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

### Restaurant Object

`GET /api/restaurants/` 的 `results[]` 與 `GET /api/restaurants/{restaurant_id}/` 都使用同樣的餐廳格式：

```json
{
  "id": "ChIJoSq01FyNGGARuu4izIPSdRs",
  "name": "月島もんじゃ おこげ 渋谷",
  "region": "東京都",
  "category": "日式",
  "venue_type": "餐廳",
  "interests": ["日式", "餐廳", "文字燒"],
  "google_rating": 4.9,
  "review_count": 29412,
  "rating_norm": 0.98,
  "review_norm": 0.8835,
  "station_distance_efficiency": 0.4334,
  "static_score": 0.951,
  "distance_to_station_km": 6.5,
  "station_anchor": "Tokyo Station",
  "lat": 35.6604493,
  "lng": 139.699402,
  "image_url": "https://example.com/restaurant.jpg",
  "google_name_matched": "月島もんじゃ おこげ 渋谷",
  "raw_type": "もんじゃ焼き屋"
}
```

### Paginated Restaurant List Response

`GET /api/restaurants/`

```json
{
  "count": 7517,
  "next": "http://127.0.0.1:8000/api/restaurants/?region=%E6%9D%B1%E4%BA%AC%E9%83%BD&page_size=3&page=2",
  "previous": null,
  "results": [
    {
      "id": "ChIJoSq01FyNGGARuu4izIPSdRs",
      "name": "月島もんじゃ おこげ 渋谷",
      "region": "東京都",
      "category": "日式",
      "venue_type": "餐廳",
      "interests": ["日式", "餐廳", "文字燒"],
      "google_rating": 4.9,
      "review_count": 29412,
      "rating_norm": 0.98,
      "review_norm": 0.8835,
      "station_distance_efficiency": 0.4334,
      "static_score": 0.951,
      "distance_to_station_km": 6.5,
      "station_anchor": "Tokyo Station",
      "lat": 35.6604493,
      "lng": 139.699402,
      "image_url": "https://example.com/restaurant.jpg",
      "google_name_matched": "月島もんじゃ おこげ 渋谷",
      "raw_type": "もんじゃ焼き屋"
    }
  ]
}
```

欄位說明：

- `count`：符合查詢條件的總筆數
- `next`：下一頁 URL，沒有下一頁時為 `null`
- `previous`：上一頁 URL，第一頁通常為 `null`
- `results`：本頁實際回傳的餐廳資料

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

### `GET /api/restaurants/`

查詢餐廳列表。

支援 query params：

- `region`
- `category`
- `venue_type`
- `search`
- `ordering`
- `page`
- `page_size`

`ordering` 支援值：

- `static_score`
- `-static_score`
- `google_rating`
- `-google_rating`
- `review_count`
- `-review_count`

使用範例：

- 第一頁 50 筆東京都餐廳：`/api/restaurants/?region=東京都&page_size=50`
- 第一頁 50 筆東京都拉麵：`/api/restaurants/?region=東京都&category=拉麵&page_size=50`
- 第一頁 50 筆東京都小店：`/api/restaurants/?region=東京都&venue_type=小店&page_size=50`
- 用關鍵字搜尋：`/api/restaurants/?search=渋谷&page_size=20`

如果呼叫：

```text
/api/restaurants/?region=東京都&category=拉麵&page_size=50
```

代表：

- 只查 `region=東京都`
- 只查 `category=拉麵`
- 本次最多回 50 筆
- 若 `count` 大於 50，需用 `next` 或 `page=2` 繼續抓

回傳格式：

```json
{
  "count": 571,
  "next": "http://127.0.0.1:8000/api/restaurants/?category=%E6%8B%89%E9%BA%B5&page=2&page_size=50&region=%E6%9D%B1%E4%BA%AC%E9%83%BD",
  "previous": null,
  "results": [
    {
      "id": "ChIJazjtQgCNGGARO606yF6kY7I",
      "name": "つじ田 神田末広町店",
      "region": "東京都",
      "category": "拉麵",
      "venue_type": "餐廳",
      "interests": ["拉麵", "餐廳", "宵夜", "快速用餐"],
      "google_rating": 4.9,
      "review_count": 3641,
      "rating_norm": 0.98,
      "review_norm": 0.7041,
      "station_distance_efficiency": 0.67,
      "static_score": 0.8972,
      "distance_to_station_km": 2.5,
      "station_anchor": "Tokyo Station",
      "lat": 35.7031126,
      "lng": 139.7710666,
      "image_url": "https://example.com/ramen.jpg",
      "google_name_matched": "つじ田 神田末広町店",
      "raw_type": "ラーメン屋"
    }
  ]
}
```

### `GET /api/restaurants/{restaurant_id}/`

查單一餐廳。

回傳格式：

```json
{
  "id": "ChIJoSq01FyNGGARuu4izIPSdRs",
  "name": "月島もんじゃ おこげ 渋谷",
  "region": "東京都",
  "category": "日式",
  "venue_type": "餐廳",
  "interests": ["日式", "餐廳", "文字燒"],
  "google_rating": 4.9,
  "review_count": 29412,
  "rating_norm": 0.98,
  "review_norm": 0.8835,
  "station_distance_efficiency": 0.4334,
  "static_score": 0.951,
  "distance_to_station_km": 6.5,
  "station_anchor": "Tokyo Station",
  "lat": 35.6604493,
  "lng": 139.699402,
  "image_url": "https://example.com/restaurant.jpg",
  "google_name_matched": "月島もんじゃ おこげ 渋谷",
  "raw_type": "もんじゃ焼き屋"
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

### `GET /api/restaurants/metadata/`

查詢餐廳前端篩選用的 metadata。

回傳格式：

```json
{
  "regions": ["東京都", "大阪府", "京都府"],
  "categories": ["拉麵", "壽司", "咖啡"],
  "venue_types": ["小店", "餐廳"],
  "restaurant_count": 175979
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

### `POST /api/restaurants/recommendations/`

根據地區、餐廳類別、店家型態與可選的座標半徑條件，回傳餐廳推薦結果。

目前排序邏輯直接使用 `static_score`，因此：

- `final_score` 目前等於 `static_score`
- 若沒有提供座標，`distance_m` 會是 `null`
- 若提供 `lat` 與 `lng`，就會啟用 nearby 篩選
- `radius_m` 預設值是 `300`

Request body 可用欄位：

- `region`
- `category`
- `venue_type`
- `lat`
- `lng`
- `radius_m`
- `top_k`

一般推薦範例：

```json
{
  "region": "東京都",
  "category": "拉麵",
  "top_k": 5
}
```

Nearby 推薦範例：

```json
{
  "lat": 35.681236,
  "lng": 139.767125,
  "radius_m": 300,
  "top_k": 5
}
```

Nearby + 類別範例：

```json
{
  "lat": 35.681236,
  "lng": 139.767125,
  "radius_m": 500,
  "category": "咖啡",
  "top_k": 5
}
```

Response：

```json
{
  "count": 5,
  "filters": {
    "region": "東京都",
    "category": "拉麵",
    "venue_type": "",
    "lat": null,
    "lng": null,
    "radius_m": null,
    "top_k": 5
  },
  "results": [
    {
      "id": "ChIJazjtQgCNGGARO606yF6kY7I",
      "name": "つじ田 神田末広町店",
      "region": "東京都",
      "category": "拉麵",
      "venue_type": "餐廳",
      "interests": ["拉麵", "餐廳", "宵夜", "快速用餐"],
      "google_rating": 4.9,
      "review_count": 3641,
      "rating_norm": 0.98,
      "review_norm": 0.7041,
      "station_distance_efficiency": 0.67,
      "static_score": 0.8972,
      "distance_to_station_km": 2.5,
      "station_anchor": "Tokyo Station",
      "lat": 35.7031126,
      "lng": 139.7710666,
      "image_url": "https://example.com/ramen.jpg",
      "google_name_matched": "つじ田 神田末広町店",
      "raw_type": "ラーメン屋",
      "distance_m": null,
      "final_score": 0.8972
    }
  ]
}
```

Nearby response 範例：

```json
{
  "count": 5,
  "filters": {
    "region": "",
    "category": "",
    "venue_type": "",
    "lat": 35.681236,
    "lng": 139.767125,
    "radius_m": 300,
    "top_k": 5
  },
  "results": [
    {
      "id": "ChIJeUDSM7-LGGARjdgZ-MacvWk",
      "name": "近畿大学水産研究所 はなれ グランスタ東京店",
      "region": "東京都",
      "category": "海鮮",
      "venue_type": "餐廳",
      "interests": ["海鮮", "餐廳", "在地特色"],
      "google_rating": 4.4,
      "review_count": 3109,
      "rating_norm": 0.88,
      "review_norm": 0.6906,
      "station_distance_efficiency": 0.9983,
      "static_score": 0.8232,
      "distance_to_station_km": 0.0,
      "station_anchor": "Tokyo Station",
      "lat": 35.681277,
      "lng": 139.7671167,
      "image_url": "https://example.com/seafood.jpg",
      "google_name_matched": "近畿大学水産研究所 はなれ グランスタ東京店",
      "raw_type": "シーフード・海鮮料理店",
      "distance_m": 4.6,
      "final_score": 0.8232
    }
  ]
}
```

如果 request 只提供 `lat` 或只提供 `lng`，會回傳驗證錯誤：

```json
{
  "non_field_errors": ["lat and lng must be provided together."]
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
