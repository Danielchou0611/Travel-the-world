# 🇯🇵 Japan Attraction Data Scraper & Database

本專案致力於建立一個完整的日本旅遊景點資料庫，整合了 **Wikidata** 的地理資訊與 **Google Maps** 的實時星等評分。透過自動化腳本，我們系統性地收集了日本 47 個都道府縣的博物館、美術館、寺社及自然景點。

## 🚀 核心功能
- **Wikidata 整合**：自動抓取並分類全日本各縣市的景點座標、類型及圖片。
- **Google Maps 評分爬取**：透過 `google_maps_scraper_tool` 精準對應 Google 地圖上的星等評分與評論總數。
- **智能匹配修復**：具備名稱模糊比對與座標距離驗證，確保資料精確度。
- **數據分類統計**：提供 8 大類別（博物、文化、寺社、遊樂、自然、溫泉、購物、景點）的自動化分類。

## 🛠 使用工具與依賴
- **程式語言**: Python 3.x
- **核心爬蟲**: [google-maps-scraper](https://github.com/gosom/google-maps-scraper)
- **抓取工具**: 本專案依賴於 **`google_maps_scraper_tool`** (需放置於本專案之上一層目錄)。
- **數據來源**: [Wikidata SPARQL Query Service](https://query.wikidata.org/)

## 📂 檔案架構與功能

### 1. 核心數據檔案
- **`日本全_with_ratings.json`** (最新產出): 最重要的資料庫檔案，包含所有景點的名稱、座標、Google 星等評分及評論數。
- **`日本全.json`**: 合併後的日本景點原始清單。
- **`japan_data/`**: 存放依 47 個都道府縣拆分後的原始 JSON 數據。

### 2. 處理腳本 (Python)
- **`scrape_ratings.py`**: **主程式**。負責呼叫 `google_maps_scraper_tool`(github上找到的工具，可以多次抓取google資料) 抓取評分。支援 `--repair` 模式，可針對匹配不準確的項目重新抓取。
- **`japan_split.py`**: **數據源抓取器**。使用 SPARQL 查詢從 Wikidata API 抓取各縣市的原始景點資訊。
- **`merge_japan_data.py`**: 將 `japan_data/` 內的分散檔案合併為全日本總表。

### 3. 設定與說明
- **`.gitignore`**: 排除暫存檔與備份檔，保持 Git 倉庫清爽。
- **`README.md`**: 專案使用手冊。

## 📖 使用說明

### 環境配置
請確保您的目錄結構如下：
```text
Travel_Japan_Web/
├── google_maps_scraper_tool/  # 需先安裝此工具
└── wikidata/                  # 本專案所在目錄
```

### 獲取新評分
```bash
python3 scrape_ratings.py
```

### 修復匹配錯誤的資料
若發現 `google_name_matched` 與原始名稱差異過大，執行此指令進行精修：
```bash
python3 scrape_ratings.py --repair
```

### 更新 Wikidata 原始資料
```bash
python3 japan_split.py
python3 merge_japan_data.py
```

---
*註：本專案僅供學術研究與旅遊資料分析使用，請遵守 Google Maps 與 Wikidata 的使用條款。*
