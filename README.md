# Occupath (AI 旅遊行程規劃系統)

Occupath 是一個基於 React、TypeScript 與 Vite 建置的現代化 AI 旅遊行程規劃網頁應用程式。透過直覺的高質感使用者介面，結合 AI 助理與互動式設定，幫助使用者輕鬆產生、修改與管理專屬的旅遊行程。

## 核心功能 (Features)

- **AI 智慧行程生成**：根據使用者的需求與偏好，自動規劃最佳旅遊路線與景點安排。
- **互動式 AI 助理 (ChatBox)**：內建 AI 對話介面，使用者可隨時透過自然語言對話微調或修改行程內容。
- **動態參數調整 (What-If Sliders)**：提供直覺的滑桿控制，可即時預覽不同偏好條件下的行程變化。
- **互動式地圖預覽 (MapPage)**：整合 Google Maps，將行程路線具象化，支援 marker 點選、資訊窗與景點卡片三向同步。
- **行程編輯模式**：可拖曳排序、跨日移動、刪除景點，並以 FLIP 動畫呈現變化。
- **現代化 UI 設計**：結合 Vanilla CSS 自訂設計系統，提供流暢的微動畫與響應式瀏覽體驗。

## 技術架構 (Tech Stack)

| 類別 | 技術 |
|------|------|
| 核心框架 | React 19 + TypeScript |
| 建置工具 | Vite |
| 地圖服務 | Google Maps JavaScript API (`@react-google-maps/api`) |
| 路由管理 | React Router DOM |
| 樣式設計 | Vanilla CSS（自訂設計系統） |

## 專案啟動方式 (Getting Started)

### 1. 安裝環境與依賴套件

請確保您的電腦已安裝 [Node.js](https://nodejs.org/)（建議 v18 以上）。  
在專案根目錄下執行以下指令，安裝所有必需的套件：

```bash
npm install
```

### 2. 設定環境變數 (.env)

在專案根目錄建立 `.env` 檔案，並填入以下內容：

```env
VITE_GOOGLE_MAPS_API_KEY=你的_Google_Maps_API_金鑰
```

> **如何取得 Google Maps API 金鑰？**
> 1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
> 2. 建立或選擇一個專案
> 3. 啟用 **Maps JavaScript API**
> 4. 在「憑證」頁面建立 API 金鑰，複製後貼入上方 `.env`

> **注意**：`.env` 已列入 `.gitignore`，請勿將金鑰提交至版本控制。

### 3. 啟動本地開發伺服器

```bash
npm run dev
```

啟動成功後，請在瀏覽器開啟終端機所提示的本機網址（預設為 `http://localhost:5173`）。

### 4. 建置正式環境版本

若需打包部署，請執行：

```bash
npm run build
```

打包完成的靜態檔案將輸出至專案根目錄的 `dist/` 資料夾。

## 專案結構簡介 (Project Structure)

```text
/
├── .env                  # 環境變數（需自行建立，勿提交）
├── .env.example          # 環境變數範本（可參考）
├── index.html            # HTML 進入點
├── vite.config.ts        # Vite 設定
└── src/
    ├── components/       # 共用 UI 元件
    │   ├── Navbar.tsx
    │   ├── AttractionCard.tsx
    │   ├── ChatBox.tsx
    │   └── WhatIfSliders.tsx
    ├── pages/            # 核心頁面
    │   ├── HomePage.tsx       # 首頁（行程偏好設定）
    │   ├── ItineraryPage.tsx  # 行程頁（AI 排序 + 編輯）
    │   └── MapPage.tsx        # 地圖頁（Google Maps 整合）
    ├── services/         # API 請求與資料邏輯
    ├── types.ts          # TypeScript 型別定義
    ├── index.css         # 全域樣式與設計系統
    ├── App.tsx           # 路由配置
    └── main.tsx          # React 應用進入點
```
