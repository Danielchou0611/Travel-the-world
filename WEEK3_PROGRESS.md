# Week 3 進度對照

依照 `JapanTravelPlanningApp.md` Week 3 任務，已新增以下功能：

## 1) 前端貼 URL 或文字 -> 後端萃取景點 -> 前端可加入行程
- 前端：`src/pages/MapPlanningPage.jsx`
  - 新增攻略 `URL` 輸入欄位
  - 支援 `text / url` 任一輸入送往 `/api/rag/extract`
  - 萃取結果每筆都有「加入行程」按鈕
  - 新增「我的行程」清單（可移除、可清空、可全部加入）
- 後端：`backend/rag_prototype/api_server.py`
  - `ExtractRequest` 支援 `text` 與 `url`
  - 若提供 URL，後端會抓取網頁並抽取可讀文字後進行 RAG

## 2) XAI 可解釋性
- 後端回傳每個景點的來源資訊：
  - `source_chunk_index`
  - `source_excerpt`
  - `xai`（例：`此景點來源：攻略文章第3段`）
- 前端在景點卡與地圖資訊窗都會顯示來源說明

## 3) 地圖動線優化（Directions API）
- `src/components/map/GoogleMapPanel.jsx`
  - 新增 `routeSpots` 參數
  - 行程景點 >= 2 時，自動呼叫 Directions API 繪製建議路線
  - 使用 `optimizeWaypoints: true`

## 4) 景點資料不足警示（評論數 < 50）
- 後端回傳：
  - `reviews_count`
  - `is_data_insufficient`
- 前端顯示：
  - 若 `< 50` 則顯示 `資料較少（N）`
  - 同步顯示於地圖資訊窗

## 5) 其他調整
- `backend/rag_prototype/rag_week2.py`
  - chunk 切分改為優先「段落切分」，讓 XAI 的「第 N 段」更合理
  - 強化模型輸出景點名稱清洗
- `src/styles.css`
  - 新增 URL 欄位、行程清單、來源片段與操作區樣式

## 驗證結果
- `python -m py_compile backend/rag_prototype/rag_week2.py backend/rag_prototype/api_server.py`：通過
- `npm run build`：通過

## 補充：RAG Provider 已改為 Ollama（本機）
- 由於 Gemini embedding quota 觸發 429，已將 RAG provider 改為 Ollama。
- 後端不再依賴 `GEMINI_API_KEY`，改為：
  - `OLLAMA_BASE_URL`
  - `OLLAMA_EMBED_MODEL`
  - `OLLAMA_GEN_MODEL`
- 對應檔案：
  - `backend/rag_prototype/rag_week2.py`
  - `backend/rag_prototype/api_server.py`
  - `backend/rag_prototype/.env.example`
  - `backend/rag_prototype/README.md`

## 補充：Demo網站
- https://osaka.letsgojp.com/archives/344905/
- https://kyushu.letsgojp.com/archives/350621/
