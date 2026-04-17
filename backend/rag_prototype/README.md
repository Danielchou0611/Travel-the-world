# Week 2 RAG Prototype

此資料夾對應 `JapanTravelPlanningApp.md` 的 Week 2 任務：
- Gemini Embedding
- ChromaDB 向量儲存與檢索
- 萃取景點名稱
- 提供前端可呼叫的 API

## 1) 安裝
```bash
cd backend/rag_prototype
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) 設定環境變數
1. 複製 `.env.example` 為 `.env`
2. 填入 `GEMINI_API_KEY`
3. 可選模型設定：
   - `GEMINI_EMBED_MODEL`（預設 `models/gemini-embedding-001`）
   - `GEMINI_GEN_MODEL`（預設 `models/gemini-2.5-flash`）

## 3) CLI 測試
```bash
python rag_week2.py --file sample_article.txt --reset-db
```

## 4) 啟動 API（給 React 前端）
```bash
uvicorn api_server:app --host 127.0.0.1 --port 8010
```

可用端點：
- `GET /health`
- `POST /api/rag/extract`

POST 範例 body：
```json
{
  "text": "東京行程包含淺草寺、晴空塔與上野公園",
  "query": "請列出文章中的旅遊景點名稱",
  "top_k": 4,
  "reset_db": false
}
```
