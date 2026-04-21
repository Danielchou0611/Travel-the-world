# CLAUDE.md
> Claude Code 專案上下文檔案  
> 每次進入此專案時，Claude Code 會自動讀取此檔案了解專案狀況  
> 維護人：周宜學（PM）　最後更新：2026/04/13

---

## 🎯 Project Overview（專案簡介）

**Project Name**: Japan Travel App — 可解釋的 AI 決策支援 Web 平台  
**Course**: Web APP 期末專題（NTU × NTUST 跨校合作）  
**Deadline**: 2026/06/08（第 16 週，期末展示）  
**Current Phase**: Week 2 收尾（4/13），Week 3 即將開始

**What we're building**: 一款日本旅遊行程規劃 App，核心差異是「可解釋的 AI」——AI 推薦每個景點時都會說明推薦原因（評分、符合偏好、交通效率），使用者可以調整、刪除、新增景點，保有最終決策權。

---

## 🛠 Tech Stack（技術棧）

| Layer | Tech | Owner |
|-------|------|-------|
| Frontend | React + TypeScript (Vite) + Tailwind/Ant Design | 王孟蘋、顏伯亨 |
| Backend | Django + DRF + SimpleJWT | 周珥豪、周宜學 |
| Database | MySQL (prod) / SQLite (dev) | 周珥豪 |
| AI / LLM | Gemini 1.5 Flash API（JSON mode + Pydantic Schema） | 溫晨楷 |
| RAG | Gemini Embedding + ChromaDB（開發）/ pgvector（部署） | 顏伯亨 |
| Maps | Google Maps JS API + Places API + Distance Matrix API | 周珥豪、顏伯亨 |
| Deployment | Railway（後端）+ PlanetScale（MySQL）/ Vercel（前端） | 周珥豪 |
| Version Control | GitHub monorepo：`Danielchou0611/Travel-the-world`（單 repo + 分支分工） | 周珥豪 |

---

## 👥 Team & Roles（組員與分工）

| 姓名 | 學號 | 系所 | 角色 | 主要負責 |
|------|------|------|------|---------|
| 周珥豪 | M11415067 | 資工碩一　台科大 | 後端 / 爬蟲 / API / 部署 | Django、REST API、Google Maps 串接、Railway 部署 |
| 周宜學 | R14458007 | 材料碩一　台大 | PM / 後端協作 / 報告 | 進度追蹤、API Contract、資料整理、報告統籌 |
| 王孟蘋 | M11409105 | 資管碩一　台科大 | 前端 / UIUX / 資料分析 | React UI、Wireframe、Persona、XAI 展示 |
| 顏伯亨 | R14522742 | 機械碩一　台大 | 前端 / UI / RAG | 地圖 UI、RAG 架構、Google Maps popup |
| 李冠霖 | B13902028 | 資工二　台大 | 資料分析 / 評分系統 / UI | 景點評分公式、行程編輯器、評估測試 |
| 溫晨楷 | R14942134 | 電信碩一　台大 | 後端 / LLM / Prompt 工程 | Gemini 串接、XAI reason 生成、AI 助手 |

---

## 🗓 5-Week Timeline（五週衝刺計畫）

- **Week 1 (3/30–4/6)**：技術基礎建立 ✅ 部分完成
- **Week 2 (4/7–4/13)**：核心功能串接 🔄 進行中
- **Week 3 (4/14–4/20)**：XAI 完善＆整合
- **Week 4 (4/21–4/27)**：評估與報告（⚠ 期中考週）
- **Week 5 (4/28–6/8)**：收尾與展示準備

詳見 `docs/timeline.md`

---

## 📊 Current Progress Snapshot（截至 4/13）

### 已完成 ✅
- 孟蘋：Wireframe 3頁、React 專案、首頁表單、Persona 分析、What-if 滑桿、行程過密警示
- 伯亨：RAG 架構文件、RAG prototype（Gemini Embedding + ChromaDB）、Google Maps 標記
- 冠霖：景點評分公式（finalScore = 0.7×baseScore + 0.3×scheduleScore）、行程編輯器框架
- 宜學：進度追蹤 Google Sheet、企業分析報告、組員評語文件

### 進行中 🔄
- 冠霖：景點評分資料（等真實資料來源）
- 冠霖：行程編輯器與後端 API 串接（等珥豪 API）
- 晨楷：Gemini JSON mode POC（有在測試但進度表未更新）

### 尚未開始 ⬜（關鍵卡點）
- 珥豪：Django 專案 init、GitHub repo、基本 API endpoint（全部未開始）
- 晨楷：Prompt Template、後端 AI 服務層

---

## 🎯 Core Feature — MVP Scope（三個核心功能）

### Core 1: AI 行程規劃（含 XAI）
使用者輸入天數/預算/偏好 → Gemini 生成行程 → 每個景點顯示推薦原因 → 使用者可調整
- 負責：晨楷（LLM）+ 珥豪（後端 API）+ 冠霖（評分資料）

### Core 2: 行程編輯器
拖拉景點順序、刪除、新增自訂景點、即時重算統計
- 負責：孟蘋（前端）+ 伯亨（元件）+ 冠霖（拖拉邏輯）

### Core 3: 地圖動線視覺化
Google Maps 呈現景點位置、建議路線、點擊顯示詳細資訊
- 負責：珥豪（Maps API）+ 伯亨（地圖 UI）

### Plus 1: AI 旅遊助手（聊天）
行程確認後可追問「交通怎麼搭」「附近有什麼」等問題
- 負責：晨楷（LLM）+ 珥豪（後端）

### Plus 2: RAG 攻略轉行程
貼入攻略 URL/文字，自動萃取景點加入行程
- 負責：伯亨（RAG）+ 冠霖（資料分析）

---

## 🧠 XAI Design Framework（三層可解釋性）

**Layer 1: 推薦因子透明化**
- 景點評分加權公式：`Score = 0.4×Google評分 + 0.3×log(評論數) + 0.2×符合使用者興趣 + 0.1×動線效率`
- UI 呈現：景點卡片 ⓘ 點擊展開因子分解百分比

**Layer 2: What-if 情境模擬**
- 使用者調整偏好滑桿（輕鬆型↔探索型），前端即時重排景點（不重打 API）
- 顯示「如果加預算 2000 元，可以加入這個景點：___」

**Layer 3: 失敗說明與不確定性標示**
- 某天景點超過 4 個 → 黃色警示「行程過密」
- 景點資料不足（評論 < 50）→ 顯示「資料較少，建議參考其他來源」
- AI 不確定時主動說明「此資訊可能已過時，請以官方網站為準」

---

## 📂 Repository Structure（monorepo，單一 repo 分支分工）

**GitHub**：`Danielchou0611/Travel-the-world`
**工作方式**：單一 repo，每人有個人分支，功能完成後開 PR 合回 `main`。

```
Travel-the-world/
├── CLAUDE.md                    # 本文件（根目錄必放，Claude Code 自動讀）
├── .clauderules                 # 編碼規範
├── .env.example                 # 環境變數範本
├── .gitignore
├── .mcp.json                    # MCP server 設定（GitHub MCP 用）
├── README.md
├── Claude_Code_README.md        # 組員如何使用 Claude Code 的指引
├── .claude/
│   └── commands/                # PM 常用 slash commands
│       ├── status.md
│       ├── brief.md
│       ├── report.md
│       ├── api.md
│       ├── standup.md
│       └── xai.md
├── docs/                        # 共享文件（報告、資料、進度）
│   ├── API_Contract_v1.md
│   ├── progress.md
│   ├── timeline.md
│   ├── market_research.html     # 孟蘋（待交付）
│   ├── wireframe.pdf            # 孟蘋（待交付）
│   ├── rag_architecture.md      # 伯亨
│   └── report_section_I_II.md   # 宜學
├── specs/                       # 功能規格
│   ├── mvp.md
│   ├── xai_design.md
│   └── db_schema.md
├── backend/                     # Django（珥豪、晨楷、宜學）
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/                  # Django 設定（settings.py / urls.py / wsgi.py）
│   ├── users/
│   └── trips/                   # 核心 app
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── services/
│           ├── gemini_service.py  # 晨楷
│           ├── places_service.py  # 珥豪
│           └── rag_service.py     # 伯亨
├── frontend/                    # React + Vite（孟蘋、伯亨）
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── pages/
│       │   ├── Landing.tsx         # 孟蘋
│       │   ├── Itinerary.tsx       # 孟蘋
│       │   └── MapView.tsx         # 伯亨
│       ├── components/
│       │   ├── AttractionCard.tsx  # 孟蘋
│       │   ├── XAIFactorChart.tsx  # 孟蘋
│       │   ├── WhatIfSlider.tsx    # 孟蘋
│       │   ├── MapMarker.tsx       # 伯亨
│       │   ├── RAGInput.tsx        # 伯亨
│       │   └── ItineraryEditor.tsx # 冠霖
│       └── services/
│           └── api.ts              # API 呼叫封裝
└── data/                        # 爬蟲產出（珥豪）
    └── japan_tourism/           # 47 縣市景點 JSON
```

### Branching Strategy

- **`main`**：主線，**只接 PR 合併**，不允許直接 push
- **個人分支（已存在）**：`Apple`、`Austin`、`Daniel`、`Gary`、`Ray`、`Wen` — 個人 WIP 可放這；組員對應關係請組員自行確認後補上
- **`feature/<描述>`**：功能分支，從 `main` 出發，完成開 PR
- **`docs/<描述>`**：PM 或文件類變更

### ⚠ 已知 repo 狀態問題（2026/04/21 發現）

- `Apple` 分支誤將 `node_modules/` commit 進去 → 開啟新分支前請先清掉並加入 `.gitignore`
- `Daniel` 分支的 `japan_data/*.json`（47 縣市資料）尚未合進 `main` → 建議合入 `data/japan_tourism/`
- `main` 目前只有 README，本 PR 會把 PM 協作文件（CLAUDE.md、specs、slash commands 等）加進來

---

## 🔑 Key Design Decisions（設計取捨 — 報告 Section IV 素材）

### Decision 1: 可解釋性 vs 預測準確度
**選擇**: 可解釋性優先。使用透明加權公式，每個維度貢獻度可展示。  
**放棄**: 使用 black-box 的 deep learning 推薦模型（可能準確度更高但無法解釋）。  
**適用條件**: 使用者需要理解並質疑 AI 建議，不接受黑盒子結果。

### Decision 2: 自動化決策 vs 使用者自主判斷
**選擇**: 中低自動化。AI 生成初始行程，使用者可拖拉、刪除、新增。  
**放棄**: 全自動行程生成（如某些 AI 行程 App，生成後不可編輯）。  
**適用條件**: 使用者在旅遊規劃中要有「感覺自己在決定」的參與感。

### Decision 3: 即時計算 vs API 重打
**選擇**: What-if 滑桿用前端即時計算重排，不重打 Gemini API。  
**放棄**: 每次偏好調整都重新呼叫 Gemini（延遲 2-5 秒、API 費用高）。  
**適用條件**: 使用者需要流暢的互動體驗，且評分公式足夠透明可在前端實作。

---

## ⚠️ Known Issues & Mitigations（卡關問題庫）

| 提問者 | 問題 | 解決方案 | 狀態 |
|-------|------|---------|------|
| 晨楷 | Gemini JSON 格式不穩定 | Pydantic BaseModel + response_schema + temperature=0.3 + 最多重試 3 次 | 🔄 處理中 |
| 珥豪 | Railway MySQL 連線失敗 | django-environ 讀取 DATABASE_URL，格式：`mysql://user:pwd@host/db?ssl-mode=REQUIRED` | ⬜ 未解決 |
| 伯亨 | ChromaDB 向量搜尋不準確 | 改用 Gemini text-embedding-004、top_k=5、chunk size 300-500 字元 | 🔄 處理中 |

---

## 📋 Paid Features（暫不實作，未來規劃）

以下功能列為付費版構想，期末展示以一頁帶過商業模式：
- 多人協作（WebSocket 即時共編）
- 拍照景點記憶手冊
- JR Pass 即時票價查詢
- 離線存取
- 景點勳章 / 集點成就系統
- 行程 PDF 含封面設計版

---

## 🚫 Out of Scope（本專案明確不做）

- 即時機票訂購 / 住宿訂房
- 語音互動 / 相機翻譯
- 社群功能（評論、追蹤其他使用者）
- 付費功能清單中的所有項目

---

## 📚 Report Requirements（期末報告）

### 八章架構（對應 Web_APP 期末專題報告模板）

1. **Section I — 應用背景和決策問題**（宜學，草稿完成）
2. **Section II — 相關設計方法**（宜學，草稿完成）
3. **Section III — 系統概述**（宜學 + 伯亨 RAG 段落，W2 撰寫）
4. **Section IV — 設計決策與權衡**（宜學 + 冠霖評分公式，W3 撰寫）
5. **Section V — AI 角色和系統自主性**（晨楷主筆，W4 撰寫）
6. **Section VI — 評估系統、邏輯和證據**（冠霖 + 孟蘋 Persona，W4 撰寫）
7. **Section VII — 可遷移的設計概念**（宜學，W5 撰寫）
8. **Section VIII — 結論與未來展望**（宜學，W5 撰寫）

---

## 🤖 How Claude Code Should Help

當你使用 Claude Code 協助本專案時，請遵守以下原則：

1. **分工尊重**: 不要跨過組員負責範圍直接改程式，請先提示「這個檔案由 XXX 負責，建議先詢問」
2. **API Contract 為準**: 任何前後端介面需對照 `docs/API_Contract_v1.md`，若不一致請先提醒更新合約
3. **XAI 為核心**: 任何推薦邏輯都必須有可解釋性設計，不要寫出 black-box 的推薦邏輯
4. **先用 mock data**: 在真實 API 未建好前，前端使用 mock data，格式必須符合 API Contract
5. **資料庫 schema 不隨意改**: 見 `specs/db_schema.md`，改動需通知珥豪
6. **付費功能不實作**: 見本文件 Paid Features 區塊
7. **報告與程式同步**: 寫完一個功能後，建議同步更新對應的報告章節草稿
8. **部署前的 .env 清單**: Gemini API Key、Google Maps API Key、Django SECRET_KEY、DATABASE_URL

---

## 🔗 Key References

- 市場調查報告：`docs/market_research.html`（孟蘋整理，30+ 競品、1141 篇 Reddit、8 大痛點）
- Wireframe Figma：`docs/wireframe.pdf`（孟蘋，3 頁完整版 + 3 Persona）
- RAG 架構文件：`docs/rag_architecture.md`（伯亨）
- 企業分析報告：`docs/enterprise_analysis.pdf`（宜學）
- 個人評語報告：`docs/team_review_v2.docx`（宜學）
- 進度追蹤表：Google Sheet（連結見群組）

---

*本文件是 Claude Code 理解本專案的首要依據，請保持更新。任何重大變動（技術棧、分工、時程）請在 24 小時內更新本文件。*
