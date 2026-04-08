# 日本旅遊行程規劃 App
## 主要：前端、UI 實作、RAG 系統設計、攻略轉行程功能
負責兩個方向：前端 UI 元件實作（地圖頁面、行程卡片細節），以及本專案最有技術深度的功能 — RAG（檢索增強生成）系統。RAG 讓使用者貼入日本旅遊攻略文章，系統自動萃取景點加入行程。這個功能是差異化亮點，也是報告中「XAI 可解釋性」的重要展示點。Week 1 先輸出 RAG 架構研究文件，讓全組了解技術方向後再動手實作。

## 進度分配表
| Week | 具體任務& 交付物 | 完成標準 |
| --- | --- | --- |
| 1 | 1. 研究 RAG 架構：閱讀 LangChain 或 LlamaIndex 文件，理解 Embedding + Vector DB + Retrieval 流程輸出一份 RAG 架構說明文件（1頁），讓全組了解運作方式， 2. 建立前端元件庫：Button、Card、Badge、Tag 等基礎元件3. 實作地圖頁面 UI 框架（Google Maps 嵌入區域預留位置） | RAG文件全組確認 元件庫基礎建立 |
| 2 | 實作地圖頁面：嵌入 Google Maps，顯示行程景點標記點擊地圖標記時顯示景點資訊 popup（名稱、評分、推薦原因）RAG prototype：用 Gemini Embedding 將攻略文字轉為向量，存入 ChromaDB 測試：貼入一篇日本旅遊攻略，能否萃取出景點名稱 | 地圖標記可點擊顯示RAG萃取測試成功 |
| 3 | RAG 完整功能：前端貼入攻略 URL 或文字 → 後端萃取景點 → 前端顯示可加入行程萃取結果加入XAI 說明：「此景點來源：某攻略文章第3段」 地圖動線優化：景點之間顯示建議路線（搭配珥豪的Directions API） 實作「景點資料不足」警示：評論數 < 50 則顯示資料較少提示 | RAG功能端對端完成 景點警示可顯示 |
| 4 |RAG Bug 修復（整合測試階段） 撰寫報告 Section III 中的 RAG 架構段落（含架構圖）協助製作報告附圖：RAG 流程示意圖|RAG段落完成 架構圖產出|
| 5 | 準備 Demo 中 RAG 功能的說明段落（約 2 分鐘）彩排：示範貼入攻略 → 系統萃取景點 → 加入行程的完整流程協助簡報製作：RAG 架構頁面|RAG Demo 流暢 彩排完成|

## 遇到問題時的資源
- RAG入門】python.langchain.com — RAG 教學；或直接用 Google AI Studio 的 Grounding 功能
- 【向量資料庫】ChromaDB（chroma.io）：本地免費，Python 安裝簡單，適合 prototype
- 【Embedding】Gemini text-embedding-004 模型（免費額度充足）：將文字轉為向量
- 【地圖實作】developers.google.com/maps/documentation/javascript — Marker、InfoWindow 用法
- 【RAG卡關】先用最簡單方式：直接把攻略文字貼給 Gemini，讓它列出景點（不用向量DB也能做）
- 【前端元件】參考 Tailwind UI 或 Shadcn/ui 的元件範例，不必從零刻 CSS

## 最終里程碑

展示當天： ① 地圖頁面標記 與路線正常顯示 ② RAG：貼攻略 →自動萃取景點 ③ 報告中 RAG 架構段落完整

# 先求有，再求好

https://docs.google.com/spreadsheets/d/1oyiSCHfhALD3o6bXx-ZX6TUsjc8tvy-Tnq4Ao3ju3ZY/edit?gid=1092429296#gid=1092429296
