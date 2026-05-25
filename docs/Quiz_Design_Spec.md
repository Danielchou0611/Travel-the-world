# Quiz Page 視覺設計規格

此文件為專案中測驗相關頁面的完整視覺設計規格（QuizPage / ResultPage / PlanJPage / PlanPPage / ExplorePage），目標讓其他頁面或新專案能「完美移植」相同風格。

---

## 一、設計原則

- 語氣：沉靜、有溫度、帶點日式詩意（以大字體 + 留白傳達安定）。
- 層次：背景粒子 + 大面積字體（title）→ 中型說明文字 → 小型輔助文字。
- 互動：以微交互（scale、y-offset、opacity）強化按鈕回饋，避免突兀動能。
- 可用性：控制每個互動的可點擊面積（至少 44x44 px）與足夠對比。

---

## 二、視覺代碼（Design Tokens）

建議以 CSS 變數統一定義，便於移植與主題化。

/* colors */
:root {
  --washi: #fffaf6; /* 背景紙色 */
  --sumi-warm: #2b2b2b; /* 主要文字 */
  --prussian: #123041; /* J 主色 */
  --prussian-deep: #0f2836;
  --vermillion: #d9483b; /* P 主色 */
  --ochre: #d7a23a; /* 補色 */
  --mist: #6b7b86; /* 次要文字 */
  --washi-veil: rgba(255,250,246,0.6); /* 疊層 */
  --glass: rgba(255,255,255,0.8);
}

/* type scale */
--font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
--font-serif: 'Noto Serif TC', 'Hiragino Mincho ProN', serif;

/* spacing (8-point grid) */
--space-xxs: 4px; --space-xs: 8px; --space-sm: 12px; --space-md: 16px;
--space-lg: 24px; --space-xl: 32px; --space-xxl: 48px;

/* elevation */
--shadow-sm: 0 6px 18px rgba(11,27,42,0.06);
--shadow-md: 0 12px 34px rgba(11,27,42,0.08);

---

## 三、字體與排版

- Title（主要 heading）: serif display
  - size: 48–64px (desktop)，line-height: 1.05
  - weight: 400–500（視字體而定）
- Eyebrow / Small caps: sans display
  - size: 12–14px，letter-spacing: 1.2px，color: var(--mist)
- Body / Question text: serif
  - size: 18–22px（question）、14–16px（body），color: var(--sumi-warm)
- Caption / micro: sans
  - size: 12px，color: var(--mist)

響應式規則：在 768px 以下，title 減半、字距與 margin 緊縮 50%。保留可點擊按鈕大小。

---

## 四、元件樣式（樣式範例 CSS）

- Button (主 CTA)：
  - 背景：transparent 邊框＋accent 顏色描邊，hover 時填滿 accent
  - padding: 12px 18px, border-radius: 8px, min-height: 44px

- Option 按鈕（Quiz 選項）：
  - 背景：白色卡片 + 阴影；hover/press 使用 transform: translateY(-2px) scale(1.02)
  - margin: 12px 0；文字置中；寬度：100%

- Card（Quiz 卡片 / Result card / Spot card）：
  - padding: var(--space-md); border-radius: 14px; box-shadow: var(--shadow-sm);

- Progress bar：
  - track: height 8px, background: rgba(0,0,0,0.06), border-radius: 999px
  - fill: background linear-gradient(90deg, var(--ochre), var(--prussian))，transition width 600ms ease-out

---

## 五、色彩與狀態指引

- J（結構化）主題：主色 `var(--prussian)`，accent `#1B3A5C`，用於 `PlanJPage`、J 結果 CTA。
- P（隨性）主題：主色 `var(--vermillion)`，accent `#C8472B`，用於 `PlanPPage`、P 結果 CTA。
- 警示 / 限制：使用 `--ochre` 作為警示或重點提示底色，避免用紅色直接表示錯誤（維持溫和語氣）。

---

## 六、動畫與交互規格

- 全站互動時間：
  - 基礎入場/淡入：duration 600–900ms, ease: cubic-bezier(0.22, 1, 0.36, 1)
  - 按鈕 hover: scale 1.04, translateY: -2px, duration: 120–180ms
  - 按鈕 press: scale 0.96

- 進度條填充動畫：transition width 600ms ease-out
- 卡片切換（題目切換）：Y offset -50..50, opacity 0→1, duration 600ms
- 進入流程建議：引導頁的大幅文字淡入後再出現 CTA（stagger 400–800ms）

---

## 七、圖像/背景與粒子

- `ParticleBackground` 為核心視覺特效：
  - variants: `quiz`（中性且極輕）、`p`（暖色粒子）、`fuji`（冷色漸層）
  - 移植建議：提供一個輕量 fallback（CSS 漸層 + subtle noise）以兼顧效能。

---

## 八、元件 API 與可重用 class 建議

- 建議維持以下 className 命名，方便移植：
  - `.quiz-container`, `.quiz-card`, `.quiz-question`, `.quiz-options`, `.quiz-option`, `.quiz-progress`, `.quiz-intro-cta`, `.result-container`, `.result-cta`。
- 建議建立 `components/ui/` 小型元件庫（Button, Card, Badge, Slider）並以 props 支援 `variant` (e.g., `variant="primary"|"ghost"|"outline"`)。

---

## 九、無障礙（a11y）清單

- 每個按鈕應有 `aria-label` 或可被屏幕閱讀器讀取的文字。
- 色彩對比應通過 WCAG AA（主要文字與背景對比 >= 4.5:1）。
- 進度條需提供文字替代（例如 `aria-valuenow`、`aria-valuemin`、`aria-valuemax`）。

---

## 十、移植說明與交付物

建議交付給前端團隊：
- `design-tokens.css`（包含 :root 變數）
- `components/ui` 小型元件（Button, Card, Progress, Badge）
- `particle-fallback.css` 與簡單 JS 產生的 particle 方案（若無 WebGL）
- 一份 1-2 分鐘的示範 GIF 或短影片，示範題目切換、按鈕 hover、進度條動畫、結果分流。

---

檔案：`docs/Quiz_Design_Spec.md` 已建立於專案。需要我接著：
- 1) 產生 `design-tokens.css` 並放入 `src/styles/`，或
- 2) 將元件樣式示範寫成 `src/components/ui/` 的 `Button.jsx` 與 `Card.jsx` 範例？
