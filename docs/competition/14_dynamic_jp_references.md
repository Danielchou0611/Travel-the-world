# Occupath J/P Flow 技術參考(2026-05-11)

> Agent 用 WebFetch 驗證,3 個 2024-2026 活躍且 URL 可開的真實資源。每個對應到我們現有 code 的具體應用位置,5/29 前可做。

---

## TL;DR

| # | 參考 | 類型 | 看的順序 | 核心啟發 |
|---|------|------|---------|---------|
| 1 | [Mindtrip](https://mindtrip.ai/) | 產品 | 30 分鐘 | quiz → persona → **dual UI**(chat ↔ itinerary 雙向綁定)|
| 2 | [LobeChat](https://github.com/lobehub/lobe-chat) | GitHub(76.8k★)| 2 小時 | **Agent-as-config** — 把 prompt + UI 配置 + 推薦邏輯打包成 JSON manifest |
| 3 | [UMAP'25 paper](https://arxiv.org/abs/2504.13095) | 學術論文 | 1 天 | **「session 內允許切換」勝過固定任一風格** — 量化證明 |

**最重要洞察**:MBTI **是 prior(先驗),不是定義**。最好的設計是「**先驗 + session 內可切換**」,這正好讓我們做出比 Klook / Wanderlog 更靈動的產品。

---

## 參考 1 · Mindtrip.ai(產品,30 分鐘看)

**[mindtrip.ai](https://mindtrip.ai/)** · Fast Company 2025「Most Innovative Companies」獲獎

### 它的核心技巧

1. **Quiz-to-persona 冷啟動**:5-7 題輕量選擇題建 style profile,**同一個 profile 同時注入 chat system prompt + itinerary 卡片排序權重**(一個 profile,兩種 UI)
2. **Dual-surface 同步**:chat 修改反映進 itinerary,itinerary 點擊也回灌 chat context

### 對 Occupath 的具體應用

**🎯 HomePage** — 把 MBTI J/P 入口前,可以加一個 3 題輕量 quiz(預算敏感度 / 計畫密度 / 驚喜接受度),產出 `styleProfile` 物件,**同時送進**:
- `gen_gm_ver7.py` 的 prompt 變數
- `japan_with_rating_interest.json` 的 ranking weight

**🎯 ExplorePage ↔ ItineraryPage 雙向綁定**(Mindtrip 最強的 UX 點):
> 讓 P 人的收藏可以「一鍵升級」進 J 人 timeline(沿用同一個 styleProfile)

**5/29 前可做的 MVP**:ExplorePage 的「❤ 帶走 N 個地方 →」按鈕改成 call `/api/modify` 的 init endpoint,把收藏的景點 hand-off 給 Apple 的 ItineraryPage。

### 風險
Mindtrip 是閉源,內部 ranking 算法只能黑箱觀察,得自己重做。

---

## 參考 2 · LobeChat(GitHub,2 小時看)

**[github.com/lobehub/lobe-chat](https://github.com/lobehub/lobe-chat)** · 76.8k stars / 10,441 commits / Agent Market 505+ agents

### 它的核心技巧

1. **Agent-as-config**:把「UI 預設 + 推薦邏輯 + prompt」打包成 JSON manifest,**切 agent 就是切整套行為**(不是只切 prompt)— 看 `src/store/agent` 與 `agents-index` 子專案
2. **Suggested prompts 動態渲染**:每個 agent 配套不同的「下一步建議卡片」(等同我們 P 人 mood chips,但是「在當前 agent 上下文下你下一步可能想做什麼」)

### 對 Occupath 的具體應用

**🎯 ChatBox**(Apple)— 把目前單一 prompt 拆成 `j_agent.json` / `p_agent.json` 兩份 manifest,Wen 的 `gen_gm_ver7.py` 只要根據 query header 載對應的 prompt + temperature:

```js
// j_agent.json
{
  "name": "The Conductor",
  "system_prompt": "你是一位精準理性的行程指揮官...",
  "temperature": 0.3,
  "ui_config": {
    "welcome": "我幫你優化行程,告訴我哪段你想改",
    "suggested_prompts": [
      "把第 3 天的清水寺移到第 5 天",
      "刪掉所有 5 公里以上的步行",
      "把預算降到 40K"
    ]
  }
}

// p_agent.json
{
  "name": "The Wanderer",
  "system_prompt": "你是一位敏感的旅伴,語氣像三毛...",
  "temperature": 0.9,
  "ui_config": {
    "welcome": "想去哪裡都可以說,我聽你的",
    "suggested_prompts": [
      "想要更安靜",
      "再給我一些驚喜",
      "找一條沒去過的咖啡街"
    ]
  }
}
```

**5/29 前可做的最小變更**:`/api/modify` 多吃一個 `mode` 參數(j/p)

**🎯 ExplorePage** — 抄它的 suggested prompts:抽完 3 個景點下方,根據「上一張卡片被收藏 / 跳過」**動態渲染 3 個 chip**(而不是寫死 8 個 mood)

**🎯 MapPlanningPage(Austin RAG)** — LobeChat 的 knowledge base 是分 agent 綁定的:
- J agent → ChromaDB **高 precision retrieval**
- P agent → **random sampling**(同一個 RAG 兩種召回策略)

### 風險
codebase 很大(Next.js + TRPC),只能抄思想不能直接 fork。

---

## 參考 3 · UMAP'25 Paper(1 天看)

**[arxiv.org/abs/2504.13095](https://arxiv.org/abs/2504.13095)** · "Should We Tailor the Talk?" by Kostric, Balog, Gadiraju · ACM UMAP 2025

### 它的核心技巧

在 conversational recommender 中比較兩種對話風格:

| 風格 | 特徵 | 對應 |
|------|------|------|
| **High-Involvement** | 快、直接、主動提問 | 類 J 人 |
| **High-Considerateness** | 慢、解釋多、少提問 | 類 P 人 |

**量化結論**:
1. **風格-用戶配對**:高熟悉度用戶 → HighInv 提升效率 / 低熟悉度 → HighCon 提升理解
2. **允許 in-session 切換是最佳解** — 任務表現高於固定任一風格

### 對 Occupath 的具體應用

**🎯 ChatBox**(Apple)— MBTI 是「**先驗 prior**」,但 paper 證實「session 內可切換」更好:

在對話氣泡列加一個小 toggle:
```
[ 精準模式 ⌃ 探索模式 ]
```
toggle 改的是 `gen_gm_ver7.py` 的兩段 system prompt(**直接抄 paper §4.2 的 HighInv / HighCon 模板**)。

**🎯 PlanJPage(我們剛做的)** — paper 提示 strict structured input 適合高熟悉度 → 滑桿可根據首次回答的詳細度**動態收合**(回答簡短的用戶折疊進階滑桿,只保留天數 + 預算)

**🎯 XAI 因子分解(specs/xai_design.md)** — HighCon 在低熟悉用戶身上「多解釋」效果好:
- P 人 itinerary 加長 explanation(2-3 句敘事)
- J 人就維持 bullet(4 因子條狀圖)

### 風險
實驗 domain 是學術文獻檢索,不是旅遊;遷移時要重新驗證效果量級。

---

## 三者疊加:Occupath 的「先驗 + 可切換」設計

```
[MBTI 3 題](先驗)
    ↓ styleProfile
    ↓
┌─────────────────────────────────┐
│ J 預設                P 預設    │
│ ─────                ─────      │
│ 滑桿(structured)    mood chips │
│ Timeline             Random 3   │
│ HighInv prompt       HighCon    │
│ Precision RAG        Random RAG │
└────────────┬───────────┬────────┘
             ↓           ↑
        Session 內可切換 toggle
        (paper §5 的最佳解)
             ↓           ↑
   ChatBox 永遠在右下角
   (Mindtrip dual-surface)
   ↑
   點 itinerary 卡 → chat 自動帶 context
   chat 修改 → itinerary 同步更新
```

---

## Ray 接下來看什麼順序

### 30 分鐘(今晚開會後或明天早上)
**直接玩 [mindtrip.ai/quiz](https://mindtrip.ai/)**,做完 quiz 後在 chat + itinerary 之間切換,觀察雙向綁定。

### 2 小時(本週內)
**clone LobeChat,玩 Discover 切 3 個 agent**,讀 `src/features/AgentSetting` 與 agent JSON schema:
```bash
git clone https://github.com/lobehub/lobe-chat
cd lobe-chat
pnpm install && pnpm dev
```

### 1 天(本週末)
**讀 UMAP paper §3-§5**,把 HighInv / HighCon 對話腳本翻成 prompt 模板,塞進 Wen 的 `gen_gm_ver7.py`。

---

## 5/29 前最有 leverage 的 3 個動作

| 優先 | 動作 | 對應參考 | 預估 | 衝擊 |
|------|------|---------|------|------|
| 1 | ExplorePage「帶走 N 個」按鈕 → 把收藏 hand-off 給 Apple ItineraryPage(用 sessionStorage)| Mindtrip | 1 小時 | demo 中「P → J 升級」是亮點 |
| 2 | Wen `gen_gm_ver7.py` 拆成 `j_prompt` / `p_prompt` 兩段,API 加 `mode` 參數 | LobeChat | 半天 | 真正讓 chat 在 J/P 不同性格 |
| 3 | ChatBox 加「精準 / 探索」session-level toggle | UMAP paper | 半天 | demo 影片可拍「使用者中途切風格」5 秒記憶點 |

**所有 3 個合計 ≈ 1.5 天工**,Wen 5/13-5/14 整合時順手做掉。
