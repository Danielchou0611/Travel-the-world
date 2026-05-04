# 景點評分公式文件

## 目標

建立一個可解釋的景點推薦分數，讓初始推薦能同時考量熱門程度、使用者偏好與交通中心可達性。

## 目前公式

```text
baseScore = 0.4 * rating_norm
          + 0.3 * review_norm
          + 0.2 * interest_match
          + 0.1 * station_distance_efficiency
```

`baseScore` 在資料輸出中命名為 `xai_score`。目前前端的 `finalScore` 暫時等於 `baseScore`，等 `scheduleScore` 設計完成後再調整。

## 正規化方式

不同欄位的量綱不同，因此 pipeline 會先把各欄位轉成 0-1 區間，再套用權重。

```text
rating_norm = google_rating / 5
review_norm = log(1 + review_count) / max(log(1 + review_count))
station_distance_efficiency = 1 / (1 + distance_to_station_km / 5)
```

## 車站中心點

距離分數以各地區主要交通中心為參考點。這讓「距離」有固定基準，不再混用飯店、上一站或景點密度等不同語意。

目前主 pipeline 使用各都道府縣對應的主要交通中心：

| Region | station_anchor |
| --- | --- |
| Tokyo | Tokyo Station |
| Kyoto | Kyoto Station |
| Osaka | Osaka Station |
| Okinawa | Naha Bus Terminal |
| Hokkaido | Sapporo Station |
| Kansai | Osaka Station |
| Chugoku | Hiroshima Station |

## 欄位說明

| 欄位 | 說明 |
| --- | --- |
| google_rating | Google 評分，範圍 0-5 |
| review_count | 評論數，使用 `log(1 + review_count)` 降低極端熱門景點的影響 |
| interest_match | 興趣符合度，範圍 0-1 |
| station_anchor | 該地區主要交通中心 |
| distance_to_station_km | 景點到 `station_anchor` 的距離 |
| station_distance_efficiency | 車站距離效率，範圍 0-1，距離越近越高 |
| xai_score | 景點初始推薦分數，越高越推薦 |

## 與 scheduleScore 的分工

目前 `baseScore` 只負責初始推薦，距離基準固定為地區主要車站。它不處理「上一站到本站」的行程順序問題。

`scheduleScore` 待辦：

- 定義前後站距離或通勤時間如何影響行程分數
- 決定第一站要以飯店、車站或使用者指定地點作為起點
- 決定 `finalScore` 是否改成 `baseScore` 與 `scheduleScore` 的加權結果
- 未來可用 Google Directions API 取代目前前端的簡化估算

## 目前主輸出

- 原始資料：`data/raw/japan_with_rating.json`
- normalized：`data/processed/japan_attractions_normalized.csv`
- scored：`data/processed/japan_attractions_scored.csv`
- Pipeline：`scripts/build_japan_attractions.py`

## Legacy

- `scripts/score_attractions.py` 保留作為 Week 1 的 55 筆 sample CSV pipeline
