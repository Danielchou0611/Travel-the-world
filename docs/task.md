# 📋 個人進度追蹤（李冠霖）

## Week 1（3/30–4/6）— 技術基礎建立
- [x] 建立資料分析 pipeline（CSV 清洗）
- [x] 設計景點評分公式（Score = 0.4×評分 + 0.3×log評論 + 0.2×興趣 + 0.1×車站距離效率）
- [x] 輸出第一版景點評分資料（50+ 景點）
- [x] 實作行程編輯器 UI（dnd-kit）

## Week 2（4/7–4/13）— 核心功能串接
- [ ] 景點資料擴展（200+，五大地區）— 等正式資料來源，不使用假資料硬補
- [x] 行程拖拉 → PATCH API 更新順序
- [x] 刪除景點（DELETE API）
- [x] 使用者偏好分析（Python）

## Week 3（4/14–4/20）— XAI 與整合
- [x] 新增自訂景點（先使用本地 scored CSV 搜尋）
- [ ] 資料視覺化（熱門度圖）
- [ ] 驗證 XAI vs AI 推薦一致性
- [ ] 設計 scheduleScore 如何納入前後站距離 / 通勤時間
- [ ] 評估是否改接 Google Places 或後端 `/api/places/search/`
- [ ] 正式景點資料加入 `image_url` 欄位，替換目前 fallback 圖策略

## Week 4（4/21–4/27）— 評估（期中）
- [ ] 建立 9 個測試情境
- [ ] 記錄 2–3 個失敗案例
- [ ] 撰寫評估表格

## Week 5（4/28–6/8）— 收尾
- [ ] 製作簡報（分析 + 評估）
- [ ] Demo 彩排（2 min）
- [ ] 上傳 CSV 至 GitHub

---

## 📊 Progress
- Completed: 8
- In Progress: 0
- Blocked: 1
