# Occupath v0 — 整合上線手冊

> 5/15 整合衝刺,把 6 個 branch 串成一個能 e2e 跑通的產品。
> 主分支:`ray`(在 Danielchou0611/Travel-the-world)

---

## 1. 架構速覽

```
┌──────────────────────────────────────────────┐
│  Frontend(本 repo,ray branch · :5173)       │
│  React 18 + Vite + framer-motion + tsParticles│
│                                              │
│  入口層:brand_preview → /quiz → /result      │
│   ├ J 路線 → /plan-j → POST :8001 → /itinerary│
│   └ P 路線 → /explore → /plan-p              │
│  主產品:/itinerary(Apple ItineraryPage port)│
│   ├ AttractionCard XAI ⓘ                     │
│   ├ What-if 滑桿(前端即時重排)              │
│   └ ChatBox → POST :8001/api/modify          │
└──────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────┐
│  Django :8000(李冠霖 · Gary branch)          │
│  /api/pois/ /api/recommendations/ /api/metadata│
│  108K POI(8 大類)+ 4 因子評分公式            │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Wen FastAPI :8001(Gemini · wen branch)      │
│  /api/generate /api/modify                   │
│  Gemini 1.5 Flash JSON mode + Pydantic       │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Austin RAG :8010(本 repo backend/rag_prototype)│
│  /api/rag/extract                            │
│  Ollama + ChromaDB + 日文標準化 + RAGAS       │
└──────────────────────────────────────────────┘
```

---

## 2. 本機 e2e 啟動(48 小時內可達)

### 2.1 前置:把 5 個 branch 拉到 ../branches/

```bash
cd ../  # 應該是 occupath-integration/
git -C main-repo worktree add branches/Daniel origin/Daniel
git -C main-repo worktree add branches/Gary   origin/Gary
git -C main-repo worktree add branches/wen    origin/wen
git -C main-repo worktree add branches/Apple  origin/Apple
git -C main-repo worktree add branches/ray    origin/ray
```

### 2.2 環境變數

```bash
cp .env.example .env.local  # 前端
echo "GEMINI_API_KEY=your_key" > .env  # docker-compose / 後端
```

### 2.3 啟動三後端 + 前端

**方式 A:Docker Compose(推薦)**
```bash
docker compose up --build
# 另一個 terminal:
npm install && npm run dev
```

**方式 B:逐個 terminal(無 Docker)**
```bash
# T1: Django
cd ../branches/Gary && pip install -r requirements.txt
cd backend && python manage.py migrate && python manage.py runserver 8000

# T2: Wen
cd ../branches/wen && pip install fastapi uvicorn google-generativeai pydantic
uvicorn server:app --port 8001 --reload

# T3: Austin RAG(本 repo)
cd backend/rag_prototype && pip install -r requirements.txt
python api_server.py  # 預設 :8010

# T4: Frontend(本 repo)
npm install && npm run dev  # :5173
```

### 2.4 黃金路徑測試

打開 `http://localhost:5173`,順序:

1. `/quiz`(MBTI 3 題)→ 選出 J 人答案
2. `/result/j`(行程指揮官)→ 點「制定我的精準行程」
3. `/plan-j`(滑桿 + 偏好)→ 提交 → 進度條跑 → 進入 `/itinerary`
4. `/itinerary` 顯示 Wen 生成的行程(若 Wen 沒起 → fallback MOCK_TRIP)
5. ChatBox 輸入「把 D1 第二個景點換成嵐山」→ POST :8001/api/modify → 行程刷新
6. 拖 What-if 滑桿 → 卡片即時重排

另一條 P 路徑:
1. `/quiz` → 選 P 答案 → `/result/p`(隨興探險家)
2. 點 CTA → `/explore`(8 個 mood chips)→ 點 ❤ 收集 → 點 CTA
3. `/plan-p`(4 段心情卡片)

---

## 3. API contract(三服務)

### Django :8000(李冠霖)
| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/pois/?region=&category=&search=` | 景點清單(分頁) |
| GET | `/api/pois/{id}/` | 單一景點詳情 |
| GET | `/api/metadata/` | 8 大類 metadata |
| POST | `/api/recommendations/` | 帶偏好的推薦清單 |

### Wen FastAPI :8001(Gemini)
| Method | Path | Body |
|--------|------|------|
| POST | `/api/generate` | `{destination, days, budget, interests[], explorationStyle, foodVsAttractions, mustVisit, ragContent}` |
| POST | `/api/modify` | `{destination, current_itinerary, user_request}` |

### Austin RAG :8010
| Method | Path | Body |
|--------|------|------|
| POST | `/api/rag/extract` | `{text}` or `{url}` |
| GET | `/health` | — |

---

## 4. 需要隊友確認的 3 件事(5/16 群組請所有人回應)

### A. Wen 改 port:8000 → :8001
- 原因:Django 也用 :8000,衝突
- 改法:啟動時加 `--port 8001`,server.py 不用動
- CORS 已允許 `localhost:5173`,沒問題

### B. API 路徑統一
- Apple 的 API_SPEC.md 寫 `/api/trips/generate`,但 Wen 實作的是 `/api/generate`
- 整合層(`src/services/api.js`)已用 Wen 的 `/api/generate`,Apple 不用改
- 未來 Apple 若要 push 新版,請對齊 `/api/generate`

### C. Trip JSON schema
- Wen `generateItinerary()` 回傳 schema 是否與 Apple `Trip` interface 一致?
- 關鍵欄位:`id` / `preferences` / `summary` / `days[].attractions[].xai.scores[]`
- 整合層已加 fallback:若回傳缺欄位,UI 仍會 render(不會 crash)
- 但若 schema 差太多,Wen 需補欄位或我寫 transformer

---

## 5. 5/16-5/18 待辦清單

- [ ] Wen 加 Pydantic response schema,保證回傳 Trip 結構
- [ ] 李冠霖 Django 的 `/api/recommendations/` 接給 ItineraryPage 當第二個資料來源(目前只用 Wen)
- [ ] Apple 確認自己的 HomePage 是否要併進入口層(目前只用 ray 的 QuizPage)
- [ ] Austin RAG 接 ExplorePage 的「貼攻略」按鈕
- [ ] Daniel 補餐廳資料 → Django re-import
- [ ] Vercel + Railway 部署評估(5/19 起)

---

## 6. 已知限制(v0 可接受)

- 沒有使用者登入(無 user / auth)
- 行程持久化只在 sessionStorage(刷新會回到 cache)
- 拖拉編輯尚未實作(Apple 的 631 行 ItineraryPage 有完整版,v1 移植)
- Google Maps 元件未接(Apple MapPage 有,v1 移植)
- 沒做 i18n,UI 暫時純中文
