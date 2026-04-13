# 行程排序時間與分數重算邏輯

## 目的

使用者拖拉行程順序後，時間與排序後分數需要跟著重新計算。否則景點被移到新的位置時，仍保留舊時間，會造成 demo 與後端資料不一致。

## 核心原則

目前拆成兩種分數：

| 欄位 | 是否隨排序改變 | 說明 |
| --- | --- | --- |
| `baseScore` | 否 | 景點本身推薦分數，來自 XAI 景點評分，包含 `nearbyDensityScore` |
| `scheduleScore` | 是 | 景點放在目前順序中的合理性 |
| `finalScore` | 是 | 結合景點本身與排序合理性的當前行程分數 |

不要直接修改 `baseScore`，因為拖拉排序不會改變景點本身的評價、評論數、興趣符合度或周邊景點密度。排序會改變的是前後站的移動效率與時間安排，因此用 `scheduleScore` 與 `finalScore` 表示。

`baseScore` 公式詳見 `docs/scoring_formula.md`。目前已把原本語意模糊的「距離效率」改為 `nearbyDensityScore`；真正的前後站距離或通勤時間放在 `scheduleScore` 處理。

## 目前前端實作位置

- 型別：`frontend/src/types.ts`
- 排程邏輯：`frontend/src/lib/schedule.ts`
- UI 整合：`frontend/src/App.tsx`
- API payload：`frontend/src/api/itineraryApi.ts`

## 時間重算

目前從每日固定開始時間 `09:00` 重新排。

每個景點會有：

```ts
visitDurationMin
travelTimeFromPreviousMin
startTime
endTime
order
```

流程：

```text
cursor = 09:00
for each item in current order:
  travelTimeFromPreviousMin = estimateTravelTime(previousItem, item)
  startTime = cursor + travelTimeFromPreviousMin
  endTime = startTime + visitDurationMin
  cursor = endTime
```

## 暫時交通時間估算

正式 Google Directions API 尚未接上，因此目前先用 region 估算：

```ts
same region: 30 min
cross region: 75 min
first item: 0 min
```

之後如果有真實座標或 Directions API，只要替換 `estimateTravelTime(previousItem, item)`，UI 與 API payload 不需要重寫。

## 排序後分數

目前 schedule score 從 1 開始扣分：

```text
scheduleScore = 1 - travelPenalty - overtimePenalty - durationPenalty
```

扣分項目：

| 項目 | 說明 |
| --- | --- |
| `travelPenalty` | 移動時間越長扣越多，最高扣 0.25 |
| `overtimePenalty` | 若超過 18:00，最多扣 0.2 |
| `durationPenalty` | 單點停留超過 150 分鐘，扣 0.08 |

其中 `travelPenalty` 是目前行程順序下「上一站到本站」的移動成本。第一站目前移動時間為 0；之後若加入當日出發點，例如飯店或車站，第一站應改成「出發點到第一站」的移動成本。

目前 final score：

```text
finalScore = 0.7 * baseScore + 0.3 * scheduleScore
```

這代表景點本身推薦程度仍是主要因素，但排序造成的移動效率與時間壓力也會影響最終行程分數。

## PATCH payload

拖拉排序後，前端會對每個 item 呼叫：

```text
PATCH /api/itinerary/{item_id}/
```

payload：

```json
{
  "order": 2,
  "start_time": "11:00",
  "end_time": "12:15",
  "visit_duration_min": 75,
  "travel_time_from_previous_min": 30,
  "base_score": 0.8444,
  "schedule_score": 0.9,
  "final_score": 0.8611
}
```

目前沒有設定 `VITE_API_BASE_URL` 時會使用 mock API，payload 會印在 browser console。後端啟動後設定：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## 可調整位置

常數集中在 `frontend/src/lib/schedule.ts`：

```ts
const DAY_START_TIME = "09:00";
const SAME_REGION_TRAVEL_MIN = 30;
const CROSS_REGION_TRAVEL_MIN = 75;
const RECOMMENDED_END_MINUTES = 18 * 60;
```

若要改成不同旅遊節奏，可以調整：

- 每日開始時間
- 同區移動時間
- 跨區移動時間
- 建議結束時間
- `finalScore` 中 `baseScore` 與 `scheduleScore` 的權重
