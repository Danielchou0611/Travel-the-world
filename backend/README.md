# Recommendation Backend

這個目錄提供推薦系統的最小 Django + DRF 後端骨架，對應 `doc/recommendation_api_plan.md`。

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd backend
python manage.py migrate
python manage.py import_pois ../japan_with_rating_interest.json
python manage.py runserver
```

## Test User Preference Flow

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

## Main APIs

- `GET /api/pois/`
- `GET /api/pois/{poi_id}/`
- `GET /api/metadata/`
- `PUT /api/users/{user_id}/preferences/`
- `POST /api/recommendations/`

## MySQL

預設使用 SQLite 方便本地開發。若要切到 MySQL，設定以下環境變數即可：

```bash
export DB_ENGINE=mysql
export DB_NAME=travel_world
export DB_USER=root
export DB_PASSWORD=secret
export DB_HOST=127.0.0.1
export DB_PORT=3306
```
