# Week 2 進度對照

依照 `JapanTravelPlanningApp.md` Week 2 任務，已新增以下程式碼：

## 1) 地圖頁面（Google Maps + Marker + Popup）
- `src/components/map/GoogleMapPanel.jsx`
- `src/lib/googleMapsLoader.js`
- `src/pages/MapPlanningPage.jsx`（改為可餵地圖座標資料）
- `src/styles.css`（地圖畫布與 InfoWindow 樣式）
- `.env.example`（`VITE_GOOGLE_MAPS_API_KEY` / `VITE_RAG_API_BASE_URL`）

我地圖是用這個：
https://mapsplatform.google.com/intl/zh-TW_tw/maps-demo-key/

功能完成：
- 嵌入 Google Maps
- 顯示景點 marker
- 點擊 marker 顯示 popup（名稱、評分、推薦原因）
- 左側景點卡與右側地圖可互相同步焦點

## 2) RAG Prototype（Gemini Embedding + ChromaDB）
- `backend/rag_prototype/rag_week2.py`
- `backend/rag_prototype/api_server.py`
- `backend/rag_prototype/requirements.txt`
- `backend/rag_prototype/.env.example`
- `backend/rag_prototype/sample_article.txt`
- `backend/rag_prototype/README.md`

功能完成：
- 攻略文字切塊
- 使用 `models/gemini-embedding-001` 產生向量
- 寫入 ChromaDB（本機持久化）
- 查詢檢索後呼叫 Gemini 輸出景點名稱清單
- 提供 `POST /api/rag/extract` 給前端呼叫

## 3) 前後端整合（可貼攻略驗證萃取）
- `src/pages/MapPlanningPage.jsx` 已改為呼叫 `POST /api/rag/extract`
- 可直接貼入攻略文字，顯示萃取出的景點名稱清單
- 萃取結果會同步到 Google Maps marker 顯示

## 前端啟動
```bash
npm run dev
```

## RAG Prototype 測試
```bash
cd backend/rag_prototype
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python rag_week2.py --file sample_article.txt --reset-db
```

## 啟動 RAG API（給前端）
```bash
cd backend/rag_prototype
.venv\Scripts\activate
uvicorn api_server:app --host 127.0.0.1 --port 8010
```

https://www.weya.com.tw/design/google-map-api-key
