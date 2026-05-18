# Occupath:可解釋 AI 日本自由行規劃工具
## 2026 NTU AI Builders Challenge · 矽谷種子競賽 · 產品實踐報告書

---

> **參賽身分**:Solo Founder
> **創辦人**:周宜學 Ray · 國立臺灣大學 R14458007
> **產品類別**:Travel Tech × Explainable AI
> **報告日期**:2026 年 5 月 29 日
> **聯絡**:garylabclaude@gmail.com
>
> **副標**:「Occupy your path · Own your reason」
> **一句話定義**:日本自由行規劃工具,每一個推薦都能告訴你為什麼。

---

## P1 · 為什麼是這個產品(Problem)

### 1.1 痛點起源

那是一個三月的午後,我打開 ChatGPT,輸入「請幫我規劃一個五天四夜的京都自由行,我喜歡安靜的咖啡廳跟不太擁擠的景點」。AI 立刻給了我一份完整的行程,清水寺、伏見稲荷、嵐山,每天三餐都有推薦。

行程看起來無懈可擊。但我有兩個問題:

**第一,它為什麼推薦這些地方?** AI 沒說。我只能猜:可能是因為熱門?可能是因為符合「咖啡廳」關鍵字?還是 AI 根本不知道我說的「不太擁擠」是什麼意思?

**第二,當我想把第二天的清水寺換成詩仙堂,我沒辦法跟 AI 說「請幫我重排,但保留早上的咖啡廳行程」**。我只能整個重新生成,然後失去前面所有調整。

那一刻我關掉螢幕。那不是規劃,那是 AI 在替我決定要旅行的方式。

### 1.2 痛點的量化驗證

我們團隊的市場研究員(王孟蘋)在 2026 年 3-4 月期間,用 Pushshift API 抓取了 Reddit 上 r/JapanTravel、r/SoloTravel、r/travel 三個社群,**共 1,141 篇與「Japan trip planning」相關的貼文與留言**,做主題聚類分析。**8 大痛點**結果如下(按頻率排序):

| 排序 | 痛點 | 頻率 | 代表 quote |
|------|------|------|-----------|
| 1 | 「Too much information,don't know what to pick」 | 31% | "I have 50 tabs open and I'm more confused than before." |
| 2 | 「ChatGPT recommendations feel generic」 | 24% | "It just gave me the top 10 tourist spots. I could've Googled that." |
| 3 | 「Can't customize without restarting」 | 18% | "I had to retype my whole prompt every time I wanted to swap one place." |
| 4 | 「Don't know which advice to trust」 | 11% | "Some blog says go in spring, another says fall — what do I believe?" |
| 5 | 「Travel time between spots is unrealistic」 | 7% | "AI scheduled Tokyo and Hakone in the same morning. Lol." |
| 6 | 「Language barrier for Japanese-only sites」 | 4% | "Tabelog has the best info but I can't read it." |
| 7 | 「Don't know off-the-beaten-path options」 | 3% | "Every list is identical. Where do locals actually go?" |
| 8 | 「Can't share / collaborate」 | 2% | "Trying to plan with my partner is a nightmare." |

**前三大痛點(73%)的共同本質是:使用者對 AI 推薦失去信任,因為他們看不到推薦的理由,也無法保有控制權**。這就是 Occupath 要解決的核心問題。

### 1.3 競品為什麼解不掉

| 工具 | 它做什麼 | 為什麼解不掉這個痛 |
|------|---------|------------------|
| **ChatGPT / Claude** | 通用 LLM,可規劃行程 | 黑盒推薦,無因子分解,無法局部修改保留結構 |
| **Klook / KKday** | 套裝行程 + 預訂 | 不做客製規劃,商業導向(只推有合作的) |
| **Google Maps** | 地圖 + 評論 | 不做行程規劃,只是地點工具 |
| **TripAdvisor** | 點評社群 | 過度依賴熱門排行,長尾景點被埋沒 |
| **Notion / Excel** | 自製規劃表 | 完全人工,沒有 AI |

**沒有任何競品同時做到:AI 規劃 × 推薦理由透明 × 局部可調**。這是 Occupath 的市場縫隙。

---

## P2 · Occupath 的解法(Solution)

### 2.1 三個核心承諾

Occupath 對使用者的承諾不是「我們的 AI 比較準」,而是這 3 件事:

**承諾一:每個推薦都告訴你為什麼**
我們不藏推薦邏輯。每個景點卡片右上角的 ⓘ 圖示一點開,顯示這個景點的 4 個評分因子權重(Google 評分、評論數、興趣匹配、動線效率),總和成為最終分數。

**承諾二:你可以局部調整,AI 配合你**
拖拉重排 / 刪除景點 / 移到其他天 — 任何修改都不會打掉 AI 的全盤規劃。AI 會基於你保留的部分重新優化剩餘行程。

**承諾三:AI 不確定的時候,我們會說**
資料不足、評論少、季節性不確定的景點,UI 會明確標註「⚠️ 我對這個景點的信心較低」,不假裝什麼都知道。

### 2.2 XAI 三層設計(這是我們的差異化技術根基)

```
       ┌──────────────────────────────────────┐
       │  Layer 1 · 推薦因子透明化              │
       │  公式可解釋的加權模型                  │
       │  finalScore =                       │
       │    0.7 × baseScore + 0.3 × schedule │
       │                                    │
       │  baseScore =                        │
       │    0.4 × googleRating               │
       │  + 0.3 × log(reviewCount)           │
       │  + 0.2 × interestMatch              │
       │  + 0.1 × routeEfficiency            │
       └──────────────────────────────────────┘
                      ↓
       ┌──────────────────────────────────────┐
       │  Layer 2 · What-if 即時模擬           │
       │  4 個滑桿:愛好景點/美食/購物/休閒      │
       │  每動一格,所有卡片 0.3 秒內重排序     │
       │  使用者親眼看到「我的偏好如何影響推薦」 │
       └──────────────────────────────────────┘
                      ↓
       ┌──────────────────────────────────────┐
       │  Layer 3 · 不確定性標註                │
       │  評論 < 100 條 → ⚠ 我不太確定          │
       │  季節限定景點 → ⚠ 你的旅行日期可能不適合 │
       │  資料 90 天前 → ⚠ 資料較舊             │
       └──────────────────────────────────────┘
```

### 2.3 產品畫面(7 步流程)

> 📷 *正式 PDF 版本此處 7 張螢幕截圖,從 5/15 整合測試後拍攝。*

1. **Landing**:浮世繪藍 + 朱紅 + 18 秒循環影片 + 「Begin your path」CTA
2. **輸入**:可貼日本攻略網址(自動 RAG 萃取),或填結構化偏好
3. **生成**:左側 timeline 行程 / 右側即時 Google Map 路線
4. **XAI 卡片**:點 ⓘ 展開 4 因子條狀分解
5. **拖拉**:景點卡可跨日拖移,自動重算路線
6. **What-if**:4 個滑桿即時模擬「如果我更愛美食呢?」
7. **匯出**:一鍵存成 PDF / 分享連結

---

## P3 · Agentic Coding 開發歷程 ⭐ (40% 評分核心)

> **這一段是矽谷種子競賽最看重的章節**。我們從第一天就是 Agentic-first,所有設計、文件、程式碼、影片、PM 流程,**100% 透過 AI 助理協作完成**。下面是具體證據。

### 3.1 我們使用的 AI 工具鏈

| 工具 | 用途 | 產出量 |
|------|------|-------|
| **Claude Opus 4.7**(主要) | 對話式 PM 協作、產品設計、文件撰寫、程式碼生成 | 7 份策略文件 / 6 份個人評價 / 整合測試 SOP / 99 個 Notion 任務的腳本 |
| **Cursor + Claude** | IDE 內 inline edit、refactor、多檔案編輯 | brand_preview.html(712 行)/ make_video.py(300+ 行)/ setup_notion.py(1922 行) |
| **Google Gemini Pro** | 行程生成 LLM、JSON mode、結構化輸出 | gen_gm_ver7.py 後端核心 |
| **Ollama (llama3.2)** | 本地 LLM 用於 RAG 萃取 | rag_week2.py(Austin) |
| **Pixabay API + ffmpeg** | Hero 影片素材自動下載 + 剪接 | 18 秒 5 幕循環影片 |
| **GitHub Copilot** | 程式碼補全(輔助) | 全員 IDE 內補全 |

### 3.2 Agentic 工作流範例(可截圖佐證)

**範例一:Notion 工作區自動化建構**(setup_notion.py · 1922 行)

我用 1 個 Claude 對話 session,從「我要建一個 Notion 給 6 人團隊用」這句話開始,30 分鐘內生成:
- 5 個資料庫結構(任務 / 模組交接 / 週計劃 / 報告章節 / 卡點與風險)
- 99 個任務(每個含負責人、週次、截止日、驗收標準)
- 6 個個人專屬子頁面(每人專業指令 cookbook)
- 1 個儀表板含 6/8 demo 7 步流程倒推
- 一鍵執行的 Python 腳本(透過 Notion API)

如果用人工建,**保守估計 8 工時**。Agentic 縮減為 30 分鐘 + 5 分鐘執行,**16 倍效率**。

**範例二:18 秒 Hero 影片自動化**(make_video.py · 約 300 行)

需求:從 Pixabay 抓 5 段日本意境影片,以 ffmpeg xfade 過渡串接,加品牌色彩濾鏡,最終 6.7MB 可在網站 hero 區自動播放。

人工流程:Premiere 剪接(若手熟,2-3 小時 / 一支)+ 找素材 1 小時。
Agentic 流程:
- 我描述需求(浮世繪意境 / 5 幕 / 1.8 秒交融轉場 / 不要黑場)
- Claude 寫 Python 腳本(curl_cffi 繞 Cloudflare 抓 Pixabay → ffmpeg xfade)
- 我跑 1 次,看結果回饋「黑場太長」「不要 logo」
- Claude 改參數,重跑,15 分鐘 iterate 4 次達標

**從需求到產出 90 分鐘**,且**未來改任何素材都是改 config.json 重跑**,而非重新剪接。這是 Agentic 的真正優勢:**自動化基礎設施 vs 一次性產出**。

### 3.3 Agentic Coding 的具體 artefacts(全部可在我們 GitHub 驗證)

| Artefact | 行數 / 量 | AI 參與度 | 驗證方式 |
|----------|---------|----------|---------|
| `setup_notion.py` | 1922 行 | 95%(Claude 主寫,人類 review) | GitHub commit history + Notion 工作區 |
| `make_video.py` | 約 300 行 | 90% | GitHub + intro.mp4 |
| `brand_preview.html` | 1100+ 行(含 mega-menu + 動畫升級)| 90% | 瀏覽器可開 |
| **`ray` branch 整合**(5/14 push)| **19 檔 / +4,975 行** | **95%**(Claude Code 編寫,Ray 驗收)| `github.com/Danielchou0611/Travel-the-world/tree/ray` |
| Quiz / Result / PlanJ / PlanP / Explore | 5 個 React Page | 95% | ray branch src/pages/ |
| ParticleBackground(4 variants)+ CursorTrail | 2 個元件 | 95% | ray branch src/components/ |
| 16 份競賽策略文件 | ~30,000 字 | 100% | docs/competition/00-16 |
| HW5 期末作業 5 | ~12,000 字 | 100% | docs/HW5/HW5_期末作業5.md |
| 整合測試 SOP 5 個 bash script | ~600 行 | 100% | scripts/integration/ |
| Hero 影片 18 秒 5 幕 | 6.7 MB | 80%(素材人工挑,剪接 AI) | intro.mp4 |
| 整體對話歷程 | 200,000+ tokens | — | 對話記錄可 export |

### 3.4 Agentic 流程的失敗 / 學習(誠實)

不是所有 AI 輸出都能用。我們在過程中經歷過:

- **AI 生成的 Notion 腳本第一次 cycle 失敗 3 次**(Notion API 的 select option 不能用 emoji,要先 escape) — 學習:**先讓 AI 寫小範圍 spike,確認 API quirks 再大規模生成**
- **Hero 影片第一版黑場太長,情感斷裂** — 學習:**Agentic 流程要快速 review-and-revise,不是 fire-and-forget**
- **Gemini JSON mode 偶爾回傳缺欄位** — 學習:**LLM 輸出必上 pydantic schema 強制驗證**(已加入 next sprint 計畫,見 docs/competition/06)

這些失敗本身就是 Agentic Coding 的 ground truth。**真正的 leverage 不是 AI 給你完美答案,是你能用 AI 在 10 分鐘內試 5 個版本,然後用人類判斷力選最好的那個**。

---

## P4 · 技術架構與技術棧

### 4.1 系統架構圖(5/15 ray branch 整合後實況)

```
                ┌─────────────────────────────────────────┐
                │  使用者瀏覽器 (Vercel)                    │
                │  React 18 + Vite + Tailwind + framer    │
                │  ── 入口層(ray branch · 5/14 push)──   │
                │   brand_preview.html (Hero + Mega-menu)  │
                │   → QuizPage(MBTI 3 題 + 意境引導)      │
                │   → ResultPage(J:指揮官 / P:探險家)     │
                │   ├─ J 路線 → PlanJPage(滑桿 + 偏好)   │
                │   └─ P 路線 → ExplorePage(mood chips)   │
                │                  → PlanPPage(4 段心情)  │
                │  ── 主產品層(Apple branch · 5/12)── ──  │
                │   HomePage / ItineraryPage / ChatBox    │
                │   AttractionCard(XAI 因子展開)         │
                │   GoogleMapPanel(地圖 + 路線)          │
                └─────────────┬───────────────────────────┘
                              │ REST(三服務並行)
        ┌─────────────────────┼─────────────────────────┐
        ↓                     ↓                         ↓
 ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
 │ Django :8000 │    │ FastAPI :8001    │    │ FastAPI :8010    │
 │ + DRF        │    │ (Wen · Gemini)    │    │ (Austin · RAG)   │
 │ (李冠霖)      │    │ /api/generate    │    │ /api/rag/extract │
 │ /api/pois    │    │ /api/modify      │    │ /api/rag/rerank  │
 │ /api/score   │    │ 對話式行程修改     │    │ 攻略文字 → 景點    │
 │ import_pois  │    │                  │    │ + 日文標準化       │
 │ XAI 評分公式  │    │                  │    │ + RAGAS 評估       │
 └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘
        │                     │                       │
        ↓                     ↓                       ↓
 ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
 │  SQLite /    │    │  Gemini 1.5      │    │  ChromaDB        │
 │  PostgreSQL  │    │  Flash API       │    │  向量庫           │
 │  POI Schema  │    │  (JSON mode)     │    │  + Ollama        │
 │  + 8 大類    │    │  + Pydantic      │    │  embedding        │
 └──────┬───────┘    └──────────────────┘    └──────────────────┘
        │
        ↑ import_pois.py(李冠霖 5/13)
 ┌──────────────────────────────────────────┐
 │  japan_with_rating_interest.json (v3)    │
 │  108K POI / 8 大類                       │
 │  ├─ 62K 景點 / 19K 寺社 / 16K 自然        │
 │  ├─ 6K 博物館 / 2K 文藝 / 1.9K 溫泉       │
 │  └─ 1K 購物 / 541 遊樂                   │
 └──────────────────┬───────────────────────┘
                    ↑
        ┌───────────┴────────────┐
        │ Daniel 爬蟲管道 v3      │
        │ Wikidata SPARQL        │
        │ + Google Places 評分    │
        │ + ODPT(JR / Metro)    │
        │ 47 縣市 × 8 大類分檔     │
        └────────────────────────┘
```

### 4.2 Tech Stack(5/15 ray branch 整合後實況)

| 層 | 技術 | 為什麼選 |
|----|------|---------|
| Frontend(入口) | React 18 + Vite + framer-motion + tsParticles | ray branch / 5/14 push,沉浸式 MBTI 引導 + 富士山粒子 + 朱紅吸附 |
| Frontend(主產品) | React 18 + Tailwind + Apple ChatBox | Apple 5/12 push HomePage / ItineraryPage / ChatBox 已串通 Wen Gemini |
| 動畫元件 | framer-motion + tsParticles(polygonMask + emitter) | J 用富士山形狀粒子,P 用 attract+push,游標 trail mode |
| Backend(主) | Django 5 + DRF | 李冠霖 5/13 push,POI Schema + import_pois 管理 108K 景點 |
| Backend(LLM) | FastAPI + uvicorn(:8001) | Wen Gemini 服務,結構化偏好 → 行程 + XAI reason |
| Backend(RAG) | FastAPI + uvicorn(:8010) | Austin RAG 服務,攻略文字 → 景點 + 日文標準化 + RAGAS 評估 |
| LLM 主路 | Google Gemini 1.5 Flash + JSON mode + Pydantic | 中文品質、schema 強制、免費 quota 夠 demo |
| LLM 副路 | Ollama llama3.2 | Gemini quota 撞牆時 fallback、本地 dev 用 |
| Vector DB | ChromaDB(local persist)+ BM25 hybrid | 免 server、Austin 已驗證效果 |
| Embedding | nomic-embed-text(via Ollama) | 多語言支援、本地不依賴 API |
| 資料來源 | Wikidata SPARQL + Google Places + ODPT(JR/Metro) | 法律授權清楚、Daniel v3 已採 47 縣市 × 8 大類 |
| 資料總量 | **108K POI / 8 大類**(5/13 v3) | 62K 景點 + 19K 寺社 + 16K 自然 + 6K 博物館 + 2K 文藝 + 1.9K 溫泉 + 1K 購物 + 541 遊樂 |
| 部署 | Vercel(frontend)+ Railway(backend) | 學生免費額度、CI/CD 自動 |
| 分析 | Plausible | 隱私優先、不用 cookie banner |
| 影片 | ffmpeg + Pixabay API | 自動化、無版權成本 |

> **架構演進備註**:5/8 規劃為「FastAPI 單服務 + JSON 直讀」,5/13 群組會議發現李冠霖已用 Django 把 108K POI 入庫並寫了 import 管線,於是改為「Django(資料層)+ FastAPI Gemini(生成層)+ FastAPI RAG(萃取層)」三服務協同。Port 衝突已釐清:Django :8000 / Wen :8001 / Austin :8010。

### 4.3 為什麼這個架構符合 XAI 設計

- **公式可解釋(Layer 1)**:評分公式寫在李冠霖的 Python pipeline 裡,**4 個因子的權重是 hard-coded 而非 ML 學的**,我們可以對任何使用者解釋為什麼這個景點分這麼高
- **即時重排(Layer 2)**:What-if 滑桿不是 LLM 重新生成,是用「同一份景點 + 新的權重 → 純算術重排」,**回應時間 < 0.3 秒**
- **不確定性可量化(Layer 3)**:評論數 / 資料新鮮度 / 季節限定都是後端 metadata,UI 直接從 metadata 渲染,不需 LLM 二次推理

---

## P5 · 5 週迭代歷程(Show the Work)

### 5.1 從 wireframe 到 prototype 的時間線(5/15 實際進度)

```
W4 (4/14-4/20)   : Apple wireframe 3 頁 / Austin RAG 文件
W5 (4/21-4/27)   : Daniel 爬蟲 v1 / Apple React shell / Austin RAG prototype
W6 (4/28-5/4)    : 李冠霖 pipeline / Apple WhatIfSliders 元件 / Austin URL 解析強化
W7 (5/5-5/11)    : Wen Gemini service / Ray 架構決策 + 6 份個人狀態收集 + 色票 v2
W8 (5/12-5/15)   : ✅ Apple HomePage+ChatBox 串通 Wen / Daniel v3 108K POI 8 大類 /
                   李冠霖 Django+DRF+import_pois / Austin RAG + 日文標準化 + RAGAS /
                   Ray ray branch 整合 push(5/14, 19 檔/+4975 行)
W8 末 (5/16-5/18): HW5 期末作業繳交(5/18)/ 三服務 e2e 對接 / Apple ↔ ray 入口串接
W9 (5/19-5/25)   : 部署(Vercel + Railway)/ 社群投放開跑 / Plausible 分析掛上
W9 末-W10 (5/26-5/29): 報告書 + Demo 影片定稿 + 競賽繳交
W11+ (5/30-6/8)  : 期末展示 + 真實 traction 截圖入 P7
```

### 5.2 三個關鍵決策(Decision Log)

> 矽谷的 founder 報告書精髓在於「show the decisions」,不是「show the features」。

**決策 1(5/8):從 Django + JWT + 6 表 SQL 換成 FastAPI + JSON / Vector DB**

- **背景**:原規劃 Django 全棧,但 Daniel 改方向去做爬蟲,Wen 跟 Austin 各自選了 FastAPI
- **取捨**:堅持原規劃 → 5/29 來不及;順從現實 → 架構偏離原計畫
- **決定**:順從現實。FastAPI + JSON / ChromaDB 雖然短期偷工(沒 user / auth / 持久化),但 demo 流程跑得通就是價值
- **教訓**:**不要為了一致性犧牲速度。早期 startup 最大的 sin 是 over-engineering**

**決策 2(5/8):後端兩套合並(Austin RAG + Wen Gemini)而非二選一**

- **背景**:5/8 同一天 Wen 跟 Austin 各自 push 一套後端,互不知情
- **取捨**:選 Wen → 失去 RAG 差異化;選 Austin → 失去 Gemini 中文品質
- **決定**:都留。各自負責不同 endpoint:Austin 處理「攻略 → 景點」,Wen 處理「偏好 → 行程」
- **教訓**:**衝突不一定要選邊,有時是「邊界沒劃清楚」的 symptom**

**決策 3(5/8 → 5/11 修正):前端不選邊,改「分層整合」**

- **5/8 原版**:Apple 4/26 後停滯 12 天,擬統一到 Austin JSX、Apple 元件 port 過去
- **5/9-5/11 反轉**:Apple 5/9 push 5 commits、5/11 又 push 5 commits,完成 HomePage + ChatBox 並串通 Wen Gemini。**判斷失誤**
- **修正後決定**:不選邊。Ray 用 ray branch 做「入口層」(brand + MBTI + J/P 引導),Apple 主導「主產品層」(行程展示 + ChatBox),Austin 後端守 RAG,Wen 守生成,李冠霖守資料。**5/14 ray branch push 後三層架構成形**
- **教訓 1**:**不要用 12 天前的活躍度判斷一個人會不會回來**。再給一週 + 一個具體可接的任務,沉默的成員可能回神
- **教訓 2**:**「選邊」是 PM 的偷懶解。整合才是真正的工作** — 用清楚的邊界讓所有人勞動成果都進 demo,比裁掉一半團隊更難也更有價值

### 5.3 每週進度截圖(正式 PDF 中插入)

> 📷 *正式 PDF 此處插入 W4-W9 各 1 張截圖,展示從 wireframe 到 production UI 的演進*

---

## P6 · 市場進入策略 GTM(30% 評分核心)

### 6.1 為什麼選這 4 個社群平台

| 平台 | TA(Target Audience) | 內容類型 | 預期週投放數 |
|------|---------------------|---------|-------------|
| **Reddit r/JapanTravel** | 國際自由行旅客(英文) | 痛點 insight + tool 分享 | 2 篇主貼 / 5 篇留言 |
| **Reddit r/SoloTravel** | 獨自旅行者(英文) | 「Solo 規劃日本的隱形痛點」 | 1 篇主貼 / 3 篇留言 |
| **Threads / X(中英平行)** | 30+ 旅遊愛好者、自媒體 | Build in public、產品截圖、決策日記 | 4-5 條 / 週 |
| **Dcard 旅遊版** | 台灣大學生 / 25-35 歲女性 | 中文產品、實際截圖、UI 美感 | 1 篇主貼 / 3 篇留言 |

### 6.2 內容策略(三層)

**Layer 1:價值貼**(70% 內容)
不直接宣傳產品。先發「我們研究了 1141 篇 Reddit 旅遊規劃痛點,8 大發現如下」這種完整 insight。

**Layer 2:幕後貼**(20% 內容)
Build in public:「今天我們團隊從 Django 換成 FastAPI,因為...」「Hero 影片自動化腳本長這樣」。

**Layer 3:產品貼**(10% 內容)
真實截圖 + 一個 demo 連結 + 「想試試嗎?」軟性 CTA。

### 6.3 對話式投放,不是廣告

每篇貼文必做 3 件事:
1. **回所有留言**(包含 critical 留言,不刪不封鎖)
2. **私訊有具體痛點的留言者**:「能不能聊 5 分鐘,你那個情境我們可能解得到」
3. **把 quote 收進 testimonial 庫**(後續做 Demo 影片時用)

### 6.4 預期數字(誠實預測)

22 天投放,**不假設病毒式擴散**,預期區間:

| 指標 | 基準(可達) | 不錯(努力可達) | 超棒(運氣好) |
|------|-----------|--------------|------------|
| Reddit 主貼上 r/JapanTravel | 1-2 篇 | 3-5 篇 | 5+ 篇 |
| 主貼總 upvotes | 30-80 | 100-250 | 500+ |
| 質性留言(>20 字真實回饋) | 5-10 | 15-30 | 50+ |
| 點擊我們網站(Plausible 量) | 200-500 | 1000-2000 | 5000+ |
| Email capture | 20-40 | 50-100 | 200+ |
| 願意付費 / 有意願付費的訊息 | 0 | 1-2 | 3-5 |

> 我們不打算造假任何數字。即使最差狀況(基準),也代表「我們真的把產品送到陌生人面前,並收到真實人類的回饋」,這是 0 → 1 最重要的一步。

---

## P7 · 真實用戶反饋與數據(30% 評分核心)

### 7.1 量化數據(將於 5/19-5/28 累積,5/29 報告書定稿時補完)

> 📷 *正式 PDF 此處 4-6 張截圖:Reddit 貼文、Threads 互動、Plausible dashboard、email capture 後台*

**截至 5/29 23:00 統計**(預留 PDF 補完):

```
- Reddit 主貼:_____ 篇,總 upvotes _____
- 留言數(>20 字):_____ 條
- 網站 unique visitors:_____ 人
- Email 訂閱:_____ 個
- 平均停留時間:_____ 秒
- 來源 Top 3:_____, _____, _____
```

### 7.2 質性回饋(5/29 補完真實 quote)

範例(預留位置,等真實留言補入):

> *「這是我看過第一個會解釋『為什麼推薦』的旅遊 AI 工具。其他都只給結果,你給理由。」*
> — Reddit u/[username], r/JapanTravel

> *「我把伴侶的偏好滑桿拉高,所有景點重排,我們吵了三天的事情 30 秒就解決了。」*
> — Threads @[username]

> *「拖拉編輯這個 UX,讓我感覺 AI 是助手不是老闆。這比 ChatGPT 舒服多了。」*
> — Dcard 用戶,匿名

### 7.3 數據透明承諾

我們在報告書與 demo 影片中**只引用真實截圖**。如果 5/29 截止時數字不到「不錯」級,我們會誠實放出基準級數字。**矽谷評審看過太多假數據;誠實 + 過程透明,比虛報「100K users」更值得信任**。

---

## P8 · 商業模式九宮格(BMC)

```
┌────────────────────┬────────────────────┬────────────────────┐
│ 1. 關鍵夥伴            │ 2. 關鍵活動            │ 3. 價值主張             │
│ Key Partners       │ Key Activities     │ Value Proposition  │
├────────────────────┼────────────────────┼────────────────────┤
│ - Google Places API │ - 景點資料維護        │ ❶ 每個推薦都有理由       │
│ - Gemini API       │ - LLM prompt 優化   │ ❷ 局部修改不打掉重練     │
│ - ODPT(日本鐵道) │ - 社群內容運營        │ ❸ AI 不確定時會說        │
│ - Wikidata         │ - 演算法評分迭代       │                    │
│ - Pixabay(影片素材)│ - 客服與回饋          │ → 給 30+ 自由行愛好者   │
│ - Vercel / Railway │                    │   一個能信任的 AI 助手    │
├────────────────────┼────────────────────┼────────────────────┤
│ 4. 關鍵資源            │ 5. 顧客關係            │ 6. 通路                │
│ Key Resources      │ Customer Relations │ Channels           │
├────────────────────┼────────────────────┼────────────────────┤
│ - 47 縣市 40K POI  │ - Build in public  │ - Reddit r/JapanTravel│
│ - XAI 評分公式      │ - 公開 changelog   │ - Threads / X       │
│ - Solo Founder 驅動 │ - 社群 1v1 私訊     │ - Dcard 旅遊版       │
│ - Agentic 工具鏈    │ - Email newsletter │ - Product Hunt(Q3) │
│ - 5 人後援團隊       │                    │ - SEO(部落格)      │
├────────────────────┼────────────────────┼────────────────────┤
│ 7. 顧客區隔           │ 8. 成本結構            │ 9. 收益流              │
│ Customer Segments  │ Cost Structure     │ Revenue Streams    │
├────────────────────┼────────────────────┼────────────────────┤
│ 主:                │ - Gemini API:     │ - Free 版 ($0)     │
│  ❶ 25-40 歲首次    │   $50/月 起        │   3 次規劃 / 月     │
│  日本自由行愛好者    │ - Railway 部署:    │ - Pro 版 ($4.99/月) │
│  (台 / 美 / 港)    │   $20/月          │   無限 + 進階 XAI   │
│                    │ - Vercel:免費      │ - Team 版($14.99) │
│ 次:                │ - Domain:$15/年   │   家庭 / 多人協作     │
│  ❷ 旅遊規劃師(B2B) │ - Pixabay:免費    │ - 未來:精選預訂分潤  │
│  ❸ 自媒體創作者     │ - 自製設計 / 文案  │  (KKday/Klook 5%) │
│                    │   人力 = Solo +   │                    │
│  TAM 估算:          │   AI 助理槓桿     │                    │
│  全球年自由行日本   │                    │                    │
│  約 1500 萬人,     │ 月 burn:約 $100  │                    │
│  TAM 上限          │ → 100 個 Pro 用戶 │                    │
│  ~$50M ARR         │   可達損益兩平     │                    │
└────────────────────┴────────────────────┴────────────────────┘
```

### BMC 9 格詳細說明

**3. 價值主張(核心)**
不賣「更準的 AI 推薦」(那是紅海),賣「**可解釋 + 可控制**的 AI 規劃體驗」。對 30+ 第一次自由行的人來說,信任感 > 推薦準確度。

**5. 顧客關係(差異化)**
Solo Founder 親自回每一條留言、寫週度 changelog、對 power user 提供 1v1 onboarding。**這在規模化前是優勢,規模後再用 community 慢慢轉**。

**8. 成本結構(精實)**
月 burn ~$100 USD(Gemini API + Railway)。3 個月只需要 $300 = NT$ 9,000 即可營運。**極低 burn rate 讓我們可以等市場 fit**。

**9. 收益流(階梯)**
v0 階段不收費,純驗證 + 累積 email。v1.0(2026 Q3)推 Pro 訂閱 $4.99/月 = NT$ 150。**這是台灣大學生 + 美國差旅族都能負擔的價格**。

---

## P9 · 為什麼是現在(Why Now)+ 為什麼是我

### 9.1 三個外部時機

1. **AI Agent 進入 production 元年**:Gemini 2.0、Claude 4.7、GPT-5 的 JSON mode + tool use 成熟,讓「結構化生成 + 可解釋」第一次工程上可行
2. **解釋性 AI 從學術走進產品**:歐盟 AI Act 2026 上路、Gartner 2025 列 XAI 為 top trend、用戶對黑盒 AI 開始厭倦
3. **後疫情自由行潮回升**:JNTO 2025 統計訪日旅客突破 4000 萬,華語區佔 35%,**且首次自由行比例從 22% 升到 41%**(這群人最需要 Occupath)

### 9.2 為什麼是 Solo Founder Ray

我不是天生工程背景。我是台大資管碩士,主修決策科學與 PM。我的優勢不在程式碼,在 **「能用 AI 把想法變產品」這個 2025-2030 才剛出現的能力**。

5 週內我用 Claude + Cursor 產出:
- 1 個完整品牌系統(站 + 影片 + 文案)
- 1 個 100 任務 Notion 工作區自動化建構
- 5 份競賽策略文件 + 6 份個人評價 + GitHub 推薦
- 整合測試 SOP + 部署計畫
- 凝聚 5 個原本各做各的同學形成有機團隊

**這就是 Agentic Founder 的樣子**:不是放棄工程,而是把工程交給 AI 助理槓桿,自己專注在「定義邊界、驗收輸出、維繫人」。**矽谷未來 5 年最稀缺的不是更會寫 code 的工程師,是這種能從 0 把產品 + 團隊 + 市場一起捲起來的人**。

### 9.3 風險誠實揭露

- ❌ 我尚未有完整 user 數據(將於 5/19-5/29 累積)
- ❌ 我尚未有付費用戶(目標 6/15 後 30 天內出現第一個 Pro 訂閱)
- ❌ 我尚未驗證 LTV / CAC(產品上線 60 天後才能算)
- ✅ 我有完整的產品願景、可執行的 22 天計畫、可量化的成功指標

---

## P10 · Roadmap & Ask

### 10.1 接下來 12 個月

```
2026 Q2 (5-6月)    │ MVP 上線 / 基準 traction / 矽谷種子初賽 + 決賽
2026 Q3 (7-9月)    │ 矽谷實踐 7 週 / Pro 訂閱推出 / 月 100 付費用戶目標
2026 Q4 (10-12月)  │ 拓展東南亞市場(韓 / 越 / 泰)/ AI 旅遊夥伴功能
2027 Q1 (1-3月)    │ B2B 旅遊規劃師工具版 / 種子輪 $500K-$1M
2027 Q2-           │ 多目的地擴張 / Series A 評估
```

### 10.2 我們向矽谷種子計畫的 Ask

如果有幸入選 7-8 月矽谷實踐:

1. **Mentor matching**:希望媒合到 ex-Airbnb / ex-Klook / 旅遊產品領域 advisor
2. **Distribution**:期待透過 NTU AI Builders 校友網絡接觸早期 Beta tester(矽谷 50 人 + 台灣 50 人)
3. **Capital readiness**:在矽谷期間定稿 pitch deck + 財務模型,Q4 啟動種子輪募資

### 10.3 致謝(Supporting Team · 5/15 實際貢獻)

雖然 Occupath 對外是 Solo Founder 形式,但我深深感謝 5 位後援同學。以下是截至 5/15 在 GitHub 可驗證的實際貢獻:

- **周珥豪 Daniel**(M11415067 · 資工碩一 台科大,資料工程)
  - 5/13 push 爬蟲 v3:Wikidata SPARQL + Google Places 評分,**47 縣市 × 8 大類 = 108K POI**
  - 細分:62K 景點 / 19K 寺社 / 16K 自然 / 6K 博物館 / 2K 文藝 / 1.9K 溫泉 / 1K 購物 / 541 遊樂
  - 從原規劃 Django 轉資料工程,是團隊「順從現實」最具代表性的方向修正

- **李冠霖**(B13902028 · 資工二 台大,資料平台 + 評分)
  - 5/13 push **Django 5 + DRF 後端** + `import_pois.py` 把 Daniel 的 JSON 匯入 SQL DB
  - 4 因子 XAI 評分公式(`0.4×Google + 0.3×log評論 + 0.2×偏好符合 + 0.1×動線`)寫進 Python pipeline
  - 解決了「JSON 直讀 → SQL 結構化」這步,讓 demo 可以做即時查詢與篩選

- **溫晨楷 Wen**(R14942134 · 電信碩一 台大,LLM 服務)
  - 5/8 push FastAPI `server.py` + `gen_gm_ver7.py`,**Gemini 1.5 Flash JSON mode + 對話式行程修改**
  - 已被 Apple HomePage 串通,負責「結構化偏好 → 行程 JSON + XAI reason」
  - 5/8 後 7 天無 push,5/13 群組對齊已請其改 port :8001 並補 Pydantic schema(待 W8 末整合)

- **顏伯亨 Austin**(R14522742 · 機械碩一 台大,RAG 全棧)
  - 整隊唯一 e2e 跑通的後端 + 前端 demo:`MapPlanningPage` + RAG + Google Maps
  - 5/15 push 新增**日文景點名稱標準化** + **RAGAS 評估框架**,把「攻略文字 → 景點」精度可量化
  - 23+ commits / 4 週迭代,是整隊「自驅型工程師」典範

- **王孟蘋 Apple**(M11409105 · 資管碩一 台科大,前端主產品 + 用研)
  - 5/9 + 5/11 兩波各 5 commits,5/12 完成 **HomePage + ItineraryPage + ChatBox** 並串通 Wen Gemini
  - 早期交付 1141 篇 Reddit 痛點分析 + 3 Persona + 完整 wireframe
  - 4/26 後 12 天停滯後 5/9 回神,證明「PM 不應太早裁判團隊成員」

**Ray 自己**(R14458007 · 醫材所碩一 台大,Solo Founder)的可驗證貢獻在 P3 已列:
- 5/14 push **ray branch 入口層**(19 檔 / +4,975 行):brand_preview 1100 行 + QuizPage / ResultPage / PlanJ / PlanP / Explore 5 頁 + ParticleBackground / CursorTrail 2 元件
- 16 份競賽 / PM 文件 30,000 字 + 6 份個人評價 12,000 字 + 200K+ tokens 累計
- Notion 自動化 1922 行 + 18 秒 Hero 影片

他們的程式碼會在最終產品中,他們的名字會在 Demo 影片片尾,他們的 GitHub commit history 會成為他們未來實習履歷的一部分。**Occupath 的 v1.0 是我跟他們一起的成就,矽谷種子的舞台屬於我們六個人**。

---

> **Occupy your path · Own your reason**
>
> Ray @ Occupath · 2026-05-29
> garylabclaude@gmail.com

---

## 附錄 A:可驗證的 Agentic Coding Artefacts 清單(5/15)

| 路徑 | 內容 |
|------|------|
| `https://github.com/Danielchou0611/Travel-the-world` | 主 repo,含 7 個 branch(Daniel / Gary / wen / Apple / Austin / ray / docs) |
| `Travel-the-world @ ray branch` | **5/14 Ray push**:19 檔 / +4,975 行,含 brand_preview / 5 React 頁 / 2 元件 |
| `Travel-the-world @ Daniel branch` | 5/13 爬蟲 v3,108K POI 8 大類 JSON(47 縣市分檔) |
| `Travel-the-world @ Gary branch(李冠霖)` | 5/13 Django 5 + DRF + `import_pois.py` + 4 因子評分 pipeline |
| `Travel-the-world @ Apple branch` | 5/12 HomePage + ItineraryPage + ChatBox + `api.ts` 串通 Wen |
| `Travel-the-world @ wen branch` | FastAPI `server.py` + `gen_gm_ver7.py` Gemini 服務 |
| `https://github.com/AustinYanSebasmannAlderhaz/Travel-the-world` | Austin fork:RAG 服務 + 日文標準化 + RAGAS 評估 |
| `austin-fork/public/brand_preview.html` | 品牌站(1,100+ 行,含 mega-menu + ink flow + 三段敘事) |
| `austin-fork/src/pages/QuizPage.jsx` | MBTI 3 題 + 意境引導 |
| `austin-fork/src/pages/{Result,PlanJ,PlanP,Explore}Page.jsx` | J/P 兩條獨立 UX 路徑 |
| `austin-fork/src/components/{ParticleBackground,CursorTrail}.jsx` | 富士山粒子 + 朱紅吸附 + 游標 trail |
| `intro_video_workspace/output/intro.mp4` | 18 秒 Hero 影片 |
| `scripts/notion_setup/setup_notion.py` | Notion 自動化(1,922 行) |
| `docs/competition/00-16` | **16 份**競賽 / PM / 設計文件,累計 30,000+ 字 |
| `docs/HW5/HW5_期末作業5.md` | HW5 期末作業最高規格版,12,000+ 字 |
| Notion 工作區 | https://www.notion.so/35666574bdf78070904ce6f106c3972d |

## 附錄 B:Tech Stack 完整版本與 License

| 元件 | 版本 | License | 商用 OK? |
|------|------|---------|---------|
| React | 18.3 | MIT | ✅ |
| Vite | 5.4 | MIT | ✅ |
| FastAPI | 0.115 | MIT | ✅ |
| Gemini API | 1.5 Flash | Google ToS | ✅ 商用允許 |
| Ollama | latest | MIT | ✅ |
| ChromaDB | 0.5 | Apache 2.0 | ✅ |
| Wikidata | — | CC0 | ✅ |
| Google Places API | v3 | Google ToS | ✅ 商用允許,需付費 |
| ODPT(日本鐵道) | v4 | 各 dataset 授權 | ⚠️ 部分需註冊 |

> 我們所有資料來源 + 程式相依都是商用 OK 或我們自有,沒有 IP 風險。
