# 🧠 XAI Design Spec — Japan Travel App

> 本專案的可解釋 AI 設計，是期末報告 Section IV、V 的核心素材  
> 修改需討論：冠霖（公式）、晨楷（LLM）、孟蘋（UI 呈現）

---

## 設計原則

1. **透明優先於準確**：我們寧願用公式可解釋的加權模型，也不用 black-box 的 ML 推薦
2. **使用者保有否決權**：AI 是建議，不是決定，使用者必須可以刪除 / 調整
3. **不確定性可見**：資料不足、AI 無法確定時，明說「這裡我不確定」

---

## Layer 1 — 推薦因子透明化

### 評分公式

```
finalScore = 0.7 × baseScore + 0.3 × scheduleScore

baseScore = 0.4 × normalized(googleRating)
          + 0.3 × normalized(log(reviewCount))
          + 0.2 × interestMatch
          + 0.1 × routeEfficiency
```

### 各因子定義

| 因子 | 資料來源 | normalize 方法 | 權重 |
|------|---------|---------------|------|
| googleRating | Google Places API `rating` | `(rating - 3.0) / 2.0`，clip [0, 1] | 0.4 |
| reviewCount | Google Places API `user_ratings_total` | `log10(count+1) / log10(500000+1)` | 0.3 |
| interestMatch | User preferences × 景點 categories | Jaccard similarity | 0.2 |
| routeEfficiency | Distance Matrix API | 距下一景點 < 5km → 1，> 30km → 0，線性 | 0.1 |

### UI 呈現（孟蘋）

景點卡片右上角 ⓘ icon，點擊展開：
```
淺草寺  ⭐ 0.87
┌──────────────────────┐
│ 因子貢獻：              │
│ Google評分    ████ 36% │
│ 評論數        ███  27% │
│ 符合你的興趣   ██   20% │
│ 動線效率      ▌    4%  │
└──────────────────────┘
```

### 驗收標準
- [ ] 每個景點回傳 `xai_factors` 四欄位皆有值
- [ ] 權重加總 = 1.0（±0.01）
- [ ] UI 點擊 ⓘ 後 < 200ms 顯示因子圖

**Owner**：冠霖（公式）+ 孟蘋（UI）

---

## Layer 2 — What-if 情境模擬

### 功能描述

使用者調整偏好滑桿「輕鬆型 ↔ 探索型」，前端**即時**重新排序景點（不重打 Gemini）。

### 技術實作

- 滑桿值 `paceFactor` ∈ [0, 1]（0 = 輕鬆、1 = 探索）
- 前端重算：`adjustedScore = baseScore × (1 - 0.3 × |paceFactor - targetPace|)`
- 重新排序每日景點，top-N 保留

### 額外提示

當使用者調整預算滑桿時，顯示：
> 「如果預算再加 ¥2,000，可以加入〈清水寺〉（評分 0.91）」

### 為何不重打 API

- 延遲 2–5 秒的等待會破壞互動感
- Gemini API 費用會疊加
- 重排邏輯本身透明可控，使用者可驗證

### 驗收標準
- [ ] 滑桿拖動時 < 50ms 內完成重排
- [ ] 排序結果可還原（滑回原位時結果一致）

**Owner**：孟蘋（UI + 重排邏輯）+ 冠霖（演算法）

---

## Layer 3 — 失敗說明與不確定性標示

### 三種主要場景

#### 1. 行程過密警示
- 觸發條件：某天 `item_count > 4` OR `總時長 > 10 小時`
- UI：該日標題右側黃色 🟡 徽章「行程過密」
- 說明：「Day 3 排了 5 個景點，可能會太趕，建議移一個到其他天」

#### 2. 景點資料不足
- 觸發條件：`reviewCount < 50` OR `無 google_rating`
- UI：景點卡片灰底警示「資料較少，建議參考其他來源」
- 後端在 `xai_factors.confidence_note` 回傳說明

#### 3. AI 不確定性
- Gemini 回應中若某景點 `confidence < 0.7`，卡片上顯示「AI 對此景點信心較低」
- 涉及時刻表、票價時強制加註「以官方網站為準」

### 驗收標準
- [ ] 3 種警示都能在 mock data 中觸發
- [ ] 警示可被使用者點擊「我知道了」關閉
- [ ] 不濫用警示（< 10% 景點觸發）

**Owner**：晨楷（後端檢查邏輯）+ 孟蘋（UI）

---

## 🚫 明確不做的 XAI 反模式

- ❌ 「AI 推薦」但不說為什麼（black-box）
- ❌ 只有一個總分沒有分解（無 factors）
- ❌ 假裝 100% 確定（無 uncertainty indicator）
- ❌ 不允許使用者推翻 AI 建議（無 override）

任何違反上述原則的功能都要擋下來不實作。

---

## 📚 報告引用

- Section IV「設計決策」：引用三個 XAI 層次作為「可解釋性 vs 準確度」取捨的具體做法
- Section V「AI 角色與自主性」：以此設計說明為何本系統屬於「中低自動化 — 輔助決策」
- Section VI「評估系統」：評估指標包含「使用者是否能說出 AI 推薦的原因」
