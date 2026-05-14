# Week 3 RAG Prototype (Ollama)

此資料夾目前改為本機 Ollama 版本：
- Ollama Embedding（本機，不吃 Gemini 配額）
- ChromaDB 向量儲存與檢索
- 萃取景點名稱
- 提供前端可呼叫的 API

## 1) 安裝 Python 依賴
```bash
cd backend/rag_prototype
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) 安裝並啟動 Ollama
先確認本機有安裝 Ollama，且服務正在跑（預設 `http://127.0.0.1:11434`）。

拉模型（至少一個 embedding + 一個 generation）：
```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:7b-instruct
```

## 3) 設定環境變數
1. 複製 `.env.example` 為 `.env`
2. 可選調整：
   - `OLLAMA_BASE_URL`（預設 `http://127.0.0.1:11434`）
   - `OLLAMA_EMBED_MODEL`（預設 `nomic-embed-text`）
   - `OLLAMA_GEN_MODEL`（預設 `qwen2.5:7b-instruct`）
   - `RAG_URL_FETCH_MAX_BYTES`（預設 `4000000`，URL 抓取最大 bytes）
   - `RAG_MAX_CHUNKS_PER_PROMPT`（預設 `10`，長文分批抽取每批段落數）
   - `RAG_ITINERARY_MIN_SPOTS`（預設 `2`，行程分組最少景點數）

> URL 模式會啟用全文掃描（`read_full_document`），避免只取前幾段造成景點遺漏。

## 4) CLI 測試
```bash
python rag_week2.py --file sample_article.txt --reset-db
```

## 5) 啟動 API（給 React 前端）
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
  "url": "",
  "query": "請列出文章中的旅遊景點名稱",
  "top_k": 4,
  "reset_db": false,
  "debug": true
}
```

回傳中會包含：
- `debug_metrics`：整體統計（chunk數、spot過濾前後、group合併前後）
- `debug_samples`：被過濾掉的景點樣本與原因、被丟棄的分組段落樣本

## 6) Evaluation (Recommendation 1: RAGAS)

This project now includes a practical evaluation harness so you can measure RAG quality before demo day.

### Files
- `eval_ragas.py`: evaluation runner
- `eval_seed_questions.jsonl`: seed questions dataset (JSONL)
- `requirements-eval.txt`: optional dependencies for RAGAS evaluation

### Install optional evaluation dependencies
```bash
pip install -r requirements-eval.txt
```

### Run backend API first
```bash
cd backend/rag_prototype
.venv\Scripts\activate
uvicorn api_server:app --host 127.0.0.1 --port 8010
```

### Run baseline evaluation (no RAGAS)
```bash
python eval_ragas.py --dataset eval_seed_questions.jsonl --api-base http://127.0.0.1:8010 --debug
```

Output files are written to `eval_outputs/`:
- `rag_eval_samples_*.jsonl`
- `rag_eval_summary_*.json`

### Run with RAGAS metrics (requires OPENAI_API_KEY)
```bash
set OPENAI_API_KEY=your_key_here
python eval_ragas.py --dataset eval_seed_questions.jsonl --run-ragas --eval-model gpt-4o-mini --eval-embedding-model text-embedding-3-small
```

RAGAS section in summary includes metrics like:
- `faithfulness`
- `answer_relevancy`
- `context_precision`
- `context_recall` (only if ground truth is provided)
