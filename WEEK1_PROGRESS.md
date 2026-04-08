# Week 1 進度對照

## 1) RAG 架構研究文件
- 已有文件：`RAG_架構說明.md`
- 內容涵蓋：Embedding、Vector DB、Retrieval、Generation，以及 LangChain / LlamaIndex 比較

## 2) 前端元件庫（Button / Card / Badge / Tag）
- `src/components/ui/Button.jsx`
- `src/components/ui/Card.jsx`
- `src/components/ui/Badge.jsx`
- `src/components/ui/Tag.jsx`
- `src/components/ui/index.js`

## 3) 地圖頁面 UI 框架（Google Maps 區域預留）
- `src/pages/MapPlanningPage.jsx`
- `src/App.jsx`
- `src/styles.css`

## React 專案基礎
- `package.json`
- `vite.config.js`
- `index.html`
- `src/main.jsx`

## 啟動方式
```bash
npm install
npm run dev
```

## 下一步（Week 2）
1. 在 `MapPlanningPage` 的地圖區塊替換成 Google Maps JavaScript API。
2. 新增 RAG prototype API：Gemini Embedding + ChromaDB 寫入與查詢。
3. 將「模擬萃取景點」按鈕改為呼叫後端並顯示真實景點資料。

