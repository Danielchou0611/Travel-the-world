# Week 2 核心功能串接紀錄

## 已完成

- 行程拖拉後會呼叫 `PATCH /api/itinerary/{item_id}/` 更新每個項目的 `order`
- 刪除景點會呼叫 `DELETE /api/itinerary/{item_id}/`
- 前端採 optimistic update；刪除失敗時會把景點放回原本位置
- 拖拉與刪除後會重新計算時間與暫時移動時間
- `baseScore` 使用地區主要車站距離效率 `station_distance_efficiency`
- 目前 `finalScore = baseScore`
- `scheduleScore` 保留為待辦，之後再決定如何加入前後站距離或通勤時間
- 使用者偏好分析腳本可輸出 JSON 與 Markdown 報告

排序與分數邏輯詳見：

- `docs/scoring_formula.md`
- `docs/schedule_logic.md`

## 資料狀態

正式景點資料之後再匯入，因此 Week 2 的「200+ 景點」目前不使用假資料硬補。現有 55 筆 sample data 只作為 pipeline 與 UI 開發用 placeholder。

## API 設定

目前尚未建立 Django backend，因此前端在沒有設定 `VITE_API_BASE_URL` 時會使用 mock API，避免把 `/api` 請求送到 Vite dev server 造成 404。

mock 模式會在 console 顯示將送出的請求：

```text
[mock-api] PATCH /api/itinerary/{item_id}/
[mock-api] DELETE /api/itinerary/{item_id}/
```

若 Django API 已啟動，啟動前端時設定：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## 偏好分析

```bash
python3 scripts/analyze_preferences.py
```

輸出：

- `reports/preference_analysis.json`
- `reports/preference_analysis.md`

## Week 3 銜接

自訂景點搜尋加入行程的本地 CSV 版本詳見：

- `docs/week3_notes.md`
