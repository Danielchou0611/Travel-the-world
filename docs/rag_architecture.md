# 🔍 RAG Architecture — Placeholder

> **此檔為占位骨架。** 正式內容由 **顏伯亨** 負責撰寫。  
> 伯亨請將 Week 1 完成的 RAG 架構文件內容整合進本檔。

---

## 1. 系統目標

RAG 子系統負責 **Plus 2** 功能：使用者貼入攻略 URL 或純文字 → 萃取景點 → 建議加入行程。

---

## 2. 架構總覽

```
User Input (URL / Text)
      │
      ▼
[Chunker]  chunk_size=300–500
      │
      ▼
[Embedder]  Gemini text-embedding-004
      │
      ▼
[Vector Store]
  Dev: ChromaDB (local)
  Prod: pgvector (Railway Postgres)
      │
      ▼
[Retriever]  top_k=5
      │
      ▼
[LLM Matcher]  Gemini 1.5 Flash
  輸入：retrieved chunks + 景點主檔
  輸出：matched_attraction_id + confidence
      │
      ▼
API Response (with source_chunk for XAI traceability)
```

---

## 3. 關鍵設計

### 3.1 Chunk 策略
- 大小：300–500 字元（中文）
- Overlap：50 字元
- 理由：景點介紹通常 1 段 300–500 字，避免切斷語意

### 3.2 Embedding 模型
- `text-embedding-004`（Gemini 系列）
- 維度：768
- 為何不用 OpenAI：與 LLM 同一家，embedding 與生成一致性較好

### 3.3 Top-k 調優
- 目前 `k=5`
- 曾測試 k=3（不夠）、k=10（噪音太多）

### 3.4 XAI 要求
每個 matched_attraction 必須回傳：
- `source_chunk`：原文片段
- `chunk_index`：在原文中的位置
- `confidence`：matcher 的信心分數

---

## 4. 驗收情境

| 情境 | 輸入 | 期望輸出 |
|------|------|---------|
| 清晰文本 | 「早上去清水寺...」 | 匹配到清水寺 id，confidence > 0.9 |
| 模糊文本 | 「去那個有舞台的寺廟」 | 匹配清水寺但 confidence 0.6–0.8 |
| 不存在景點 | 「去我家的後院」 | 回空 list + confidence_note |
| 多景點混合 | 完整攻略 | 各自匹配，順序保留 |

---

## 5. 已知問題

（待伯亨補上 Week 1–2 的調優紀錄）

---

## 6. 相關檔案

- Backend service：`trips/services/rag_service.py`
- API endpoint：`POST /api/rag/extract/`（見 `docs/API_Contract_v1.md`）
- Frontend 元件：`src/components/RAGInput.tsx`

---

*伯亨：Week 1 的架構討論文件請整合進本檔，並把本 placeholder 的提示段落刪除。*
