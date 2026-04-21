# 🔌 API Contract v1 — Japan Travel App

> 前後端對接的單一真實來源  
> 修改需通知：周珥豪（後端）、王孟蘋（前端）、周宜學（PM）  
> Base URL：`http://localhost:8000/api/`（dev）/ Railway domain（prod）  
> 認證：JWT（`Authorization: Bearer <token>`）— 除 `/auth/` 外所有 endpoint 需認證

---

## 📑 Endpoint 清單

| Method | Path | Owner | 狀態 | 用途 |
|--------|------|-------|------|------|
| POST | `/api/auth/register/` | 珥豪 | ⬜ | 註冊 |
| POST | `/api/auth/login/` | 珥豪 | ⬜ | 登入（回 JWT） |
| POST | `/api/auth/refresh/` | 珥豪 | ⬜ | Refresh token |
| GET | `/api/trips/` | 珥豪 | ⬜ | 列出使用者所有行程 |
| POST | `/api/trips/` | 珥豪 | ⬜ | 建立新行程（僅 metadata） |
| GET | `/api/trips/{id}/` | 珥豪 | ⬜ | 取得單一行程詳情 |
| PATCH | `/api/trips/{id}/` | 珥豪 | ⬜ | 更新行程 metadata |
| DELETE | `/api/trips/{id}/` | 珥豪 | ⬜ | 刪除行程 |
| POST | `/api/trips/{id}/generate/` | 晨楷 | ⬜ | **Core 1**：呼叫 Gemini 生成行程（含 XAI） |
| PATCH | `/api/trips/{id}/items/` | 珥豪 | ⬜ | **Core 2**：批次更新行程項目（拖拉後） |
| POST | `/api/trips/{id}/items/` | 珥豪 | ⬜ | 新增自訂景點到行程 |
| DELETE | `/api/trips/{id}/items/{item_id}/` | 珥豪 | ⬜ | 刪除行程項目 |
| GET | `/api/attractions/?q=` | 珥豪 | ⬜ | 搜尋景點（Places API 包一層） |
| GET | `/api/attractions/{id}/` | 珥豪 | ⬜ | 景點詳情（含 XAI 評分因子） |
| POST | `/api/rag/extract/` | 伯亨 | ⬜ | **Plus 2**：貼入攻略文字 → 萃取景點 |
| POST | `/api/trips/{id}/chat/` | 晨楷 | ⬜ | **Plus 1**：AI 助手問答 |

---

## 🔑 核心 Endpoint 詳細 Schema

### `POST /api/trips/{id}/generate/` — AI 行程生成（含 XAI）

**Request**
```json
{
  "days": 5,
  "budget": 80000,
  "preferences": {
    "pace": "relaxed",
    "interests": ["culture", "food", "nature"],
    "start_city": "Tokyo"
  }
}
```

**Response 200**
```json
{
  "trip_id": 42,
  "days": [
    {
      "day_index": 1,
      "date": "2026-06-10",
      "items": [
        {
          "id": 101,
          "order": 1,
          "attraction": {
            "id": 5001,
            "name": "淺草寺",
            "lat": 35.7148,
            "lng": 139.7967,
            "google_rating": 4.5,
            "review_count": 120000
          },
          "start_time": "09:00",
          "end_time": "10:30",
          "xai_reason": "淺草寺符合你的『文化』興趣（貢獻 25%），Google 評分 4.5 且評論數高（貢獻 40%），與下個景點動線順（貢獻 10%）",
          "xai_factors": {
            "google_rating": 0.40,
            "review_count": 0.25,
            "interest_match": 0.25,
            "route_efficiency": 0.10
          },
          "confidence": 0.92
        }
      ]
    }
  ],
  "warnings": [
    { "type": "dense_day", "day_index": 3, "message": "Day 3 有 5 個景點，行程過密" }
  ],
  "meta": {
    "llm_model": "gemini-1.5-flash",
    "generation_time_ms": 3240
  }
}
```

**Error 422** — Gemini JSON schema 驗證失敗（重試 3 次後）
```json
{ "error": "llm_schema_invalid", "detail": "..." }
```

---

### `GET /api/attractions/{id}/` — 景點詳情（XAI Layer 1 因子）

**Response 200**
```json
{
  "id": 5001,
  "name": "淺草寺",
  "name_en": "Sensoji Temple",
  "city": "Tokyo",
  "lat": 35.7148,
  "lng": 139.7967,
  "google_rating": 4.5,
  "review_count": 120000,
  "categories": ["culture", "temple"],
  "price_estimate_jpy": 0,
  "duration_minutes": 90,
  "xai_factors": {
    "base_score": 0.87,
    "breakdown": {
      "google_rating": { "value": 4.5, "weight": 0.4, "contribution": 0.36 },
      "review_count": { "value_log": 11.7, "weight": 0.3, "contribution": 0.27 },
      "interest_match": { "value": 1.0, "weight": 0.2, "contribution": 0.20 },
      "route_efficiency": { "value": 0.4, "weight": 0.1, "contribution": 0.04 }
    }
  }
}
```

---

### `POST /api/rag/extract/` — RAG 攻略轉行程

**Request**
```json
{ "source_type": "text", "content": "京都一日遊：早上去伏見稻荷..." }
```

**Response 200**
```json
{
  "extracted_attractions": [
    {
      "name": "伏見稻荷大社",
      "matched_attraction_id": 5302,
      "confidence": 0.94,
      "source_chunk": "早上去伏見稻荷...",
      "source_chunk_index": 0
    }
  ],
  "meta": {
    "chunks_processed": 4,
    "embedding_model": "text-embedding-004"
  }
}
```

---

## 📋 全域錯誤格式

```json
{ "error": "error_code", "detail": "人類可讀訊息", "field_errors": { "field_name": ["..."] } }
```

常見 error_code：`validation_error`、`unauthorized`、`forbidden`、`not_found`、`llm_schema_invalid`、`external_api_error`、`rate_limited`

---

## 🚧 變更紀錄

| 版本 | 日期 | 變更 | 誰 |
|------|------|------|-----|
| v1.0 | 2026/04/13 | 初版凍結，6 個核心 endpoint | 宜學 |

---

*任何欄位變動必須：1) 更新本文件、2) 同步通知珥豪與孟蘋、3) 更新對應的 mock data。*
