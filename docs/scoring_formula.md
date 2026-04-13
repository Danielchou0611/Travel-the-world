# 景點評分公式文件

## 目標

建立一個可解釋的景點推薦分數，讓行程推薦能同時考量熱門程度、使用者偏好與景點周邊可組合性。

## 原始公式

```text
baseScore = 0.4 * Google評分 + 0.3 * log(評論數) + 0.2 * 興趣符合度 + 0.1 * 附近景點密度
```

## 實作方式

不同欄位的量綱不同，因此 pipeline 會先把各欄位轉成 0-1 區間，再套用權重。

```text
rating_norm = google_rating / 5
review_norm = log(1 + review_count) / max(log(1 + review_count))
nearby_density_score = log(1 + nearby_attraction_count) / max(log(1 + nearby_attraction_count))
xai_score = 0.4 * rating_norm
          + 0.3 * review_norm
          + 0.2 * interest_match
          + 0.1 * nearby_density_score
```

`xai_score` 在前端對應 `baseScore`。它代表景點本身是否值得推薦，不會因為使用者拖拉行程順序而改變。

## 欄位說明

| 欄位 | 說明 |
| --- | --- |
| google_rating | Google 評分，範圍 0-5 |
| review_count | 評論數，使用 `log(1 + review_count)` 降低極端熱門景點的影響 |
| interest_match | 興趣符合度，範圍 0-1 |
| nearby_attraction_count | 此景點附近可一起安排的景點數 |
| nearby_density_score | 附近景點密度分數，範圍 0-1 |
| xai_score | 景點本身推薦分數，越高越推薦 |

## 與行程排序分數的分工

原本的「距離效率」語意不夠清楚，因為距離一定需要參考點，例如從飯店出發、從上一個景點出發，或是衡量周邊景點密度。

目前拆成兩層：

| 分數 | 目的 | 是否會因拖拉排序改變 |
| --- | --- | --- |
| `baseScore` / `xai_score` | 評估景點本身推薦程度，包含附近景點密度 | 否 |
| `scheduleScore` | 評估目前行程順序下，從上一站到本站是否順路 | 是 |

後續若接 Google Directions API，應放在 `scheduleScore`，而不是放進 `baseScore`。

## Week 1 交付狀態

- 原始資料：`data/raw/attractions_japan_sample.csv`
- 輸出資料：`data/processed/attractions_scored.csv`
- Pipeline：`scripts/score_attractions.py`
- 目前資料筆數：55 筆景點
