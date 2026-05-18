# 5/18 整合更新 + 全員 5/15-18 進度盤點

> 給 Ray 自己看的紀錄,以及給隊友的「下一步要做什麼」清單
> Push commit:`ray` branch · 待補(本份 commit 後)

---

## 一、5/15-18 全員 GitHub 真實進度(可驗證)

主 repo `Danielchou0611/Travel-the-world` 各 branch 最後 commit:

| Branch | 最後 commit 時間 | 內容 | 進度評價 |
|--------|----------------|------|---------|
| **Daniel** | 2026-05-15 | 19 萬餐廳 v1 + minified | ✅ 5/13 後又補資料 |
| **Gary(李冠霖)** | 2026-05-17 | 餐廳 pipeline + 移除非日本 + 文件 | ✅ 三天三 commit |
| **wen** | 2026-05-18 | ver8 + 多城市 + position + 地名正則化 | ✅ 三天三 commit |
| **Apple** | 2026-05-17 | MapPage + 對接 ver8 + 座標驗證 | ✅ 三天三 commit |
| **austinyan** | 2026-05-18 | 餐廳 QA 評估 + POI Lookup 改進 + README | ✅ 5/18 三 commit |
| **ray** | 2026-05-15 | v0 整合層(待 5/18 v2 push) | ⏳ 本次 push 補 |

**整體評**:5/15-18 這 4 天全員都動了。沒有任何一個人「停下來」。

---

## 二、5/15 整合層 commit `1be9fd49` 對全隊的影響

| 整合動作 | 受益人 | 影響 |
|---------|-------|------|
| `src/services/api.js` 三服務統一 client | Apple / Wen / Austin | 不用各自寫 fetch + CORS 處理 |
| `MOCK_TRIP_FALLBACK` | Apple / Demo 影片 | Gemini quota 撞牆時 demo 不會斷 |
| `INTEGRATION.md` API contract | 全員 | 5 個 branch 對齊 schema 的單一來源 |
| `docker-compose.yml` | 部署期(W9) | Vercel + Railway 部署前的本機驗證 |
| `start-all.sh` | 隊友自測 | 一鍵起 4 個 terminal,5/18+ 都可用 |

---

## 三、5/18 v2 補的東西(本次 push)

1. **`src/services/api.js`** 升級:
   - 多城市 `destination: List[str] | str`(對齊 Wen ver8)
   - `specialRequirements` 欄位(對齊 Wen ver8)
   - `position{lat,lng}` 帶入 MOCK_TRIP
   - 餐廳 API 三個 endpoint(listRestaurants / getRestaurantMetadata / recommendRestaurants)
   - **新增 `normalizeTrip()`** — 補 Wen 回傳缺的 baseScore / foodScore / color
   - **新增 `dedupeAttractions()`** — 解 Apple 5/17 回報的景點重複 3-4 次

2. **`src/pages/PlanJPage.jsx`** 修改:
   - 提交時自動 normalize + dedupe(Apple 不用改任何前端)

3. **`docs/HW5/HW5_期末作業5.md`** v2:
   - Q3-a 系統架構圖 → 加入餐廳 19 萬筆 + Wen ver8 + Apple MapPage
   - Q3-a.4 API Contract → 全面對齊 5/18 真實實作
   - 4.3.5 加入「5/15 整合層 push」案例
   - **4.3.6 加入「5/15-18 全員協作」案例** — 描述 AI 如何讓 Ray 在不動隊友程式的前提下治理 5 個並行 branch
   - 4.5 加入 Case 5(Wen ver8 重複景點 + schema 缺欄位)+ Case 6(爬蟲誤抓台灣)
   - b.5 加入 5/18 新發現的時程風險(Wen quota / 重複景點 / 飯店推薦)
   - 致謝 → 改為對應 GitHub 可驗證的 5/15-18 真實貢獻

4. **`docs/competition/18_team_progress_5_18.md`**(本份)

---

## 四、5/19-22 待辦(本週要做的事)

### Wen
- [ ] **重點**:gen_gm_ver8 的 prompt 要加「同一份行程禁止出現同 ID 餐廳」約束 — 解結構性重複(雖然前端已 dedupe,但根本解在 prompt)
- [ ] Pydantic schema 強制 + retry/backoff(處理 Gemini quota 20 次/日)
- [ ] 5/22 前釋出 ver9(若有時間)

### 李冠霖
- [ ] **重點**:餐廳座標 + 半徑推薦 API 跟 Wen 對接(讓 Wen 找景點 300m 內餐廳時呼叫 Django)
- [ ] 評分公式 sanity check(W7 任務延續)
- [ ] 5/22 前把 4 因子權重公式寫成可讀的 README 段落,給 demo 影片用

### Daniel
- [ ] 5/22 前補神社 / 購物中心類型 + 去重(W7 任務)
- [ ] 可選:寺院特殊欄位(開放時間 / 參拜費)— 若沒空就跳過

### Austin
- [ ] **重點**:把 RAG `/api/rag/extract` endpoint 對接到前端 ExplorePage 的「貼攻略」按鈕(Ray 5/22 前在前端做)
- [ ] 5/25 前 RAGAS 評估跑 30 題

### Apple
- [ ] **重點**:確認 5/18 push 的 ray 整合層 e2e 是否能跑 — 你的 ItineraryPage 跟我的整合層共存或合併?
- [ ] dnd-kit 拖拉編輯(W8 任務)
- [ ] 套用 brand 色票 v2(在 styles.css 對齊)

### Ray(我自己)
- [ ] 5/19(明日)本機把三後端真的起來跑一遍,寫 INTEGRATION_REPORT.md
- [ ] 5/20 把 Austin RAG 接 ExplorePage 攻略按鈕
- [ ] 5/22 前更新競賽提案 P5 加入餐廳 + ver8 + 整合層
- [ ] 5/25 部署試水(Vercel 前端先上)

---

## 五、給隊友的群組訊息(可直接複製)

```
@all
5/15-18 大家動得非常多!幫大家盤點 +
我把 5/18 整合更新 push 到 ray branch 了(github.com/Danielchou0611/Travel-the-world/tree/ray)

新東西:
1. 整合層 api.js 升級接 Wen ver8(多城市 + position + 餐廳)
2. 加 normalizeTrip() + dedupeAttractions() 後處理
  → 解 Apple 5/17 回報的「mipig 重複 3-4 次」+ 缺座標渲染失敗
  → Wen 不用改後端,前端就解掉
3. HW5 v2 更新到 5/18 實況(把大家的成就都寫進去了)

請看 docs/competition/18_team_progress_5_18.md 看你這週的 3 件事
有問題隨時找我

— Ray
```

---

## 六、為什麼這次整合不需要 merge PR?

**短答**:因為我寫的是「整合層」而不是「主程式」。

- 我不動隊友的 server.py / views.py / ItineraryPage.tsx
- 我只在 ray branch 的 `src/services/api.js` + 兩個後處理函數
- 隊友未來 push 新版,我的整合層自動相容(只要 schema 對得上)

這個架構讓「整合」變成持續性而非一次性事件。從 5/15 → 5/18,我只動了 1 個檔案(api.js)就吃下了:
- Wen 從 ver7 升 ver8
- Daniel 加 19 萬餐廳
- 李冠霖加 5 個 endpoint
- Apple 加 MapPage

**5/29 矽谷種子提案我打算用這條敘事**:Solo Founder + Agentic 治理層,讓 5 個並行 branch 不用 sync meeting 也能匯流。

---

Ray @ Occupath
2026-05-18 11:00
