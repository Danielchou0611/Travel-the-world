---
title: 2026.05.08給冠霖

---

## 李冠霖 · 評價與優化建議

### ✅ 你做得好的地方(具體 3 點)
1. **pipeline 模組化思路清楚**:`pipeline/` 底下 `build_japan_attractions.py` → `csv_to_json.py` → `simplify_interest_json.py` 三段式責任拆得很乾淨,從 Daniel 的 raw JSON 走到下游可消費的 `japan_with_rating_interest.json`,新成員 onboarding 很容易看懂。
2. **demo-web 是團隊第一個 e2e**:在 React 主前端還沒就緒前,vanilla HTML 卡片 + 地圖 + 大眾運輸路線查詢就能讓 PM 拿去對外講解,這對 5/29 矽谷種子提案的 video demo 是關鍵。
3. **有 README + 落地產物**:`pipeline/output/` 已經有實際的 CSV/JSON 產出,代表 pipeline 是「可運行」而非「只是程式碼」,這在 6 人團隊協作裡特別重要,Wen / Austin 不用問你也能拿資料開始接。

### ⚠️ 可以提升的地方(具體 3 點)
1. **scoring 公式還未驗證**:`simplify_interest_json.py` 產出的 interest 分數沒有對照組或 sanity check,Wen 直接拿去做行程排序時無法判斷「東京晴空塔比清水寺高分」這件事是否合理。
2. **sequential script 不是 DAG**:三個 script 之間靠人工順序執行,沒有依賴宣告,raw 檔變動時無法只跑下游;放大到 47 縣市 + 多次重跑會痛。
3. **demo-web 是 vanilla HTML,難併入主前端**:Wen 的 React app 不會直接吃這份 HTML,demo-web 變成展示用孤兒;你的 routing UI 邏輯沒辦法被主前端複用。

### 🎁 推薦 3-4 個 GitHub 開源專案

#### 推薦 1:[Polars](https://github.com/pola-rs/polars)
- **這是什麼**:Rust 寫的高效能 DataFrame,API 跟 pandas 接近,記憶體佔用小一個量級,lazy execution。
- **跟你做的關聯**:`build_japan_attractions.py` 跟 `csv_to_json.py` 目前用 pandas 讀 40K 行 JSON,每次重跑都重新算;換成 Polars 的 `scan_ndjson()` + `collect()` lazy plan,只在最後一刻物化。
- **採用後的優化**:pipeline 從目前數十秒掉到秒級,你在 demo-web 測新 scoring 公式時迭代速度變快;且 Polars 的 `join` 比 pandas 穩,合併 Daniel 多縣市資料時不會 OOM。
- **實作建議**:5/13-5/14 兩天,只改 `build_japan_attractions.py` 一個檔案的 `import pandas as pd` 為 `import polars as pl`,80% API 名稱直接對應,測試 output schema 跟舊版一致即收斂。

#### 推薦 2:[Intelligent-Travel-Recommendation-System](https://github.com/sachinnpraburaj/Intelligent-Travel-Recommendation-System)
- **這是什麼**:把 destination/budget/preferences 轉成 itinerary 的開源 reference,對景點用 RBM、對 hotel 用 ALS、對餐廳用 K-Means + KNN 的 hybrid。
- **跟你做的關聯**:`simplify_interest_json.py` 目前是手刻分數權重,可以借用該專案 `attraction_recommender.py` 的 category × user_interest 內積思路,把興趣向量(historical / nature / food)跟 POI tag 做 cosine。
- **採用後的優化**:scoring 從「拍腦袋」變成「有 reference 的方法論」,矽谷答辯時可以講出「我們用 hybrid recommender 架構」,而非「我們做了一個分數」。
- **實作建議**:5/15-5/16 不要整套搬,只抄 attraction_recommender 那段(約 100 行),把它改成讀 `japan_with_rating_interest.json`,output 一個 `recommend(user_interests) -> top_k` 函式給 Wen 串。

#### 推薦 3:[routingpy](https://github.com/nilsnolde/routingpy)
- **這是什麼**:用統一介面包 OSRM / Valhalla / OpenRouteService / Mapbox 的 Python client,支援 distance matrix。
- **跟你做的關聯**:demo-web 現在是查單條大眾運輸路線(動態 API);但行程規劃需要的是 N×N matrix(N 個景點兩兩交通時間),Wen 那邊一定會要。
- **採用後的優化**:用免費 OSRM public server 一次算出 50 個 POI 的 50×50 matrix(約 1-2 秒),預先存進 `output/distance_matrix_<prefecture>.parquet`,下游行程演算法直接 lookup,不用即時打 API。
- **實作建議**:5/19-5/20 一天,新增 `pipeline/build_distance_matrix.py`,輸入縣市 POI list,輸出 parquet。先用步行模式(`profile='foot'`),電車模式 6/8 展示前再用 TokyoGTFS 補。

#### 推薦 4:[dlt (data load tool)](https://github.com/dlt-hub/dlt)
- **這是什麼**:Python-first 的輕量 ETL 函式庫,自動 schema inference、incremental load、不需要 Airflow/Dagster 的 server。
- **跟你做的關聯**:把 `build_japan_attractions.py` + `csv_to_json.py` + `simplify_interest_json.py` 三個 script 改寫成三個 `@dlt.resource`,用 `dlt.pipeline().run()` 串起來,自帶 incremental(只處理 Daniel 更新過的縣市)。
- **採用後的優化**:Daniel 重新爬某個縣市時,你這邊只跑該縣市的下游,不用整批 47 縣市重跑;同時 dlt 自動寫 `_dlt_load_id`,版本 trace 對 6/8 demo 的「資料新鮮度」展示很加分。
- **實作建議**:5/21-5/22 兩天,先不要動主邏輯,只把三個 script 用 `dlt.resource` 包一層 wrapper(Python 函式 yield row),destination 設 `duckdb` 或 `filesystem`,3 小時可以原型,半天驗證 incremental 行為。