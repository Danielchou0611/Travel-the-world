# Travel The World Gary

這個 repo 目前包含三個主要部分：

- `pipeline/`：整理與產出日本景點資料
- `demo-web/`：靜態 demo 頁面
- `backend/`：Django + DRF 推薦 API

這次新增的重點是把 recommendation backend 補完整，讓前端可以直接打 API 取得景點與推薦結果。

## This Round: What Was Added

本次主要完成：

1. 建立 Django + DRF backend 骨架
2. 建立 POI、user preference、recommendation log 資料表
3. 實作 POI API 與 recommendation API
4. 加入 JSON 匯入指令，讓 `japan_with_rating_interest.json` 可以進 DB
5. 加入 smoke test 與 user preference test script
6. 補上前端偏好欄位 spec 文件
7. 整理 repo `.gitignore`

## Project Structure

```text
.
├── backend/
│   ├── config/
│   ├── recommendations/
│   ├── test_api.sh
│   ├── test_user_preferences.sh
│   └── manage.py
├── demo-web/
├── doc/
├── pipeline/
├── japan_with_rating_interest.json
├── requirements.txt
└── README.md
```

## Recommendation Backend

後端位於 `backend/`，使用：

- Django 5
- Django REST Framework
- SQLite 作為本地開發 DB
- MySQL 可透過環境變數切換

### Main Models

定義在 [backend/recommendations/models.py](/Users/liguanlin/Desktop/github/1142-webapp/Travel-the-world-Gary/backend/recommendations/models.py:1)：

- `PointOfInterest`
- `UserPreferenceProfile`
- `RecommendationQueryLog`

### Main APIs

- `GET /`
  API root health/index
- `GET /api/metadata/`
  取得 `regions`、`categories`、`poi_count`
- `GET /api/pois/`
  取得景點列表，可用 `region`、`category`、`search`、`interests`
- `GET /api/pois/{poi_id}/`
  取得單一景點
- `PUT /api/users/{user_id}/preferences/`
  儲存使用者偏好
- `GET /api/users/{user_id}/preferences/`
  讀取使用者偏好
- `POST /api/recommendations/`
  依偏好產生推薦結果

## Setup
###
unzip japan_restaurant_with_rating_interest.json.zip

### 1. Create Virtualenv

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Migrations

```bash
cd backend
python manage.py migrate
```

### 3. Import POI Data

```bash
python manage.py import_pois ../japan_with_rating_interest.json --replace
```

目前已驗證可成功匯入約 4003 筆 POI。

### 4. Start Server

```bash
python manage.py runserver
```

啟動後可測：

- [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- [http://127.0.0.1:8000/api/metadata/](http://127.0.0.1:8000/api/metadata/)
- [http://127.0.0.1:8000/api/pois/](http://127.0.0.1:8000/api/pois/)

## Test Flow

### Smoke Test

在 repo root 執行：

```bash
./backend/test_api.sh
```

這會測：

- health endpoint
- metadata endpoint
- POI list endpoint
- recommendation endpoint

### User Preference Test

先建立測試帳號：

```bash
cd backend
python manage.py create_test_user --username gary --password 123456
```

再回到 repo root 測整條流程：

```bash
cd ..
./backend/test_user_preferences.sh http://127.0.0.1:8000 1
```

這會測：

- 儲存 user preference
- 讀回 user preference
- 用 `user_id` 打 recommendation API

### Django Tests

```bash
cd backend
python manage.py test
```

目前測試包含：

- interest tag 缺值預設為 `0`
- matching interest 會排比較前面
- user preference 可被 recommendation API 重用

## Frontend Integration

前端目前最重要的是收集以下資訊：

- `travel_region`
- `preferred_category`
- `top_k`
- `interest_preferences`

完整規格在：

- [doc/frontend_user_preference_spec.md](/Users/liguanlin/Desktop/github/1142-webapp/Travel-the-world-Gary/doc/frontend_user_preference_spec.md:1)

### Example: Save Preference

```json
{
  "travel_region": "東京都",
  "preference_profile": {
    "打卡": 1.0,
    "戶外": 0.8,
    "歷史": 0.3
  }
}
```

### Example: Get Recommendations

```json
{
  "region": "東京都",
  "category": "景點",
  "preferences": {
    "打卡": 1.0,
    "戶外": 0.8,
    "歷史": 0.3
  },
  "top_k": 10
}
```

## Related Docs

- [backend/README.md](/Users/liguanlin/Desktop/github/1142-webapp/Travel-the-world-Gary/backend/README.md:1)
- [pipeline/README.md](/Users/liguanlin/Desktop/github/1142-webapp/Travel-the-world-Gary/pipeline/README.md:1)
- [doc/recommendation_api_plan.md](/Users/liguanlin/Desktop/github/1142-webapp/Travel-the-world-Gary/doc/recommendation_api_plan.md:1)
- [doc/frontend_user_preference_spec.md](/Users/liguanlin/Desktop/github/1142-webapp/Travel-the-world-Gary/doc/frontend_user_preference_spec.md:1)

## Git Ignore

已加入 root `.gitignore`，目前會忽略：

- `.venv/`
- `__pycache__/`
- `*.pyc`
- `backend/db.sqlite3`
- `*.log`
- `.pytest_cache/`
- `.mypy_cache/`

## Notes

- `japan_with_rating_interest.json` 目前被當成可匯入、可 demo 的資料檔，沒有先忽略
- `pipeline/output/` 是否要進版控，取決於你們團隊要不要把它視為 build artifact
- 若下一步要給前端正式串接，通常會再補：
  - CORS
  - Swagger / OpenAPI
  - JWT auth
