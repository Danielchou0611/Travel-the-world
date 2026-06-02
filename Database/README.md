# Travel The World Database

這份文件只說明 `Database/backend/` 這個 Django + DRF 推薦 API，但它和 `server/` 共用同一個 repo root `.venv`。

## 目錄

```text
Database/
├── backend/
│   ├── config/
│   ├── recommendations/
│   ├── test_api.sh
│   ├── test_restaurants.sh
│   ├── test_restaurants_strict.sh
│   ├── test_user_preferences.sh
│   └── manage.py
├── README.md
└── requirements.txt
```

## 統一安裝方式

請在 repo root 建立並使用同一個 `.venv`：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

如果你目前人在 `Database/`，可以這樣做：

```bash
cd ..
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

如果你已經在 repo root 建好 `.venv`，之後只要：

```bash
source ../.venv/bin/activate
```

`Database/requirements.txt` 目前會直接指向 repo root 的 `requirements.txt`，避免兩份依賴清單分開維護。

## 後端用途

`Database/backend/` 提供：

- 景點資料查詢
- 餐廳資料查詢
- metadata 篩選條件
- 使用者偏好讀寫
- 推薦結果計算

使用技術：

- Django 5
- Django REST Framework
- SQLite 作為本地開發 DB
- MySQL 可透過環境變數切換

## 初始化資料

如果資料檔還沒解壓縮，先在 Database 執行：

```bash
unzip ../japan_restaurant_with_rating_interest.json.zip
unzip ../japan_with_rating_interest.json.zip
```

## 啟動 Django API

```bash
cd backend
python manage.py migrate
python manage.py import_pois ../../japan_with_rating_interest.json --sync
python manage.py import_restaurants ../../japan_restaurant_with_rating_interest.json --sync
python manage.py runserver
```

啟動後可測：

- [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- [http://127.0.0.1:8000/api/metadata/](http://127.0.0.1:8000/api/metadata/)
- [http://127.0.0.1:8000/api/pois/](http://127.0.0.1:8000/api/pois/)
- [http://127.0.0.1:8000/api/restaurants/](http://127.0.0.1:8000/api/restaurants/)
- [http://127.0.0.1:8000/api/restaurants/metadata/](http://127.0.0.1:8000/api/restaurants/metadata/)

## 測試

在 `Database/` 目錄執行：

```bash
./backend/test_api.sh
./backend/test_restaurants.sh
./backend/test_restaurants_strict.sh
```

測 user preference 前先建立測試帳號：

```bash
cd backend
python manage.py create_test_user --username gary --password 123456
cd ..
./backend/test_user_preferences.sh http://127.0.0.1:8000 1
```

跑 Django tests：

```bash
cd backend
python manage.py test
```
