# Travel The World

這個 repo 目前有兩個 Python 服務，共用同一個虛擬環境：

- `server/`：FastAPI 行程生成與 PDF 匯出 API
- `Database/backend/`：Django + DRF 推薦與資料查詢 API

前端在 `front/`。

## 統一 Python 環境

請在 repo root 建立單一 `.venv`，兩個後端都共用這一份：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

如果之後都在這個 repo 開發，先做：

```bash
source .venv/bin/activate
```

## 啟動 FastAPI (`server/`)

先準備 `server/.env`：

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

啟動：

```bash
cd server
uvicorn server:app --reload --port 8001
```

如果 PDF 匯出時遇到 event loop 問題，可改用：

```bash
uvicorn server:app --loop asyncio --port 8001
```

## 啟動 Django 推薦 API (`Database/backend/`)

如果資料檔還沒解壓縮，先在 repo root 執行：

```bash
unzip japan_restaurant_with_rating_interest.json.zip
unzip japan_with_rating_interest.json.zip
```

```bash
cd Database/backend
python manage.py migrate
```

第一次才要做
```bash
python manage.py import_pois ../../japan_with_rating_interest.json --sync
python manage.py import_restaurants ../../japan_restaurant_with_rating_interest.json --sync
```

啟動DB
```bash
python manage.py runserver
```

Django 預設網址：

- [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- [http://127.0.0.1:8000/api/metadata/](http://127.0.0.1:8000/api/metadata/)
- [http://127.0.0.1:8000/api/pois/](http://127.0.0.1:8000/api/pois/)
- [http://127.0.0.1:8000/api/restaurants/](http://127.0.0.1:8000/api/restaurants/)

## 設定前端
第一次需填入your_google_maps_api_key
```bash
cd front
cp .env.example .env
```
填入VITE_GOOGLE_MAPS_API_KEY

## 啟動前端

```bash
cd front
npm install
npm run dev
```

前端預設網址：

- [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
