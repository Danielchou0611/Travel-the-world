# 給 Apple 的色票 v2 同步(2026-05-11)

> 5/13 schema 對齊會議順手請她改 token。**不急、不阻塞**,她的整體視覺已很完整,只是色票需要跟 brand_preview / austin-fork 對齊。

---

## 用 Line / 私訊 給她(可直接複製)

```
孟蘋,順便提一個 5/13 對齊時可以一起做的:
我把品牌色票升級了一版 v2,參考 Aesop / Hara 原研哉 / Cereal 等藝術品牌。
你的版本(localhost:5174)還是舊配色。

只動 2 個現有色 + 加 2 個新色,你的 src/index.css 改 5 行即可:

舊 → 新:
  vermillion:  #C8472B → #BC4630   (Hara 朱印紅,投影機不偏螢光)
  washi:       #F5EFE3 → #F4EEE2   (Aesop Rice Cake,真和紙感)

新增:
  --sumi-warm: #544D4B   (body text 主色,比純黑柔)
  --kohaku:    #92BED2   (冷中介,給距離/交通 icon 用)

api.ts 的 MOCK_TRIP 內 XAI factors 也建議統一用品牌色,
而不是 #6366F1 / #10B981 / #F59E0B(這些跟我們浮世繪不搭):

xai.scores 改用:
  文化符合度  →  #1B3A5C  (prussian)
  美食符合度  →  #BC4630  (vermillion v2)
  自然符合度  →  #92BED2  (kohaku)
  探索 / 動線 →  #D4A574  (ochre)
  價格匹配    →  #544D4B  (sumi-warm)

完整文件:docs/competition/15_artistic_color_palette.md

不急,5/13 對齊會議順手改即可,沒先改也不影響整合測試。
- Ray
```

---

## 統一 token 一覽(5/13 對齊會議分發給全員)

```css
/* === Occupath 浮世繪色票 v2 (final) === */
:root {
  /* 主品牌(保留)*/
  --prussian: #1B3A5C;
  --prussian-deep: #0F2942;
  --prussian-night: #091A2B;

  /* Accent 暖 */
  --vermillion: #BC4630;          /* v2 改 */
  --vermillion-soft: #D96A4F;

  /* Accent 土 */
  --ochre: #D4A574;
  --ochre-deep: #A87E50;

  /* 紙底 */
  --washi: #F4EEE2;               /* v2 改 */
  --washi-warm: #EAE0CC;

  /* 中性 */
  --sumi: #1A1A1A;
  --sumi-warm: #544D4B;           /* v2 新 */
  --mist: #7A7A7A;

  /* 冷中介 */
  --kohaku: #92BED2;              /* v2 新 */
}
```
