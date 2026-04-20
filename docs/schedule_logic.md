# 行程排序時間與分數邏輯

## 目前狀態

目前排序後會重新計算行程時間，但 `scheduleScore` 尚未納入最終分數。

現階段：

```text
finalScore = baseScore
```

`scheduleScore` 目前只保留為 draft 參考值，讓 UI 和 API payload 先具備欄位，後續討論完成後再正式接入 final score。

## 核心分工

| 欄位 | 是否隨排序改變 | 目前用途 |
| --- | --- | --- |
| `baseScore` | 否 | 景點初始推薦分數，來自 `xai_score` |
| `scheduleScore` | 是 | 待辦，未來用於評估目前順序下的前後站移動合理性 |
| `finalScore` | 目前否 | 暫時等於 `baseScore` |

`baseScore` 公式詳見 `docs/scoring_formula.md`。目前距離基準是各地區主要車站，例如 Tokyo Station、Kyoto Station、Osaka Station。

## 時間重算

拖拉排序或刪除景點後，前端會從每日固定開始時間 `09:00` 重新排。

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

## scheduleScore 待辦

目前 schedule score 草稿公式仍保留在 `frontend/src/lib/schedule.ts`，但不影響 `finalScore`。

後續需要決定：

- 第一站的出發點：車站、飯店，或使用者指定地點
- 前後站距離要用直線距離、交通時間，或 Google Directions API
- 是否加入換乘次數、步行時間、營業時間等懲罰項
- `finalScore` 權重，例如是否改成 `0.7 * baseScore + 0.3 * scheduleScore`

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
  "base_score": 0.8495,
  "schedule_score": 0.9,
  "final_score": 0.8495
}
```

目前沒有設定 `VITE_API_BASE_URL` 時會使用 mock API，payload 會印在 browser console。後端啟動後設定：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## 目前前端實作位置

- 型別：`frontend/src/types.ts`
- 排程邏輯：`frontend/src/lib/schedule.ts`
- UI 整合：`frontend/src/App.tsx`
- API payload：`frontend/src/api/itineraryApi.ts`
