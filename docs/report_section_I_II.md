# 📝 Section I + II — 應用背景與相關設計方法

> 主筆：周宜學　狀態：草稿完成（請將你的現有草稿內容貼入以下骨架）  
> 對應 CLAUDE.md「Report Requirements」第 1、2 章

---

## Section I — 應用背景和決策問題

### 1.1 旅遊規劃的痛點
（引用 `docs/market_research.html`：1141 篇 Reddit、8 大痛點）

- 痛點 1：行程規劃耗時（平均 X 小時）
- 痛點 2：推薦來源不透明（「為什麼推薦這個？」）
- 痛點 3：既有 AI 工具過度自動化，使用者失去控制感
- ...

### 1.2 目標使用者
（引用 `docs/wireframe.pdf` Persona 分析）

- Persona A：25–35 歲上班族，預算敏感
- Persona B：學生族群，追求 CP 值
- Persona C：家庭旅遊，需要彈性

### 1.3 決策問題定義
「如何讓 AI 在協助旅遊規劃時，既能給出具體建議，又讓使用者保有理解、質疑、修改的能力？」

對應的系統能力：
- 推薦景點 + 解釋原因
- 允許使用者改變偏好看結果變化
- 允許完全推翻 AI 建議自己加景點

### 1.4 為何這是一個 XAI 問題
（引用授課討論的 Mittelstadt et al. 2019、Adadi & Berrada 2018）

---

## Section II — 相關設計方法

### 2.1 既有旅遊 App 設計分析
（引用 `docs/market_research.html`：30+ 競品比較表）

| App | 自動化程度 | 可解釋性 | 使用者控制 |
|-----|----------|---------|-----------|
| Roam Around | 高 | 低 | 低 |
| Layla AI | 高 | 中 | 中 |
| TripAdvisor AI | 中 | 低 | 高 |
| 本專案 | 中低 | 高 | 高 |

### 2.2 XAI 設計框架文獻
- Post-hoc vs Intrinsic：本專案採 Intrinsic（公式即解釋）
- Local vs Global：本專案同時提供 Local（單景點因子）與 Global（整體公式權重）
- （其他引用放這）

### 2.3 人機協作自動化等級（LOA）
Sheridan & Verplank (1978) 十級自動化：
- 本專案定位 Level 4–5「AI 提出建議 + 人類決策」
- 放棄 Level 7+「AI 自主執行」的原因

### 2.4 本專案採用的設計方法總覽
1. Transparent weighted scoring（Layer 1）
2. What-if simulation（Layer 2）
3. Uncertainty visualization（Layer 3）

---

## 📌 撰寫備註

- [ ] 把你原本 Google Docs 的草稿貼進對應小節
- [ ] 補齊引用格式（APA 7th）
- [ ] 與 Section III 的技術細節交接：Section II 只談方法論，技術實作留給 Section III
- [ ] 字數目標：Section I ~1500 字、Section II ~2000 字
