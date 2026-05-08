# JapanAI - AI 智能日本旅遊規劃助手

這是一個結合 **Google Gemma 模型** 與 **RAG (檢索增強生成)** 技術的旅遊規劃平台。使用者可以根據天數、預算、旅遊風格與興趣，生成具備 **XAI (可解釋 AI)** 推薦理由的專屬行程，並支援對話式即時修改。

## 🌟 核心特色
- **AI 智能生成**：利用 Gemini 模型生成結構化 JSON 行程。
- **RAG 技術應用**：結合維基百科與 Google 評價資料庫 (`japan_with_rating_interest.json`)，確保景點真實存在，杜絕 AI 幻覺。
- **XAI 透明推薦**：針對每個推薦景點提供「興趣符合度」、「交通便利性」等量化指標與分析。
- **對話式修改**：透過後端 `modify_itinerary` 函數，使用者可直接在聊天室輸入需求來局部調整行程。

---

## 🛠️ 技術棧
- **前端 (Frontend)**: React 18, TypeScript, Vite, React Router。
- **後端 (Backend)**: Python 3.9+, FastAPI, Uvicorn, Pydantic。
- **AI 模型**: Google Generative AI (Gemma-4 -31B)。
- **資料庫/檢索**: 本地 JSON 向量檢索 (RAG)。

---

## 🚀 快速開始

### 1. 環境準備
- 確保電腦已安裝 [Node.js](https://nodejs.org/) (建議 v18 以上)。
- 確保電腦已安裝 [Python](https://www.python.org/) (建議 3.9 以上)。

### I. 後端設定 (Python FastAPI)
1. **進入後端目錄:**  
建立虛擬環境：
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows 請用 venv\\Scripts\\activate
    ```
2. **安裝必要套件**
    ```bash
    pip install fastapi uvicorn google-generativeai python-dotenv requests pydantic
    ```
3. **設定環境變數:**  
在後端根目錄建立 .env 檔案，並填入你的 API Key：
    ```bash
    GEMINI_API_KEY=你的_GEMINI_API_KEY
    GOOGLE_MAPS_API_KEY=你的_GOOGLE_MAPS_API_KEY
    ```
4. **啟動後端伺服器:**
    ```bash
    uvicorn server:app --reload
    ```
    預設會執行在 http://127.0.0.1:8000
### II. **前端設定 (React + Vite)**
1. **進入前端目錄**：
```Bash
cd frontend
```
2. **安裝依賴套件**：

```Bash
npm install
```
3. **啟動開發伺服器**：

```Bash
npm run dev
```
預設會執行在 http://localhost:5173
### III. **📁 專案結構簡介**
```Bash
.
├── backend/
│   ├── gen_gm_ver6.py           # AI 生成與修改的核心邏輯 (RAG/Prompt)
│   ├── server.py                # FastAPI 路由與伺服器設定
│   └── japan_with_rating_interest.json # RAG 景點知識庫
├── src/
│   ├── components/
│   │   ├── AttractionCard.tsx   # 景點卡片與 XAI 顯示
│   │   └── Navbar.tsx           # 導覽列
│   ├── pages/
│   │   ├── HomePage.tsx         # 需求設定表單頁
│   │   └── ItineraryPage.tsx    # 行程展示與編輯頁
│   └── services/
│       └── api.ts               # 前端 API 呼叫封裝
└── .env                         # 金鑰管理 (不進入版本控制)
```
>　要把apple-branch的code的/src/services/api.ts替換成這個倉庫中的版本 

>　gen_gm_ver7.py: 新增可單獨執行的測試範例，解決回傳json沒有圖片的問題    

> Todo: 有些跟RAG中不同的景點沒有圖片
