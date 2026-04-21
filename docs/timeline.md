# 🗓 5-Week Timeline — Japan Travel App

> 詳細版時程（CLAUDE.md 是精簡版）  
> 維護人：周宜學（PM）　最後更新：2026/04/13

---

## 📐 總體里程碑

| 里程碑 | 日期 | 交付物 |
|-------|------|--------|
| M1：技術基礎 | 4/6 | 各人環境可跑、Wireframe 完成 |
| M2：核心串接 | 4/13 | Frontend 殼 + RAG prototype + 評分公式 |
| M3：API 凍結 | 4/20 | API Contract v1、Core 1 + 2 可跑 mock |
| M4：真資料整合 | 4/27 | 真景點資料 + XAI 三層完成（⚠ 期中考週） |
| M5：評估報告 | 5/11 | Section IV–VI 草稿 |
| M6：部署 & 收尾 | 5/25 | 部署完成、展示 demo 完成 |
| 🎯 期末展示 | 6/8 | 完整報告 + 簡報 + live demo |

---

## Week 1 (3/30–4/6) — 技術基礎建立 ✅ 部分完成

### 目標
建立每個人的開發環境，把技術選型釘死。

### 任務清單

| Owner | 任務 | 狀態 |
|-------|------|------|
| 孟蘋 | React + Vite + Tailwind 專案 init | ✅ |
| 孟蘋 | Figma wireframe（3 頁） | ✅ |
| 伯亨 | Gemini Embedding + ChromaDB 環境 | ✅ |
| 伯亨 | RAG 架構文件 v1 | ✅ |
| 冠霖 | 評分公式 v1 定案 | ✅ |
| 珥豪 | **Django 專案 init** | ⬜ 延誤 |
| 珥豪 | **GitHub repo 建立** | 🔄 部分 |
| 晨楷 | Gemini JSON mode POC | 🔄 |
| 宜學 | 企業分析報告、Persona 設計、專案 Sheet | ✅ |

### 風險
- 珥豪後端未啟動 → 阻塞冠霖與晨楷 Week 2 之後工作

---

## Week 2 (4/7–4/13) — 核心功能串接 🔄 進行中

### 目標
各自模組進入可跑狀態，Week 結束時能看到「有東西在動」。

### 任務清單

| Owner | 任務 | 狀態 |
|-------|------|------|
| 孟蘋 | 首頁表單、AttractionCard mock 版 | ✅ |
| 孟蘋 | What-if 滑桿 prototype | ✅ |
| 孟蘋 | 行程過密警示 UI | ✅ |
| 伯亨 | Google Maps 標記 prototype | ✅ |
| 伯亨 | RAG top-k 調優 | 🔄 |
| 冠霖 | 行程編輯器框架（拖拉殼） | ✅ |
| 冠霖 | 評分公式 unit test | 🔄 |
| 晨楷 | Gemini 服務層骨架 | 🔄（未更新） |
| 珥豪 | **Django init + 基本 endpoint** | ⬜ 關鍵卡點 |
| 宜學 | CLAUDE.md / .clauderules 建立 | ✅（本週） |
| 宜學 | Section I–II 草稿 | ✅ |

---

## Week 3 (4/14–4/20) — XAI 完善 ＆ 整合 📍 本週

### 目標
Core 1（AI 生成）可端到端跑通；XAI 三層至少兩層實作完成。

### 每日任務（建議排程）

| 日 | 重點 | 誰 |
|----|------|-----|
| Mon 4/14 | 珥豪 Django init + 建所有 6 table migration | 珥豪 |
| Tue 4/15 | 珥豪 `/api/trips/` CRUD + JWT 認證 | 珥豪 |
| Tue 4/15 | 晨楷 Gemini service + prompt template | 晨楷 |
| Wed 4/16 | `/api/trips/{id}/generate/` 串通 Gemini→ XAI reason | 晨楷＋珥豪 |
| Wed 4/16 | 冠霖：Layer 1 因子 JSON 輸出 | 冠霖 |
| Thu 4/17 | 孟蘋 AttractionCard 接 API，XAIFactorChart 元件 | 孟蘋 |
| Fri 4/18 | 伯亨 `/api/rag/extract/` 接上 RAG prototype | 伯亨 |
| Sat 4/19 | 整合測試：Core 1 端到端可跑 | 全員 |
| Sun 4/20 | API Contract v1 正式凍結；Section III 草稿 | 宜學 |

### 交付物
- [ ] Core 1 可 demo（使用者輸入偏好 → 看到 AI 行程 + XAI 因子）
- [ ] API Contract v1 凍結
- [ ] XAI Layer 1 完成，Layer 2 prototype
- [ ] Section III 草稿

---

## Week 4 (4/21–4/27) — 評估與報告 ⚠ 期中考週

### 目標
Core 2 + Core 3 完成；開始寫評估章節。

### 任務清單

| Owner | 任務 | 風險 |
|-------|------|------|
| 孟蘋 | 行程編輯器拖拉 + API 串接 | 考試影響 |
| 伯亨 | MapView 完整版、popup 含 XAI | |
| 冠霖 | 執行 Persona × 行程評估實驗 | |
| 冠霖 | 景點評分資料真實化 | 依賴珥豪景點資料 |
| 晨楷 | Section V 草稿（AI 角色） | |
| 孟蘋 + 冠霖 | Section VI 草稿（評估） | |
| 宜學 | Section IV 完成（設計決策） | |
| 珥豪 | `/api/attractions/` 含 xai_factors | |

### 期中考緩衝
- 4/22（Wed）、4/24（Fri）：前後端對齊 buffer（若有人考試不能來） 
- 無 standup 會議，改 Slack 文字同步

---

## Week 5 (4/28–6/8) — 收尾與展示準備

### 分三階段

#### 5a (4/28–5/11)：Plus 功能 + 深化
- Plus 1 AI 助手（若時間允許）
- Plus 2 RAG 攻略轉行程（若時間允許）
- XAI Layer 3 完整（不確定性標示）
- 所有 endpoint 完成

#### 5b (5/12–5/25)：部署 & 整合
- 珥豪：Railway 後端部署、PlanetScale MySQL
- 珥豪：Vercel 前端部署
- 全員：端到端 QA、bug fix
- 孟蘋：Section VI 補完（usability 測試）

#### 5c (5/26–6/8)：展示準備
- Demo script（宜學主導）
- 簡報檔（全員）
- Section VII、VIII（宜學）
- 彩排 × 2

### 🎯 6/8 期末展示
- 完整 live demo
- 報告完稿
- 簡報 15 分鐘 + Q&A

---

## ⏰ 時程風險 & 備案

| 風險 | 機率 | 影響 | 備案 |
|------|------|------|------|
| 珥豪後端 Week 3 仍未 init | 高 | Core 1 延遲 → 展示裸奔 | 先用 mock server（json-server）撐 Core 1 demo |
| 期中考週產出下降 | 高 | Week 4 進度落後 | Week 3 多做一點，Week 4 只做必要事 |
| Gemini API 費用爆掉 | 中 | 無法 demo | What-if 改前端即時計算（已是方案）、加 rate limit |
| 部署失敗 | 中 | 展示用 local | 準備 local demo 作為 fallback |

---

*時程變動請直接在本文件標記，不要另開文件。*
