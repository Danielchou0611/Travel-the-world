# Occupath 藝術配色升級 v2(2026-05-11)

> Agent 用 WebFetch 驗證 7 個藝術內涵高的真實品牌,交叉比對 Brandfetch / encycolorpedia 確認 hex,給出 v2 升級提案 + 完整 CSS token 表。
> **同步已套進** `austin-fork/src/styles.css` + `brand_preview.html`。

---

## TL;DR(5/12 開會時引用)

| 動作 | 原值 | 新值 | 借鑑 reference |
|------|------|------|-------------|
| ✅ 保留 | `--prussian #1B3A5C` | 不動 | (品牌核心)|
| ✅ 保留 | `--ochre #D4A574` | 不動 | Cereal #D6B187 親屬色 |
| ✅ 保留 | `--mist #7A7A7A` | 不動 | Studio Freight mid grey 一致 |
| ⚙️ 微調 | `--vermillion #C8472B` | **`#BC4630`** | Hara Design「朱印紅」— 漆器深度 |
| ⚙️ 微調 | `--washi #F5EFE3` | **`#F4EEE2`** | Aesop Rice Cake — 真和紙感 |
| ➕ 新增 | — | **`--sumi-warm #544D4B`** | Aesop Mine Shaft — body text 主色 |
| ➕ 新增 | — | **`--kohaku #92BED2`** | Cereal muted teal — 冷中介,地圖 / 交通 |

**核心邏輯**:**「兩冷 + 兩暖 + 三中性」張力結構升級**。每個色都升一檔,張力結構不變。

---

## 7 個 reference 摘要

| # | 品牌 | URL | 關鍵 hex | 借鑑點 |
|---|------|-----|---------|--------|
| 1 | **Aperture** | [aperture.org](https://aperture.org) | #1E2A3A 攝影深藍 / #C8332B 雜誌紅 | prussian-deep 可往 #1E2A3A 拉(印刷油墨黑藍)|
| 2 | **Studio Freight** | [studiofreight.com](https://studiofreight.com) | #FFD200 freight yellow / #7A7A7A | 「主色只要一個」— ochre 降階為 secondary |
| 3 | **Aesop** | [aesop.com](https://www.aesop.com) | #FFFEF2 Rice Cake / #252525 / #544D4B | washi 微調 + 新增 sumi-warm |
| 4 | **A24** | [a24films.com](https://a24films.com) | #000 / #FFF / campaign accent | vermillion 不全站用,留給「user 自己的行程」 |
| 5 | **NTS Radio** | [nts.live](https://www.nts.live) | #FE4365 hot pink | accent 要敢,但靜紅 / 動紅分階層 |
| 6 | **Hara Design Institute** | [hara.ndc.co.jp](https://hara.ndc.co.jp) | #B83A2E 朱印紅 / #E6E2DA | vermillion 從 #C8472B → #BC4630 |
| 7 | **Cereal** | [readcereal.com](https://readcereal.com) | #D6B187 / #92BED2 muted teal | 新增 kohaku 作為冷中介 |

---

## v2 完整 CSS token 表(已套用)

```css
:root {
  /* === 主品牌(保留) === */
  --prussian: #1B3A5C;
  --prussian-deep: #0F2942;
  --prussian-night: #091A2B;

  /* === Accent 暖(微調) === */
  --vermillion: #BC4630;          /* 從 #C8472B 改 — Hara 朱印紅 */
  --vermillion-soft: #D96A4F;     /* 保留 */

  /* === Accent 土(保留) === */
  --ochre: #D4A574;
  --ochre-deep: #A87E50;

  /* === 紙底(微調) === */
  --washi: #F4EEE2;               /* 從 #F5EFE3 改 — Aesop Rice Cake 感 */
  --washi-warm: #EAE0CC;          /* 保留 */

  /* === 中性 + 新增 === */
  --sumi: #1A1A1A;
  --sumi-warm: #544D4B;           /* 新增 — body text 主色 */
  --mist: #7A7A7A;

  /* === 冷中介(新增) === */
  --kohaku: #92BED2;              /* 新增 — 地圖 / 交通 / 距離 */
}
```

## 場景對應一覽

| Token | 主要場景 |
|-------|---------|
| `--prussian` | Hero 主視覺、結果頁標題、品牌 logo |
| `--prussian-night` | Dark section 過場、海報底 |
| `--vermillion` (新值) | CTA 按鈕、AI highlight 標籤、行程重點 pin |
| `--ochre` | 卡片邊框、評分星星、icon 線條 |
| `--washi` (新值) | Hero 背景、卡片底色、簡報主底 |
| `--sumi-warm` (新) | **Body text 主色**、引文 |
| `--kohaku` (新) | 地圖介面、交通 icon、distance chart |
| `--mist` | 滑桿軌道、disabled 狀態、表單描邊 |

---

## 印刷 / 投影機可行性

- ✅ 所有新色避開 RGB(255 / 0) 邊界,Pantone 對位:`--vermillion` ≈ Pantone 1805 C / `--kohaku` ≈ Pantone 543 C
- ✅ `--sumi-warm #544D4B` 在投影機下比純黑舒服,簡報內文用
- ✅ 沒有 pastel macaron 系也沒 cyberpunk neon,維持禪意 + 文學感

---

## 完整 reference 細節

(原 agent 回應全文,字數 3500 — 此處摘要,**完整版見上方 7 個 reference 表格**。Ray 30 分鐘可看完。)

### 看順序

| 順序 | 看什麼 | 時間 |
|------|--------|------|
| 必看 | [Hara Design Institute](https://hara.ndc.co.jp) — 朱印紅的真正樣子 | 5 分鐘 |
| 必看 | [Cereal](https://readcereal.com) — Occupath 美學對標,muted teal 用法 | 10 分鐘 |
| 必看 | [Aesop](https://www.aesop.com) — 紙感與 sumi-warm 用法 | 10 分鐘 |
| 加分 | [Studio Freight](https://studiofreight.com) — 主色只要一個的紀律 | 10 分鐘 |
| 加分 | [A24](https://a24films.com) — campaign-specific accent 策略 | 5 分鐘 |
| 加分 | [Aperture](https://aperture.org) — 攝影級印刷感 | 5 分鐘 |
| 加分 | [NTS Radio](https://www.nts.live) — 「靜紅 / 動紅」分階層 | 5 分鐘 |

---

## 還可以再升級的(v3,矽谷種子後)

- **動態色系**:春櫻粉 / 秋楓橙 / 冬雪藍 / 夏新茶綠(根據今天日期切配色)
- **A24 campaign accent**:每條使用者行程自動生成一個獨家 accent 色(取自景點主色)
- **印章紅 #D63D2E**(從 NTS hot pink 改良):極小面積用,Save / Like 等 micro-feedback

這 3 個 W8 / W9 整合後可考慮。
