# 景點評分公式文件

## 目標

建立一個可解釋的景點推薦分數，讓行程推薦能同時考量熱門程度、使用者偏好與移動效率。

## 原始公式

```text
Score = 0.4 * Google評分 + 0.3 * log(評論數) + 0.2 * 興趣符合度 + 0.1 * 距離效率
```

## 實作方式

不同欄位的量綱不同，因此 pipeline 會先把各欄位轉成 0-1 區間，再套用權重。

```text
rating_norm = google_rating / 5
review_norm = log(1 + review_count) / max(log(1 + review_count))
distance_efficiency = 1 / (1 + distance_km / 5)
xai_score = 0.4 * rating_norm
          + 0.3 * review_norm
          + 0.2 * interest_match
          + 0.1 * distance_efficiency
```

## 欄位說明

| 欄位 | 說明 |
| --- | --- |
| google_rating | Google 評分，範圍 0-5 |
| review_count | 評論數，使用 `log(1 + review_count)` 降低極端熱門景點的影響 |
| interest_match | 興趣符合度，範圍 0-1 |
| distance_km | 與當日路線基準點的距離，距離越短效率越高 |
| distance_efficiency | 距離效率，範圍 0-1 |
| xai_score | 最終排序分數，越高越推薦 |

## Week 1 交付狀態

- 原始資料：`data/raw/attractions_japan_sample.csv`
- 輸出資料：`data/processed/attractions_scored.csv`
- Pipeline：`scripts/score_attractions.py`
- 目前資料筆數：55 筆景點
