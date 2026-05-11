# Demo Web

這個目錄是用來測試 recommendation backend API 的前端頁面。

目前 `demo-web` 不再讀取本地 JSON，會直接呼叫以下 API：

- `GET /api/metadata/`
- `GET /api/pois/`
- `GET /api/pois/{poi_id}/`
- `GET /api/users/{user_id}/preferences/`
- `PUT /api/users/{user_id}/preferences/`
- `POST /api/recommendations/`

## 1. 先啟動 Backend

先安裝 backend 依賴：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

初始化資料庫並匯入景點資料：

```bash
cd backend
python manage.py migrate
python manage.py import_pois ../japan_with_rating_interest.json
```

如果你還沒有測試使用者，可以先建立一個：

```bash
python manage.py create_test_user --username gary --password 123456
```

啟動 backend：

```bash
python manage.py runserver
```

預設 API 位置會是：

```text
http://127.0.0.1:8000/api
```

## 2. 再開 Demo Web

回到 `demo-web` 目錄，用任一個靜態 server 開啟：

```bash
cd ../demo-web
python3 -m http.server 4173
```

然後在瀏覽器打開：

```text
http://127.0.0.1:4173
```

頁面上的 `API Base` 預設就是：

```text
http://127.0.0.1:8000/api
```

如果你的 backend 不在 8000 port，改掉頁面上方的 `API Base` 後按 `套用 API Base` 即可。

你也可以直接用 query string 指定：

```text
http://127.0.0.1:4173/?apiBase=http://127.0.0.1:8000/api
```

## 3. 頁面可以測什麼

### API 基本功能

- `重新同步資料`：測 `metadata` + `pois`
- 地區、類別、搜尋、排序：測 `pois` query params
- 點卡片展開詳細資訊：測 `poi detail`

目前 `demo-web` 會用 `page_size=5000` 向 `pois` API 一次抓完整列表，避免 DRF 預設 20 筆一頁時產生大量分頁 request。

### 使用者偏好

- `User ID` 輸入測試帳號 id
- `讀取已存偏好`：測 `GET /api/users/{user_id}/preferences/`
- `儲存偏好`：測 `PUT /api/users/{user_id}/preferences/`

### 推薦功能

- 調整 `旅遊地區`
- 調整 `景點類別`
- 調整 `推薦數量`
- 設定 `興趣權重`
- `用表單偏好推薦`：直接送 `preferences` 給 recommendation API
- `用 user id 推薦`：用資料庫裡已儲存的 profile 查推薦

## 4. 建議測試流程

1. 先按 `重新同步資料`
2. 隨便選一個地區與類別，確認景點有正常出來
3. 點一張卡片，展開詳細資訊，確認 detail API 正常
4. 用 `User ID` 載入已儲存偏好
5. 修改幾個興趣權重後按 `儲存偏好`
6. 按 `用表單偏好推薦`
7. 再按 `用 user id 推薦`
8. 切換 `全部景點 / 推薦結果` 比較排序差異

## 5. 常見問題

### 頁面顯示「資料載入失敗」

通常是以下原因：

- backend 還沒啟動
- `API Base` 填錯
- backend 還沒 `import_pois`

### 推薦 API 回傳沒有資料

先檢查：

- `travel_region` 是否真的有資料
- `category` 是否過濾太嚴
- `top_k` 是否合理

### 讀取偏好失敗

代表該 `user_id` 目前沒有 preference profile。

可以先按一次 `儲存偏好`，之後再讀取。
