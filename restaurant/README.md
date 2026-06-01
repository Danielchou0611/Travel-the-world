# 🍴 Japan Restaurant Data Scraper

本目錄負責蒐集與管理日本全國餐廳的數據，整合了 Google Maps 的星等評分、評論數以及詳細的評論內文 (Context)。

## 📂 目錄結構

### 1. 核心數據檔案 (Data Versions)
*   **`日本全_v2_with_context.json`** (最新): 最終合併的資料庫檔案，包含餐廳基本資訊、Google 評分及部分評論內容。
*   **`日本全_v1_with_rating.json`**: 較早期的版本，僅包含評分資訊。
*   **`japan_data_v2_with_context/`**: 存放各縣市拆分的 v2 原始數據。
*   **`japan_data_v1/` & `japan_data_v1_with_rating/`**: 早期各縣市的原始數據備份。

### 2. 處理腳本 (Scripts)
*   **`run_all.py`**: **自動化執行主程式**。
    *   負責讀取 `prefecture_queries/` 中的關鍵字，並調用上一層目錄的 `google-maps-scraper` 進行大規模抓取。
    *   支援指定縣市執行，例如：`python run_all.py 東京都 大阪府`。
*   **`scrape_ratings.py`**: 評分抓取與更新工具。主要用於補齊或修正現有餐廳清單中的 Google Maps 評分。
*   **`update_restaurants.py`**: 數據更新與維護腳本，負責將抓取到的最新數據整合進資料庫中。

### 3. 設定與查詢
*   **`prefecture_queries/`**: 存放 47 個都道府縣的搜尋關鍵字（例如：`東京 餐廳`、`大阪 美食`），供爬蟲使用。
*   **`keyword_progress.json`**: 紀錄目前關鍵字抓取的進度，避免重複執行。

## 🚀 如何使用

### 1. 執行大規模抓取
確保上一層目錄有 `google_maps_scraper_tool` 且環境配置正確後執行：
```bash
python run_all.py [縣市名稱...]
```

### 2. 更新餐廳評分
```bash
python scrape_ratings.py
```

---
*註：本資料夾數據主要供應給智慧行程引擎使用。*
