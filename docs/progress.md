# 📊 Progress Log — Japan Travel App

> 詳細進度紀錄（比 CLAUDE.md 的 snapshot 更細緻）  
> 維護人：周宜學（PM）　更新頻率：每週至少一次

---

## Week 2（4/7–4/13）

### 完成事項

#### 王孟蘋（前端 UIUX）
- ✅ Wireframe 3 頁（Landing / Itinerary / MapView）
- ✅ React + Vite + Tailwind 專案初始化
- ✅ 首頁表單元件
- ✅ Persona 分析（3 人）
- ✅ What-if 滑桿 prototype
- ✅ 行程過密警示

#### 顏伯亨（前端 / RAG）
- ✅ RAG 架構文件（`docs/rag_architecture.md`）
- ✅ RAG prototype：Gemini Embedding + ChromaDB
- ✅ Google Maps 景點標記

#### 李冠霖（評分 / 編輯器）
- ✅ 景點評分公式定案：`finalScore = 0.7×baseScore + 0.3×scheduleScore`
- ✅ 行程編輯器框架（拖拉 UI 殼）

#### 周宜學（PM）
- ✅ 進度追蹤 Google Sheet
- ✅ 企業分析報告
- ✅ 組員評語文件 v2

### 進行中

- 🔄 冠霖：真實景點評分資料來源尋找
- 🔄 冠霖：行程編輯器 ↔ 後端 API 串接（**等珥豪 API**）
- 🔄 晨楷：Gemini JSON mode POC（進度表未更新）

### 本週關鍵卡點 🚨

- ⬜ **珥豪**：Django 專案 init、GitHub repo、基本 API endpoint — **全部未開始**
  - 影響：冠霖、孟蘋、晨楷都在等 API
- ⬜ **晨楷**：Prompt Template、後端 AI 服務層 — **未開始**
  - 依賴：珥豪的 Django 骨架

---

## Week 3（4/14–4/20）規劃

目標：XAI 完善 ＆ 整合

- [ ] 珥豪：Django init + `/api/trips/` + `/api/attractions/` 基本 endpoint（Week 3 Day 1–2）
- [ ] 晨楷：Gemini service 與 `POST /api/trips/{id}/generate/`
- [ ] 冠霖：評分公式 unit test、Layer 1 因子 JSON 輸出
- [ ] 孟蘋：XAIFactorChart 元件、AttractionCard ⓘ 展開
- [ ] 伯亨：RAG service 接上 `POST /api/rag/extract/`
- [ ] 宜學：API Contract v1 凍結、Section III 草稿

---

## Week 4（4/21–4/27）規劃 — ⚠ 期中考週

目標：評估與報告

- [ ] 冠霖：執行 Persona × 行程方案的評估實驗
- [ ] 孟蘋：Persona usability 測試記錄
- [ ] 晨楷：Section V 草稿
- [ ] 冠霖 + 孟蘋：Section VI 草稿
- [ ] 宜學：Section IV 完成

---

## Week 5（4/28–6/8）規劃

目標：收尾 + 展示準備

- [ ] 部署：Railway（後端）、Vercel（前端）
- [ ] 展示 demo script
- [ ] Section VII、VIII 撰寫
- [ ] 期末報告 + 簡報檔
- [ ] 6/8 期末展示

---

*新的進度請往上加（最新在最上面），舊的進度保留作為紀錄。*
