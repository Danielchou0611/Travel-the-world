# 🚀 期中考後 6 週衝刺計畫（4/28 – 6/8）

> PM 宜學　主文件　最後更新：2026/04/21  
> 對應課程：IM5068 Web APP 開發（何承遠）  
> 目的：期中考後的每週 × 每人任務拆解，讓每人 loading 均勻、每週產出精湛

---

## 🗓 時程總覽 — 6 週 × 6 人

| 週 | 日期 | 課程週次 | 課程進度 | 專案里程碑 | 週主題 |
|---|------|--------|---------|----------|-------|
| 1 | 4/28–5/4 | 第11週 | 專案資源與成本 / **作業5完成** | Core 1 端到端 | 後端骨架 + AI 生成跑通 |
| 2 | 5/5–5/11 | 第12週 | 專案計畫 / **作業6公布** | Core 2 完成 | 行程編輯器 ↔ API |
| 3 | 5/12–5/18 | 第13週 | PM 枚角 I | Core 3 + XAI 三層完整 | 地圖動線 + 可解釋性收尾 |
| 4 | 5/19–5/25 | 第14週 | PM 枚角 II / **作業6完成** | Plus 功能擇一 + 作業6 | 功能 polish + 作業 |
| 5 | 5/26–6/1 | 第15週 | **No Class**（衝刺週） | 部署 + QCQA + 報告初稿 | 上線、測試、寫報告 |
| 6 | 6/2–6/8 | 第16週 | **6/8 期末展示** | 彩排 + Demo | 最後 bug fix + 簡報 |

### 🎯 期末展示（6/8）要交的 4 樣東西（必看）

1. 課堂 Demo + 簡報（15 分鐘）
2. 期末報告（含可編輯檔）→ 上傳 NTU Cool
3. 程式碼 + 資料 → NTU Cool 或雲端連結
4. 給別組的評分建議（5% 含在總分裡）+ 組內互評

### 🏆 加分（可選）
老師說指導教授設定為「何承遠」並參加網站開發 / PM / 創業創新競賽，可加 1 學分 × 最多 3 次。
PM 宜學可幫大家鎖定 5–6 月仍開放報名的比賽。

---

## 📋 每週結束時必須完成（週交付物）

### Week 11（4/28–5/4）— 後端骨架 + AI 生成跑通 🔥關鍵週
**本週結束時：**
- [ ] Django 專案 init 完成，6 個 model（users / trips / attractions / itinerary_items / user_preferences / ai_sessions）migration 全部跑完
- [ ] JWT 登入 + refresh 可跑（Postman 驗收）
- [ ] `GET/POST/PATCH/DELETE /api/trips/` CRUD 完整
- [ ] `POST /api/trips/{id}/generate/` 串通 Gemini，回傳符合 API Contract 的 JSON（含 xai_reason、xai_factors）
- [ ] 評分公式 Python module + unit test（4 因子、權重和 = 1.0）
- [ ] **前端的 mock data 全部移除，接真 API 看得到 AI 推薦**
- [ ] 作業 5 完成交件

**Go/No-Go 檢查**：Core 1 可以端到端 demo 嗎？不行就砍 Plus 2。

---

### Week 12（5/5–5/11）— 行程編輯器 ↔ API 整合
**本週結束時：**
- [ ] 拖拉排序：`PATCH /api/trips/{id}/items/` 批次送（debounce 1.5s），失敗 rollback
- [ ] 刪除景點：`DELETE /api/trips/{id}/items/{item_id}/`
- [ ] 新增自訂景點：搜尋 `/api/attractions/?q=` → 選擇 → `POST items`
- [ ] What-if 滑桿前端即時重排（XAI Layer 2），不重打 Gemini
- [ ] Distance Matrix 批次模式、Places 24hr 快取
- [ ] 作業 6 公布後當日評估範圍，分工列出

---

### Week 13（5/12–5/18）— Core 3 + XAI 三層完整
**本週結束時：**
- [ ] Google Maps 顯示完整行程，每天不同顏色 marker，polyline 連線
- [ ] 點 marker 出 popup（景點名 + XAI 精簡因子圖）
- [ ] 景點 > 20 個仍流暢（實測驗收）
- [ ] **XAI Layer 3 全實作**：行程過密警示、資料不足警示、AI 低信心警示
- [ ] Persona 3 人 usability 測試初版（孟蘋）
- [ ] 報告 Section III（系統概述）草稿完成

---

### Week 14（5/19–5/25）— Plus 功能 + 作業6 + 報告中段
**本週結束時：**
- [ ] **Plus 1（AI 助手）或 Plus 2（RAG 攻略轉行程）擇一做到完整**，不兩個都做半套
- [ ] 作業 6 完成並上傳
- [ ] Section IV（設計決策與權衡）完成
- [ ] Section V（AI 角色與自主性）初稿
- [ ] Section VI（評估）初稿（含 Persona 測試 + 冠霖的評分資料）

---

### Week 15（5/26–6/1）— 部署 + QCQA + 報告初稿 🔥關鍵週（No Class）
**本週結束時：**
- [ ] Railway 後端部署（HTTPS、環境變數、CORS 設好）
- [ ] PlanetScale MySQL 連線穩定（django-environ + ssl-mode=REQUIRED）
- [ ] Vercel 前端部署（指到 Railway 後端 domain）
- [ ] **QCQA：golden path + 5 個邊界案例全跑過**（見最下方 QCQA 檢查清單）
- [ ] 期末報告 Section I–VI 完整，VII–VIII 初稿
- [ ] Demo script v1（宜學）
- [ ] 6/8 要上傳的資料整理進資料夾備用

---

### Week 16（6/2–6/8）— Demo 衝刺
**6/8 展示前必須：**
- [ ] 彩排 ×2（建議 6/3 週三、6/5 週五）
- [ ] Section VII–VIII 定稿，全報告校對一輪
- [ ] 簡報檔完成（15 分鐘嚴格 timer）
- [ ] 給他組的評分建議模板準備好
- [ ] NTU Cool 上傳：報告（可編輯檔）、程式碼、資料、Demo 影片備份
- [ ] **本機 fallback demo** 準備好（萬一網路斷線）
- [ ] 🎯 **6/8 18:25 上台**

---

## 👥 每人 × 每週 任務分配（轉 Google Sheet 用）

### 🔧 周珥豪 — 後端 / 部署 主責

| 週 | 必做 Must | 可做 Nice | 預估時數 |
|---|----------|---------|---------|
| W11 | Django init + 6 models + migrations + JWT + `/api/trips/` CRUD + `/api/attractions/?q=` | Daniel 分支的 47 縣市 JSON 合進 `data/japan_tourism/` | 12h |
| W12 | `PATCH items/` 批次 + `POST/DELETE items/` + Places API 24hr 快取 + Distance Matrix 批次 | 景點主檔自動同步排程 | 10h |
| W13 | Google Maps JS 前後端整合（config 由後端吐）+ `/api/attractions/{id}/` 含完整 xai_factors | — | 8h |
| W14 | Plus 1 或 Plus 2 的後端部分（聊天 endpoint 或 RAG extract） | 作業6 協助晨楷 | 10h |
| W15 | **Railway + PlanetScale + Vercel 全部上線**，含 sanity check | Cloudflare 基本防護 | 12h |
| W16 | 部署 bug fix、效能測試、NTU Cool 上傳程式碼 | Demo 技術支援 | 6h |

### 📋 周宜學 — PM / 後端協作 / 報告統籌

| 週 | 必做 | 可做 | 時數 |
|---|-----|-----|-----|
| W11 | 每週二 standup、Sheet 每週五更新、API Contract v1 凍結、協助珥豪 Django | 作業5 統籌 | 10h |
| W12 | standup、追 Editor 整合、Section III 草稿 | — | 10h |
| W13 | standup、Section III 完稿、Section IV 開工 | 找可報名的加分競賽 | 10h |
| W14 | standup、Section IV 完稿、**作業6 統籌交件**、Section VII 開工 | — | 12h |
| W15 | Demo script v1、Section VII-VIII 初稿、報告格式統整、NTU Cool 上傳 dry run | — | 14h |
| W16 | 彩排主持、報告定稿、互評統整、給他組建議 | — | 12h |

### 🎨 王孟蘋 — 前端 UIUX / 資料分析

| 週 | 必做 | 可做 | 時數 |
|---|-----|-----|-----|
| W11 | AttractionCard 接真 API、XAIFactorChart 元件（Layer 1 因子視覺化） | 載入狀態動畫 polish | 10h |
| W12 | 拖拉排序 UI（dnd-kit）+ debounce 送 API、What-if 滑桿連 Layer 2 邏輯 | — | 12h |
| W13 | Layer 3 警示 UI（行程過密 / 資料不足 / AI 低信心）、Persona usability 測試初版 | 手機版 responsive | 10h |
| W14 | 整合測試視覺 polish、usability 測試報告（Section VI 素材） | a11y 無障礙檢查 | 10h |
| W15 | 前端 QCQA、Section VI 完稿、修 bug | — | 10h |
| W16 | 彩排前端 demo 角色、fallback mock data 準備好 | — | 6h |

### 🗺 顏伯亨 — 前端地圖 / RAG

| 週 | 必做 | 可做 | 時數 |
|---|-----|-----|-----|
| W11 | MapView 接真 API、Marker 每天不同色、基本 popup | — | 8h |
| W12 | popup 含 XAI 精簡版、polyline 按日順序連線 | 點擊 marker 高亮對應景點卡片 | 10h |
| W13 | RAG backend `/api/rag/extract/` + 前端 `RAGInput` 元件 | Embedding 效能調優 | 12h |
| W14 | RAG 端到端測試（清晰 / 模糊 / 混合文）、confidence + source_chunk XAI 來源顯示 | RAG chunk 分段視覺化 | 12h |
| W15 | 地圖 + RAG QCQA、Section III 的 RAG 段落（協助宜學） | — | 10h |
| W16 | 彩排地圖 demo、RAG demo 用例準備 | — | 6h |

### 📊 李冠霖 — 評分系統 / 編輯器 / QCQA 協調

| 週 | 必做 | 可做 | 時數 |
|---|-----|-----|-----|
| W11 | 評分公式 Python module + unit test 鎖定、**Layer 1 因子 JSON schema 定稿** | — | 10h |
| W12 | 拖拉邏輯與孟蘋整合、即時重算（總時數 / 預算 / 距離） | — | 12h |
| W13 | **Persona × 行程 評估實驗**（3 persona × 5 組參數，記錄 XAI 因子分佈） | Persona 擴大到 10 人版 | 12h |
| W14 | 評估實驗報告 → Section VI 素材、作業6 的量化評估段落 | — | 10h |
| W15 | **QCQA 主持**（golden path + 5 邊界案例）、Section VI 完稿協助 | — | 10h |
| W16 | 彩排評估成果 slide、資料視覺化 | — | 6h |

### 🤖 溫晨楷 — LLM / Prompt 工程

| 週 | 必做 | 可做 | 時數 |
|---|-----|-----|-----|
| W11 | Gemini service 完整（JSON mode + retry ≤3 + Pydantic schema）、`generate/` endpoint 串通 | prompt A/B test | 12h |
| W12 | `xai_reason` 生成邏輯（連接冠霖因子分數）、prompt template 集中管理 | temperature 敏感度測試 | 10h |
| W13 | Plus 1 聊天 prompt + 多輪 state、**或** Plus 2 RAG matcher prompt | — | 12h |
| W14 | Plus 功能完整、`ai_sessions` 紀錄邏輯、成本統計 | 對話日誌分析圖 | 12h |
| W15 | LLM QCQA（schema 失敗率 < 5%）、**Section V 完稿**（AI 角色與自主性） | — | 10h |
| W16 | 彩排 AI demo 角色、LLM 備援（hardcoded response fallback） | — | 6h |

---

## 🔁 每週固定節奏

| 時間 | 活動 | 負責 | 時長 |
|-----|-----|-----|-----|
| 每週二 20:00 | Standup（每人 5 分鐘報告 + 卡點） | 宜學主持 | 30 分鐘 |
| 每週五 22:00 | Sheet 進度更新 deadline（每人自填當週狀態） | 宜學追 | 5 分鐘/人 |
| 每週日 20:00 | 週報產出 + 下週任務對齊 | 宜學 | 1 小時 |
| 遇到卡 4 小時 | 進卡關庫 + 在 Slack 求救 | 所有人 | — |

---

## ✅ QCQA 檢查清單（W15 執行）

老師明講「不要上台直接崩潰網站」，所以 QCQA 要紮實。冠霖主持，每人測自己模組：

### Golden Path（5 個必跑）
- [ ] 註冊 → 登入 → 看到空行程 → 填偏好 → AI 生成 5 天行程 → 看到 XAI 因子
- [ ] 拖拉景點 → API 更新成功 → 重整仍保留
- [ ] 刪除景點 → 即時重算預算
- [ ] 新增自訂景點 → 搜尋 → 選擇 → 加入成功
- [ ] 地圖 marker 點擊 → popup 正確

### Edge Cases（5 個邊界）
- [ ] 沒登入直接打 API → 401
- [ ] Gemini 回傳 invalid JSON → 重試 3 次後顯示友善錯誤
- [ ] 某天景點超過 4 個 → 黃色警示出現
- [ ] 景點資料不足（review < 50）→ 灰底警示
- [ ] 網路斷線 → 本地 state 保留，復網後同步

### 績效
- [ ] Gemini 5 天行程生成 < 10 秒
- [ ] 拖拉動作 < 50ms 重排
- [ ] 地圖載入 20 景點不卡

---

## ⚠️ 風險緩衝（每週備案）

| 風險 | 觸發週 | 影響 | 緩衝方案 |
|-----|-------|-----|--------|
| Gemini JSON 失敗率 > 20% | W11–W12 | Core 1 不穩 | hardcoded mock 回應作 demo fallback |
| Railway / Vercel 部署失敗 | W15 | 無法 live demo | 本機 demo + 螢幕錄影 backup |
| 某人不在 / 考試 | 任何週 | 該區塊延遲 | 每週 Must 留 20% buffer；關鍵路徑配雙人 |
| 作業 5/6 吃掉專案時間 | W11 / W14 | 產出少 | standup 當天確認優先序，個人作業降到 B 級 |
| 卡關超過 4hr | 任何 | 時程滑落 | 強制進卡關庫 + 求救 Slack |

---

## 📝 轉進 Google Sheet 的對應

若要把這份貼回你原本的 Sheet，對應建議：

- **「總覽儀表板」** → 複製本文件「🗓 時程總覽」表格的週次 / 日期 / 主題 / 里程碑
- **「組員分頁（每人）」** → 複製該人的 6 週任務表（必做 / 可做 / 時數）
- **「週會紀錄」** → 新增欄位：Go/No-Go 檢查結果 + 下週調整
- **「卡關問題庫」** → 新增欄位：影響的 Quality Gate + 觸發緩衝方案 Y/N

當 Sheet 公開共用權限開啟，我可以幫你把 Sheet 的分頁資料讀進來並對齊欄位（快速版，不走 OAuth）。

---

## 🎯 這個計畫的設計哲學

- **每週每人時數約 8–14 小時**：配合其他課程 + 期中後的個人生活
- **前 4 週衝 Core + 關鍵 Plus**，W15–W16 不做新功能只做打磨
- **每週有 Quality Gate**：進不去下一週就降範圍，不硬撐
- **部署留一整週（W15）**：不要 W16 才部署，W16 是修 bug 不是搬家
- **QCQA 明確排進 W15**：老師點名這件事，不做會扣分
- **報告與程式同步推進**：每個 Section 對應到對的週次，不要最後 1 週猛寫
