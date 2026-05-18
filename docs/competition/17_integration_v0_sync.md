# 5/16 群組同步:Occupath v0 整合層完成

> 5/15 23:00 push 到 ray branch · commit `1be9fd49`
> 看完請在群組打「收到」+ 對【需要你回應的 3 件事】回覆

---

## 一、做了什麼(可在 GitHub 看)

把六個分支串成一個能本機 e2e 跑通的產品骨架,push 到 `ray` 分支:

**動線**:`brand_preview` → MBTI 3 題 → J/P 分流 → 偏好頁 → **新的 `/itinerary`(Apple 的 ItineraryPage 簡化版)** → ChatBox 對話修改 → What-if 滑桿即時重排

**新增的整合檔(10 個)**:
- `src/services/api.js` — 統一 API client,接 Wen :8001 + Austin :8010 + Django :8000
- `src/pages/ItineraryPage.jsx` — Apple 631 行 TSX 精簡版 JSX 移植
- `src/components/AttractionCard.jsx` + `ChatBox.jsx` — Apple 元件 port
- `docker-compose.yml` — 三後端一次拉起
- `INTEGRATION.md` — 完整整合手冊
- `scripts/start-all.sh` — macOS 啟動腳本
- `.env.example`

**全部我先做了 glue code,沒動任何人的原始檔**。Wen 的 `server.py` / 李冠霖的 Django views / Austin 的 `api_server.py` / Apple 的 `ItineraryPage.tsx` 都還是原樣留在各自的 branch。

---

## 二、現在跑得起來嗎?

✅ **前端**:`npm run build` 通過(818 modules,無 error)
✅ **fallback**:後端全掛時 UI 仍會 render(MOCK_TRIP)
⚠️ **後端 e2e**:5/16 我會在本機把三服務同時啟動,測完整鏈路通不通 → 寫 INTEGRATION_REPORT 給大家看

---

## 三、需要你回應的 3 件事 ⚠️

### 1️⃣ Wen:改 port :8000 → :8001

- 原因:李冠霖的 Django 也預設 :8000,衝突
- 改法:啟動指令改成 `uvicorn server:app --port 8001 --reload`
  - **不用改 server.py**(CORS 已允許 `localhost:5173`,沒問題)
  - 只是啟動參數要加 `--port 8001`
- 請回:**OK / 我自己啟動時加參數** 或 **可以幫我改個 .env 預設值**

### 2️⃣ Wen + Apple:API 路徑統一

- Apple 在 `API_SPEC.md` 寫的是 `/api/trips/generate`
- Wen `server.py` 實作的是 `/api/generate`
- 整合層已採用 Wen 的 `/api/generate`,**Apple 不用改檔案**(因為 Apple 原本只用 mock data)
- 請回:**OK / 我未來會對齊 `/api/generate`**

### 3️⃣ Wen:Trip JSON schema

- Apple `types.ts` 的 `Trip` interface 是這樣:
  ```
  { id, preferences, summary: {totalDays, totalBudget, totalAttractions, avgPerDay},
    days: [{ day, date, warning, attractions: [{ id, name, nameEn, category,
      description, image, duration, rating, estimatedCost, location,
      baseScore, foodScore, explorationScore,
      xai: { summary, scores: [{label, value, color}], matchedInterests } }]}] }
  ```
- Wen 目前 `generate_itinerary()` 回傳是這個結構嗎?如果差太多,我需要寫 transformer
- **請回**:把 Wen 跑一次 print 出回傳的 JSON 樣本貼到群組(或截圖 api_log.txt)

---

## 四、其他人(不需要立即回應,5/16 起跟我同步)

- **李冠霖**:你的 Django `/api/recommendations/` v0 暫時還沒接,Wen 自己用 JSON 跑 demo。v1 我會把 Django 接進 ItineraryPage 當第二個資料來源
- **Austin**:你的 RAG `/api/rag/extract` 預留在前端 `extractFromGuide()`,5/17 我會接到 ExplorePage 的「貼攻略」按鈕
- **Daniel**:你的 108K POI v3 已在李冠霖 Django 內,沒有要動的;5/20 之後若補餐廳資料記得通知李冠霖 re-import
- **Apple**:你的 HomePage 我**沒有併進來**,因為 ray 的 QuizPage 已經當入口層。你的 ItineraryPage / ChatBox / AttractionCard 我**簡化版 port 過來了**(原版 631 行只取 300 行)。若你想用自己的版本接,5/18 我們對齊一下

---

## 五、看 GitHub

- 主 commit:https://github.com/Danielchou0611/Travel-the-world/tree/ray
- INTEGRATION.md(完整手冊):https://github.com/Danielchou0611/Travel-the-world/blob/ray/INTEGRATION.md
- docker-compose:https://github.com/Danielchou0611/Travel-the-world/blob/ray/docker-compose.yml

---

## 六、為什麼這樣分工?

我們 6 個人都在動 = 沒辦法選邊。所以:
- **入口層**(brand + MBTI + 引導)= 我做完
- **資料層**(108K POI + 評分)= 李冠霖
- **資料源**(爬蟲)= Daniel
- **生成層**(行程 LLM)= Wen
- **理解層**(攻略 RAG)= Austin
- **體驗層**(行程展示 + 互動)= Apple 元件 + 我簡化 port

**每個人的勞動都進 demo,沒人被裁**。

---

5/29 矽谷種子提案截止,還剩 14 天。
有問題群組打我或私訊。

— Ray
2026-05-15 23:50
