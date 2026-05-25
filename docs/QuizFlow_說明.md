# 測驗前端使用者流程（完整說明）

此文件以使用者旅程（UX）角度完整說明目前前端測驗流程與行為，包含路由分支、視覺元素、狀態管理，以及使用者完成後的後續體驗。

## 1. 入口與全站元素

- 頁面入口：`/` 會被導向到 `/quiz`（見 `src/App.jsx`）。
- 全站共用元件：`CursorTrail`（滑鼠拖尾）、`MiniNav`（輕量導覽）在 App 最外層常駐。


## 2. 使用者旅程（步驟化）

1. 首次進入或從其他頁面導向到 `/quiz`。
2. 顯示「引導 / 介紹頁」（`currentIndex = -1`）：
   - 背景使用 `ParticleBackground`（variant="quiz"），版面以大字體呈現情緒引導語。
   - 顯示「深呼吸，開始」按鈕；按下後呼叫 `setCurrentIndex(0)` 進入題目流程。
3. 題目流程（`currentIndex >= 0`）：
   - 每題顯示 `scene`（情境）、`question`（題目）、以及多個 `options`（按鈕）。
   - 進度條在此時顯示，會根據題目索引更新並有動畫效果。
   - 選項使用 `onClick` 觸發 `handleSelect(option)`。
4. 選項處理邏輯：
   - 每個選項攜帶 `weight`（格式 `{ j: number, p: number }`），點選時把該權重加到 `scores`（即累計 J、P 分數）。
   - 若尚有下一題，將 `currentIndex` +1，切換到下一題（動畫交替使用 `framer-motion` 的 `AnimatePresence`）。
   - 若為最後一題，計算最終類型：`type = newScores.j >= newScores.p ? 'j' : 'p'`（同分情況會判定為 `j`）。然後 `navigate(`/result/${type}`)`。
5. 結果頁（`/result/:type`）：
   - `ResultPage` 會根據 `type`（`j` 或 `p`）載入對應文案、顏色與 CTA。
   - CTA 行為：若 `type === 'p'`，導向 `/explore`（隨性探索入口）；否則導向 `/plan-j`（結構化規劃入口）。
   - 結果頁也提供「↺ 重測」按鈕回到 `/quiz`。


## 3. 資料與狀態（重點）

- QUESTIONS（靜態陣列）：每題結構為 { scene, question, options }。
  - 每個 option 為 { label, weight }，weight 為 `{ j, p }`。
- scores（狀態）：{ j: 0, p: 0 }，回答時累加。
- currentIndex（狀態）：-1（intro）或 0..N-1（題目索引）。


## 4. 視覺與動畫要點

- 使用 `framer-motion` 做入場/離場/過渡動畫（案例如介紹頁淡入、題目切換、進度條動畫）。
- 背景粒子由 `ParticleBackground` 提供，根據不同頁面可切換 variant（`quiz`、`p`、`fuji` 等）。
- 字體與配色在結果頁透過 `RESULTS` 物件提供的 `accent` 與 `color` 做動態樣式。


## 5. 路由分支（高階）

- /quiz → 測驗主流程（`QuizPage`）。
- /result/:type → 結果頁（`ResultPage`），`type` 決定後續 CTA。
- 若為 J（結構化）→ CTA 導向 `/plan-j` → `PlanJPage`（J 人入口），後續可到 `/plan` (MapPlanningPage) 取得時間軸型規劃。
- 若為 P（隨性）→ CTA 導向 `/explore` → `ExplorePage`（P 人入口），後續可到 `/plan-p` 顯示非時間表型的旅程卡片。


## 6. 結果演算法與注意事項

- 分數機制非常簡單：每題選項直接增加 `j` 或 `p` 的數值，最終比較兩者大小。
- 平手規則：`newScores.j >= newScores.p` 會把平手判為 `j`，請在移植時注意此偏好（若需改為平手轉中性或隨機，請調整判定式）。


## 7. 使用者體驗考量（現有實作的 UX 設計意圖）

- 引導設計：以慢速淡入與簡短冥想式文案降低使用者焦慮，鼓勵用戶以第一直覺作答。
- 三題設計：使用短題數降低流失，確保結果快速回饋。
- 結果 CTA 明確分流：直接把使用者導向適合的「路徑入口」，讓測驗結果能立刻驅動下一步體驗。


## 8. 移植建議（工程面）

1. 保留 `QUESTIONS` 與 `weight` 結構以維持相同結果。
2. 在目標專案建立 `/result/:type` 並實作與當前 `ResultPage` 相當的 CTA 分流。
3. 可選：保留 `framer-motion` 與 `ParticleBackground` 以還原原始體驗；若不需要，可用簡單 CSS/JS 代替。
4. 測試案例：模擬所有可能的選項組合以確認 `type` 的導向正確（尤其平手情況）。


---
檔案路徑：`docs/QuizFlow_說明.md`（已更新為完整說明）

是否要我：
- 把 `QUESTIONS` 抽成 `src/data/questions.js` 並在專案中加入可匯出的檔案？
- 或是把此文件匯出為一個單一 zip 檔供你下載？


## 9. P 與 J 流程詳述（從測驗後一路到最終體驗）

以下說明從使用者完成測驗、ResultPage 分流後，各自的前端流程與可見行為：


### J（結構化）使用者流程：

- 起點：使用者在 `/result/j` 按下 CTA（`開始你的精準規劃`）會導向 `/plan-j`（`PlanJPage`）。
- `PlanJPage` 目的：以多個明確欄位收集偏好，提供 AI 生成可執行的行程。
   - 可調整項目包括：天數 (`days`)、預算 (`budget`)、4 維滑桿（探索風格／飲食 vs 景點／自然 vs 都會／人潮容忍度）、興趣標籤（複選）、必去景點文字、特殊需求文字。
   - 使用者在調整完偏好後按下 `生成精準行程`：
      - 前端會把偏好序列化存入 `sessionStorage`（鍵名 `occupath_prefs`），並呼叫 `generateTrip(prefs)`（在 `src/services/api.js`），這會向後端或 mock 取得一個 `trip` 物件。
      - 取得的 `trip` 會經過 `normalizeTrip` / `dedupeAttractions` 等處理，再透過 `navigate('/itinerary', { state: { trip } })` 導向 `ItineraryPage`。
- `ItineraryPage`（最終體驗）：
   - 來源：優先使用 `location.state.trip`，若無則嘗試讀取 `sessionStorage` 的 `occupath_trip`，最後 fallback 到 `MOCK_TRIP_FALLBACK`。
   - 介面重點：Day tab（切換天）、AttractionCard 列表、What-if 即時重排滑桿（例如 `explorationStyle` 與 `foodVsAttractions`），以及右側的 `ChatBox` 對話（可直接調整 trip 並即時反應）。
   - 使用者可以透過 What-if 滑桿即時重新排序當日景點（`rerankAttractions`），或在 `ChatBox` 與系統交互以調整細節（例如移除景點、改時間）。
   - 重要：`ItineraryPage` 會將 `trip` 寫回 `sessionStorage`（`occupath_trip`），讓使用者在同一瀏覽器工作階段保留結果。

### P（隨性）使用者流程：

- 起點：使用者在 `/result/p` 按下 CTA（`開始你的偶然之旅`）會導向 `/explore`（`ExplorePage`）。
- `ExplorePage` 目的：以輕量化的「氛圍選擇」帶出靈感卡片並允許收藏，最後把收藏匯成路線。
   - 使用者先在情緒選擇器中點選一個 mood（例如「巷弄咖啡」），前端會從 `MOCK_SPOTS` 或後端資料池過濾並以偽隨機(seed)抽出 3 個建議。
   - 使用者可對建議按「收藏」，收藏列表會暫存在 `collected` 狀態中；當使用者按下「把這些拼成一條路」時，會把 `collected` 存入 `sessionStorage`（鍵名 `occupath_explore_collected`），並導向 `/plan-p`。
- `PlanPPage`（P 人結果視圖）行為：
   - 以 4 個「狀態主題」（day themes）呈現拼起來的路線，每個主題含 3 個景點（先放收藏，再補 fallback 池以湊滿數量）。
   - 使用者可對每個景點做「鎖定」操作（`lockedSpotIds`），鎖定後在重新洗牌時維持該景點。
   - 使用者可按「換一輪」(reshuffle) 以更新 fallback 配置，或返回 `/explore` 繼續收藏。
   - 提供簡易對話入口（`ChatBox` 未整合完全時會以 `alert` 或後端整合按鈕提示）。


### MapPlanning 與 RAG 支援（補充）

- `/plan`（`MapPlanningPage`）為更進階的安排與檢視介面，通常由 J 流或後續工程探索使用：
   - 使用者可貼上攻略文本或 URL，按下「驗證萃取景點」會呼叫後端 RAG API（`/api/rag/extract`），流程包括向量化、檢索與景點萃取。
   - 前端會把 RAG 回傳的 spot 列表顯示成候選景點，提供加入行程、分組檢視、地圖標記（`GoogleMapPanel`）等操作。
   - 使用者可把候選景點加入右側「我的行程」列表，至少加入兩個景點即可在地圖上顯示建議路線。


## 10. 前端儲存鍵一覽（方便移植）

- `occupath_prefs`：由 `PlanJPage` 存入，用於傳給後端生成行程（JSON）。
- `occupath_trip`：`ItineraryPage` 會把最終 trip 寫入，以便頁面重新載入時保留狀態。
- `occupath_explore_collected`：`ExplorePage` 存放 P 人收藏的景點，供 `PlanPPage` 讀取並組成主題。


## 11. 小結與建議

- J 流（結構化）：偏向資料填寫 → 呼叫 AI 生成行程 → 進入可互動的 Itinerary，適合想要可執行、可編輯的行程使用者。
- P 流（隨性）：偏向靈感蒐集 → 收藏與主題化展示（非時間表）→ 以「情緒/地點」驅動體驗，適合希望保有隨機性與探索感的使用者。
- 移植時注意：sessionStorage 的鍵與結果分流（`/result/:type` → `/plan-j` 或 `/explore`）是整體體驗的關鍵，請務必保留或對等實作。

