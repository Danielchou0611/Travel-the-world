# Occupath (AI 旅遊行程規劃系統)

Occupath 是一個基於 React、TypeScript 與 Vite 建置的現代化 AI 旅遊行程規劃網頁應用程式。透過直覺的高質感使用者介面，結合 AI 助理與互動式設定，幫助使用者輕鬆產生、修改與管理專屬的旅遊行程。

## 🌟 核心功能 (Features)

- **🤖 AI 智慧行程生成**：根據使用者的需求與偏好，自動規劃最佳旅遊路線與景點安排。
- **💬 互動式 AI 助理 (ChatBox)**：內建 AI 對話介面，使用者可隨時透過自然語言對話微調或修改行程內容。
- **🎛️ 動態參數調整 (What-If Sliders)**：提供直覺的滑桿控制，可即時預覽不同偏好條件下的行程變化。
- **🗺️ 互動式地圖預覽 (MapPage)**：結合地圖功能，將行程路線具象化，讓使用者輕鬆掌握景點間的地理位置與交通距離。
- **✨ 現代化 UI 設計**：結合 Tailwind CSS 與 Ant Design，提供流暢的微動畫與在各種裝置上皆舒適一致的響應式瀏覽體驗。

## 🛠️ 技術架構 (Tech Stack)

- **核心框架**: React 19 + TypeScript
- **建置工具**: Vite 8
- **UI 元件庫**: Ant Design
- **樣式與設計**: Tailwind CSS, Vanilla CSS
- **路由管理**: React Router DOM

## 🚀 專案啟動方式 (Getting Started)

### 1. 安裝環境與依賴套件

請確保您的電腦已安裝 [Node.js](https://nodejs.org/)。接著在專案根目錄下執行以下指令，安裝所有必需的套件：

```bash
npm install
```

### 2. 啟動本地開發伺服器

執行以下指令以啟動本地端開發伺服器（具備 HMR 熱更新功能）：

```bash
npm run dev
```

啟動成功後，請在瀏覽器中開啟終端機所提示的本機網址（預設通常為 `http://localhost:5173`）即可使用應用程式。

### 3. 建置正式環境版本

若需將專案打包編譯以準備部署至正式環境，請執行：

```bash
npm run build
```

打包完成的靜態檔案將會自動輸出至專案根目錄下的 `dist` 資料夾中。

## 📂 專案結構簡介 (Project Structure)

```text
src/
├── components/   # 獨立與共用 UI 元件 (如: ChatBox, AttractionCard, Navbar 等)
├── pages/        # 核心頁面元件 (HomePage 首頁, ItineraryPage 行程頁, MapPage 地圖頁)
├── services/     # API 請求與後端伺服器通訊邏輯
├── index.css     # 全域樣式定義與 Tailwind CSS 進入點
├── App.tsx       # 應用程式主要路由與版面配置
└── main.tsx      # React 應用程式進入點
```
