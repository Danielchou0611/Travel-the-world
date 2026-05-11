# Frontend User Preference Spec

## 1. Goal

這份文件定義前端在第一版推薦系統中應該收集哪些使用者資訊，以及這些資訊要如何對應到後端 recommendation API。

這一版目標以「景點推薦」為主，不先處理 itinerary 排程。

## 2. What Frontend Needs To Know

前端需要收集的使用者資訊有兩個用途：

- 組成 `user preference profile`
- 組成推薦 API request payload

## 3. Required Fields

第一版建議前端至少收以下欄位：

| 欄位名稱 | 顯示文案 | UI 元件 | 必填 | 範例值 | 對應 API |
| --- | --- | --- | --- | --- | --- |
| `travel_region` | 想去哪個地區？ | dropdown / select | 是 | `東京都` | `region` / `travel_region` |
| `preferred_category` | 想看哪類景點？ | single select / chips | 否 | `景點` | `category` |
| `top_k` | 想看幾個推薦？ | select | 是 | `10` | `top_k` |
| `interest_preferences` | 你的旅遊興趣 | sliders / rating inputs | 是 | 見下方 | `preferences` / `preference_profile` |

## 4. Interest Preference Fields

建議前端顯示以下興趣選項：

| 顯示名稱 | tag key | 建議元件 | 必填 | 預設值 |
| --- | --- | --- | --- | --- |
| 歷史古蹟 | `歷史` | slider 0~1 | 否 | `0` |
| 藝術展覽 | `藝術` | slider 0~1 | 否 | `0` |
| 自然風景 | `自然` | slider 0~1 | 否 | `0` |
| 熱門打卡 | `打卡` | slider 0~1 | 否 | `0` |
| 戶外活動 | `戶外` | slider 0~1 | 否 | `0` |
| 室內景點 | `室內` | slider 0~1 | 否 | `0` |
| 親子友善 | `親子` | slider 0~1 | 否 | `0` |
| 科學知識 | `科學` | slider 0~1 | 否 | `0` |
| 購物逛街 | `購物` | slider 0~1 | 否 | `0` |
| 溫泉放鬆 | `溫泉` | slider 0~1 | 否 | `0` |
| 宗教文化 | `宗教` | slider 0~1 | 否 | `0` |

前端最後應轉成以下格式：

```json
{
  "歷史": 0.8,
  "藝術": 0.5,
  "打卡": 1.0,
  "戶外": 0.7
}
```

規則：

- 沒選到的欄位可以不送
- 或送 `0`
- 後端會把缺少的 tag 視為 `0`

## 5. Category Options

以下類型較適合作為前端 filter：

- `博物館`
- `寺社`
- `文化藝術`
- `景點`
- `溫泉`
- `自然`
- `購物`
- `遊樂`

## 6. Suggested Frontend Data Model

前端 state 建議先整理成：

```ts
type UserPreferenceForm = {
  userId?: number;
  travelRegion: string;
  preferredCategory?: string;
  topK: number;
  interestPreferences: {
    [key: string]: number;
  };
};
```

範例：

```json
{
  "userId": 1,
  "travelRegion": "東京都",
  "preferredCategory": "景點",
  "topK": 10,
  "interestPreferences": {
    "打卡": 1.0,
    "戶外": 0.8,
    "歷史": 0.3
  }
}
```

## 7. API Payload Mapping

### A. Save User Preference

Endpoint:

- `PUT /api/users/{user_id}/preferences/`

Request body:

```json
{
  "travel_region": "東京都",
  "preference_profile": {
    "打卡": 1.0,
    "戶外": 0.8,
    "歷史": 0.3
  }
}
```

### B. Realtime Recommendation Without user_id

Endpoint:

- `POST /api/recommendations/`

Request body:

```json
{
  "region": "東京都",
  "category": "景點",
  "preferences": {
    "打卡": 1.0,
    "戶外": 0.8,
    "歷史": 0.3
  },
  "top_k": 10
}
```

### C. Recommendation Using Stored Preference

Endpoint:

- `POST /api/recommendations/`

Request body:

```json
{
  "user_id": 1,
  "region": "東京都",
  "category": "景點",
  "top_k": 10
}
```

## 8. Suggested UI Flow

第一版建議前端流程如下：

1. 選地區
2. 調整興趣偏好
3. 選景點類型與推薦數量
4. 送出推薦

## 9. Data Not Needed Yet

以下資料先不用放進第一版推薦 API：

- `trip_days`
- `budget_level`
- `companions`
- `transport_mode`
- `hotel_location`
- `food_preferences`
- `mobility`
- `must_visit_places`
- `avoid_places`

這些比較適合 itinerary 規劃階段再加。

## 10. Frontend Implementation Notes

- `travel_region` 選項可以來自 `GET /api/metadata/`
- `preferred_category` 選項可以來自 `GET /api/metadata/`
- `interest_preferences` 建議先固定寫在前端，不需要由後端動態提供
- 如果 UI 用 1~5 分量表，送出前應轉換成 `0.0 ~ 1.0`
- 推薦結果頁可使用 `results[].score_breakdown` 顯示推薦原因
