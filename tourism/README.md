# 🏛 Japan Tourism Attraction Data Scraper

本目錄致力於建立日本全國觀光景點（景點、博物館、寺社、自然景觀）的完整資料庫。數據來源結合了 **Wikidata** (基礎資訊) 與 **Google Maps** (實時評分與評論)。

## 📂 目錄結構

### 1. 核心數據檔案 (Data Versions)
*   **`日本全_v4_with_context.json`** (最新): 包含最完整的景點描述、標籤、Google 星等與評論數。
*   **`日本全_v3_with_ratings.json`**: 第三版數據，已包含評分。
*   **`japan_data_v4_with_context/`**: 各縣市最新數據的存放目錄。
*   **`japan_data_v3/` & `japan_data_v3_with_rating/`**: 歷史版本數據存放目錄。

### 2. 處理腳本 (Scripts)
*   **`japan_fetch_master.py`**: **Wikidata 抓取器**。使用 SPARQL 從 Wikidata 獲取景點的 Q 碼、座標、類別與圖片。
*   **`scrape_ratings.py`**: **評分抓取工具**。將 Wikidata 獲取的景點與 Google Maps 進行匹配，並抓取星等與評論總數。
*   **`merge_japan_data.py` / `merge_master_data.py`**: 將各縣市的 JSON 檔案合併為一個全日本的總表。
*   **`japan_split.py`**: 將大型數據檔案拆分為 47 個都道府縣的獨立檔案。
*   **`update_temples.py` / `update_logic_final.py`**: 針對寺廟與神社等特定類別進行數據精修與邏輯更新。
*   **`all_tokyo.py`**: 專門處理東京都地區數據的快速執行腳本。

### 3. 設定與查詢
*   **`temple_queries/`**: 針對寺社類別優化的搜尋關鍵字。

## 🚀 工作流程 (Workflow)

1.  **獲取基礎資料**: 執行 `japan_fetch_master.py` 從 Wikidata 抓取景點清單。
2.  **拆分縣市**: 執行 `japan_split.py` 將資料按縣市存入 `japan_data/`。
3.  **抓取 Google 評分**: 執行 `scrape_ratings.py` 獲取最新的星等與評論數。
4.  **合併總表**: 執行 `merge_japan_data.py` 產出最終的 `日本全_vX.json`。

---
*註：本專案數據具備名稱模糊比對與座標距離驗證，確保資料精確度。*
