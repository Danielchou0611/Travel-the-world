# RAG Prototype 與推薦 API 串接說明

這個資料夾是旅遊文章 RAG 原型，負責從使用者貼上的旅遊文章或 URL 中抽取景點、餐廳名稱，並串接 `Travel-the-world-Gary` 的 POI / Restaurant API，補上評分、評論數、座標、圖片、分類與來源段落，最後提供給前端地圖規劃頁使用。

## 架構

主要流程：

1. 前端 `src/pages/MapPlanningPage.jsx` 呼叫 RAG API：
   `POST http://127.0.0.1:8010/api/rag/extract`
2. RAG API 使用 `rag_week2.py`：
   - 切分文章 chunks
   - 使用 Ollama embedding 建立 ChromaDB 檢索
   - 使用 Ollama generation 抽取景點 / 餐廳名稱
3. `api_server.py` 清理名稱並建立行程分組。
4. `api_server.py` 串接 `Travel-the-world-Gary/backend`：
   - 景點 POI：`GET /api/pois/?search=...`
   - 餐廳 POI：`GET /api/restaurants/?search=...`
5. RAG API 回傳前端可直接使用的 `spots`、`itinerary_groups`、`debug_metrics`。

## 相關服務

| 服務 | 預設網址 | 角色 |
|---|---|---|
| Ollama | `http://127.0.0.1:11434` | embedding 與 generation 模型 |
| Gary Django API | `http://127.0.0.1:8000` | POI / restaurant 資料庫 API |
| RAG FastAPI | `http://127.0.0.1:8010` | 文章抽取、RAG、POI enrich API |
| Vite frontend | `http://127.0.0.1:5173` | 地圖規劃 UI |


## 安裝 RAG 環境

```bash
cd backend/rag_prototype
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 安裝與啟動 Ollama

請先安裝 Ollama，並確認服務在 `http://127.0.0.1:11434`。

建議模型：

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:7b-instruct
```

## 環境變數

可在專案根目錄或 `backend/rag_prototype` 放 `.env`。

常用設定：

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_GEN_MODEL=qwen2.5:7b-instruct

RAG_CHROMA_DIR=./chroma_store
RAG_COLLECTION_NAME=japan_guides_week2
RAG_MAX_CHUNKS_PER_PROMPT=10
RAG_URL_FETCH_MAX_BYTES=4000000
RAG_URL_MIN_TOP_K=50
RAG_URL_READ_FULL_DOCUMENT=false

POI_API_BASE_URL=http://127.0.0.1:8000
POI_LOOKUP_PAGE_SIZE=20
POI_LOOKUP_TIMEOUT_SECONDS=5
POI_LOOKUP_MAX_QUERIES=18

RAG_ITINERARY_MIN_SPOTS=3
RAG_DAY_GROUP_MIN_SPOTS=2
RAG_MERGE_CONSECUTIVE_DAY_GROUPS=true
```

前端使用的 RAG API 位置設定在根目錄 `.env.example`：

```env
VITE_RAG_API_BASE_URL=http://127.0.0.1:8010
```

## Gary Django API 串接

RAG API 會透過 `POI_API_BASE_URL` 串接 `Travel-the-world-Gary/backend`。

啟動 Gary API：

```bash
cd Travel-the-world-Gary
.venv\Scripts\activate
cd backend
python manage.py runserver
```

預設會跑在：

```text
http://127.0.0.1:8000
```

### 景點 POI API

RAG 會用景點名稱查：

```text
GET /api/pois/?search={name}&page_size=20
```

支援參數：

- `region`
- `category`
- `search`
- `interests`
- `ordering`
- `page`
- `page_size`

主要回傳欄位：

- `id`
- `name`
- `region`
- `category`
- `interests`
- `google_rating`
- `review_count`
- `static_score`
- `distance_to_station_km`
- `station_anchor`
- `lat`
- `lng`
- `image_url`
- `google_name_matched`

### 餐廳 POI API

RAG 會優先用餐廳名稱查：

```text
GET /api/restaurants/?search={name}&page_size=20
```

支援參數：

- `region`
- `category`
- `venue_type`
- `search`
- `ordering`
- `page`
- `page_size`

主要回傳欄位：

- `id`
- `name`
- `region`
- `category`
- `venue_type`
- `interests`
- `google_rating`
- `review_count`
- `static_score`
- `distance_to_station_km`
- `station_anchor`
- `lat`
- `lng`
- `image_url`
- `google_name_matched`
- `raw_type`

### 餐廳名稱查詢補強

餐廳名稱常會出現完整分店名、繁簡字、日文漢字差異或食品類別詞，例如：

- `一蘭拉麵新宿中央東口店`
- `淺草今半國際通本店`
- `山本屋總本家本家`
- `CoCo壱番屋浪速区難波中一丁目店`

`api_server.py` 會自動產生多組查詢：

- 品牌名：`一蘭`
- 日文名稱：`浅草今半`
- 品牌 + 分店：`一蘭 新宿中央東口店`
- 簡化分店：`一蘭 新宿中央東口`
- 繁簡 / 日文漢字變體：`總 -> 総`、`壽司 -> 寿司`、`拉麵 -> ラーメン`

查詢順序是：

1. `restaurants` endpoint
2. 若餐廳查不到，再退回 `pois` endpoint

命中後會標記：

- `matchSourceType: "restaurant"`：餐廳資料庫命中
- `matchSourceType: "poi"`：一般景點 POI 命中

## 啟動 RAG API

```bash
cd backend/rag_prototype
.venv\Scripts\activate
uvicorn api_server:app --host 127.0.0.1 --port 8010
```

健康檢查：

```text
GET /health
```

會回傳 Ollama base URL、模型清單與 Ollama 是否可用。

## RAG Extract API

Endpoint：

```text
POST /api/rag/extract
```

Request body：

```json
{
  "text": "東京三日行程：DAY1 到淺草寺，中午吃淺草今半，晚上去東京晴空塔。",
  "url": "",
  "query": "請列出文章中的旅遊景點與餐廳名稱",
  "top_k": 4,
  "reset_db": false,
  "debug": true
}
```

欄位說明：

- `text`：直接輸入旅遊文章。
- `url`：若沒有 `text`，可提供文章 URL，RAG API 會抓取 HTML 並抽純文字。
- `query`：抽取任務，例如「列出旅遊景點」或「列出餐廳」。
- `top_k`：向量檢索取回 chunks 數。
- `reset_db`：是否重建 Chroma collection。
- `debug`：是否回傳 debug samples。

Response 重要欄位：

```json
{
  "provider": "ollama",
  "input_source": "text",
  "spot_names": ["淺草寺", "淺草今半", "東京晴空塔"],
  "spots": [
    {
      "schema": "rag_enriched_spot_v1",
      "name": "淺草今半",
      "extracted_name": "淺草今半",
      "matchedName": "浅草今半 国際通り本店",
      "area": "東京都",
      "rating": "4.3",
      "reviewsCount": 1234,
      "tags": ["壽喜燒", "餐廳"],
      "position": {
        "lat": 35.0,
        "lng": 139.0
      },
      "imageUrl": "https://example.com/image.jpg",
      "source": "RAG chunk #1; restaurant database match",
      "sourceExcerpt": "中午吃淺草今半，晚上去東京晴空塔",
      "dataInsufficient": false,
      "matchSourceType": "restaurant",
      "poi": {
        "id": "restaurant_id",
        "name": "浅草今半 国際通り本店",
        "category": "壽喜燒",
        "venue_type": "餐廳",
        "source_type": "restaurant"
      },
      "restaurant": {
        "id": "restaurant_id",
        "name": "浅草今半 国際通り本店",
        "raw_type": "すき焼き"
      },
      "poiMatch": {
        "matched": true,
        "query": "浅草今半",
        "apiBaseUrl": "http://127.0.0.1:8000",
        "endpoint": "restaurants",
        "sourceType": "restaurant"
      },
      "restaurantMatch": {
        "matched": true,
        "query": "浅草今半",
        "apiBaseUrl": "http://127.0.0.1:8000",
        "endpoint": "restaurants"
      }
    }
  ],
  "itinerary_groups": [
    {
      "group_id": "group-1",
      "title": "DAY1",
      "spot_names": ["淺草寺", "淺草今半", "東京晴空塔"],
      "spot_count": 3,
      "chunk_indices": [1]
    }
  ],
  "debug_metrics": {
    "matched_count": 3,
    "poi_matched_count": 2,
    "restaurant_matched_count": 1,
    "lookup_unmatched_count": 0
  }
}
```

## 前端串接

前端檔案：

```text
src/pages/MapPlanningPage.jsx
```

前端會讀取：

```js
import.meta.env.VITE_RAG_API_BASE_URL || "http://127.0.0.1:8010"
```

前端送出：

```js
fetch(`${ragApiBaseUrl}/api/rag/extract`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text,
    url,
    query: "請列出文章中的旅遊景點名稱",
    top_k: 4,
    reset_db: false
  })
})
```

前端主要使用 response：

- `spot_names`：建立地圖推薦清單。
- `spots`：每個景點 / 餐廳的 enriched payload。
- `spots[].position`：地圖座標。
- `spots[].rating`、`reviewsCount`、`imageUrl`：卡片資訊。
- `spots[].poiMatch`：顯示是否成功匹配 Gary POI API。
- `itinerary_groups`：讓前端依 DAY 或行程段落篩選。
- `embed_model`、`gen_model`、`generation_warning`：顯示模型與警告資訊。

## CLI 測試

直接跑 RAG prototype：

```bash
cd backend/rag_prototype
.venv\Scripts\activate
python rag_week2.py --file sample_article.txt --reset-db
```

## 評估

### 檔案

- `eval_ragas.py`：評估 runner。
- `eval_seed_questions.jsonl`：一般景點測試資料。
- `eval_seed_questions_restaurants.jsonl`：餐廳行程測試資料。
- `requirements-eval.txt`：RAGAS 選用依賴。
- `eval_outputs/`：輸出 summary 與 samples。

### 跑一般景點評估

```bash
python eval_ragas.py --dataset eval_seed_questions.jsonl --api-base http://127.0.0.1:8010 --debug
```

### 跑餐廳 POI 評估

```bash
python eval_ragas.py --dataset eval_seed_questions_restaurants.jsonl --api-base http://127.0.0.1:8010 --debug
```

會輸出：

- `eval_outputs/rag_eval_samples_*.jsonl`
- `eval_outputs/rag_eval_summary_*.json`

summary 重要指標：

- `spot_precision_avg`
- `spot_recall_avg`
- `spot_f1_avg`
- `poi_match_rate`
- `poi_match_quality_score`
- `poi_enrichment_score`
- `poi_integration_score`
- `restaurant_matched_count`
- `unmatched_details`

### 跑 RAGAS

需要 `OPENAI_API_KEY`：

```bash
pip install -r requirements-eval.txt
set OPENAI_API_KEY=your_key_here
python eval_ragas.py --dataset eval_seed_questions.jsonl --run-ragas --eval-model gpt-4o-mini --eval-embedding-model text-embedding-3-small
```

RAGAS summary 會包含：

- `faithfulness`
- `answer_relevancy`
- `context_precision`
- `context_recall`

## 常見問題

### `poi_match_rate` 很低

請確認 Gary Django API 有啟動，且 `POI_API_BASE_URL` 指向正確：

```text
http://127.0.0.1:8000
```

也可以直接測：

```text
http://127.0.0.1:8000/api/pois/?search=東京&page_size=5
http://127.0.0.1:8000/api/restaurants/?search=一蘭&page_size=5
```

### 餐廳名稱抽得到但餐廳 POI 查不到

可能原因：

- Gary restaurant DB 沒有該店。
- 名稱被模型轉成音譯或亂碼。
- 分店名稱和資料庫名稱差太多。

目前 `api_server.py` 已有餐廳別名與降階查詢，可繼續補：

- `RESTAURANT_QUERY_VARIANT_MAP`
- `RESTAURANT_CHAIN_ALIASES`

### 前端沒有吃到 RAG API

檢查根目錄 `.env`：

```env
VITE_RAG_API_BASE_URL=http://127.0.0.1:8010
```

修改後需重啟 Vite。

### 修改 RAG API 後結果沒變

請重啟 FastAPI：

```bash
cd backend/rag_prototype
.venv\Scripts\activate
uvicorn api_server:app --host 127.0.0.1 --port 8010
```
