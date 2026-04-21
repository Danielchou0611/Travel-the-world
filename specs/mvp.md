# 🎯 MVP Scope Spec — Japan Travel App

> 本專案「什麼要做 / 什麼不做」的正式定義  
> 修改需組員共識，不得單方更動

---

## 為何這份 spec 存在？

期末只有 5 週，人力有限。必須清楚切出：
- **Core**（3 個）：展示不能少
- **Plus**（2 個）：有時間做，展示加分
- **Paid**（多個）：不做，放在商業模式一頁帶過

---

## Core 1 — AI 行程規劃（含 XAI）

**使用者故事**  
「我輸入天數（5 天）、預算（8 萬日圓）、偏好（文化 / 美食 / 放鬆），AI 幫我規劃，每個景點都告訴我為什麼推薦，我可以照接受，也可以調整。」

**技術流程**
1. Frontend 收集表單 → `POST /api/trips/` 建立空殼 → `POST /api/trips/{id}/generate/`
2. Backend 呼叫 Gemini（JSON mode + Pydantic schema）
3. Backend 為每個景點補上 `xai_reason` 與 `xai_factors`（由冠霖的評分公式計算）
4. 回傳完整行程 → Frontend 渲染 AttractionCard + XAIFactorChart

**驗收標準**
- [ ] 5 天行程 Gemini 回應時間 < 10 秒
- [ ] JSON schema 驗證失敗時自動重試，3 次後才回 error
- [ ] 每個景點必有 `xai_reason` 非空字串
- [ ] `xai_factors` 四個權重加總 = 1.0（±0.01 誤差）

**Owner**：晨楷（LLM）+ 珥豪（API）+ 冠霖（評分）

---

## Core 2 — 行程編輯器

**使用者故事**  
「AI 給的行程我不完全滿意，我想把 Day 2 的某個景點拖到 Day 3，或者刪掉它，或者自己加一個我想去的地方。」

**技術流程**
1. 拖拉：前端更新 state → debounce 1.5 秒 → `PATCH /api/trips/{id}/items/` 批次送
2. 刪除：`DELETE /api/trips/{id}/items/{item_id}/`
3. 新增：搜尋 `GET /api/attractions/?q=` → 選擇 → `POST /api/trips/{id}/items/`
4. 編輯後即時重算：總時數、總預算、動線距離（前端計算，不重打 Gemini）

**驗收標準**
- [ ] 拖拉後 UI 不閃爍、不跳位
- [ ] API 失敗時前端 rollback 並顯示錯誤
- [ ] 新增景點後自動更新總預算 / 時數

**Owner**：孟蘋（UI）+ 伯亨（元件）+ 冠霖（拖拉邏輯）

---

## Core 3 — 地圖動線視覺化

**使用者故事**  
「我想在地圖上看到這 5 天要去的所有景點，點擊看詳情，看出哪些景點離太遠。」

**技術流程**
1. Frontend 載入行程 → 用 Google Maps JS API 畫 marker
2. 不同天用不同顏色 marker
3. 每天內部用 polyline 連線，顯示順序
4. 點 marker → popup 顯示 AttractionCard 精簡版

**驗收標準**
- [ ] 景點 > 20 個時地圖仍流暢
- [ ] 不在地圖頁時不載入 Maps JS（省費用）
- [ ] popup 顯示 XAI 因子圖

**Owner**：珥豪（Maps API）+ 伯亨（地圖 UI）

---

## Plus 1 — AI 旅遊助手（若有時間）

**使用者故事**  
「行程我已經確認了，但我想問『淺草到新宿怎麼搭比較快』、『附近有什麼餐廳』。」

**技術流程**
- 對話 UI → `POST /api/trips/{id}/chat/`（帶行程 context + 對話歷史）
- Gemini 多輪對話，answer 中直接標出引用的景點 id

**Owner**：晨楷 + 珥豪　**風險**：若 Core 沒做完就不做

---

## Plus 2 — RAG 攻略轉行程（若有時間）

**使用者故事**  
「我找到一篇 Reddit 日本攻略，貼進去，你幫我抓出景點加進行程。」

**技術流程**
- 貼入文字 / URL → `POST /api/rag/extract/`
- Gemini Embedding → ChromaDB 找最相近的景點 → 回傳 matched + confidence
- 使用者確認後加入行程

**Owner**：伯亨（RAG）+ 冠霖（資料對應）

---

## ❌ Out of Scope（明確不做，不要再討論）

- 即時機票、住宿訂房
- 語音輸入、相機翻譯
- 多人協作共編
- 社群功能（評論、追蹤）
- 付費版功能（見 CLAUDE.md Paid Features）

---

## 📅 MVP 完成節點

- **Week 3 end (4/20)**：Core 1 + Core 2 可用（有 mock data 或真資料皆可）
- **Week 4 end (4/27)**：Core 3 上線，Plus 1 / 2 至少做一個
- **Week 5 (4/28–6/7)**：整合測試、bug fix、部署
- **6/8**：期末展示
