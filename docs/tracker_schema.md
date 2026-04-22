# 📊 專案進度表 v2 — Schema 說明

> 實體檔案：`小組工作/專案進度表_v2.xlsx`（不放進 repo，PM 本機維護）  
> 本檔案記錄 schema 設計，組員/Claude 需要時可以對照  
> 最後更新：2026/04/22

---

## 為何這樣設計

**三方目標同時達成**：
- 組員：填表動作從「6 分頁 × 多 section × 多欄位」降到「改 status + 週一行」
- PM：儀表板自動從 tasks 公式彙總，不用手工統計
- Claude：扁平表 + 固定值 + 英文欄名，上傳即可 parse，不用 PM 解釋

---

## 6 個分頁

| 分頁 | 作用 | 誰填 |
|------|-----|-----|
| 📖 如何使用 | 說明頁 | — |
| `home` | 儀表板（倒數 / 每人進度 / Epic 完成率 / Blocked 清單） | 全自動，不填 |
| `my_week` | 個人本週 filter view（下拉選自己） | 組員選名字 |
| `tasks` | **主表，所有任務** | 組員改自己的 row |
| `updates` | 每週寫字進度 | 組員每週五填 1 行 |
| `decisions` | 重大決策 log | PM 有決策就加 1 行 |

---

## `tasks` 欄位（12 欄，主表）

| 欄位 | 型別 | 固定值 / 格式 |
|------|-----|-------------|
| `id` | 文字 | `B01`–`B31`（baseline）、`T001`+（post-midterm） |
| `week` | 下拉 | `baseline` / `W11` / `W12` / `W13` / `W14` / `W15` / `W16` |
| `epic` | 下拉 | 16 個 Epic（見下表） |
| `task` | 自由文字 | outcome-oriented（「使用者可以 X」，不是「實作 Y」） |
| `owner` | 下拉 | 周珥豪 / 周宜學 / 王孟蘋 / 顏伯亨 / 李冠霖 / 溫晨楷 |
| `status` | 下拉 | `Not Started` / `In Progress` / `Blocked` / `Review` / `Done` |
| `done_criteria` | 自由文字 | 可驗收的條件 |
| `depends_on` | 文字 | task id 逗號分隔（如 `T001,T002`）或空 |
| `hours_est` | 數字 | 預估工時 |
| `hours_actual` | 數字 | 實際工時（結束後回填） |
| `last_updated` | 日期 | `YYYY-MM-DD` |
| `notes` | 自由文字 | 備注、連結、重疊說明 |

**顏色會自動跟 status 變**（條件式格式）：
- Done 綠 / In Progress 黃 / Blocked 紅 / Review 藍 / Not Started 灰

---

## Epic 清單（16 個）

**A 類（不可砍）**：E1–E9, E11, E12, E13
- E1 AI 行程生成、E2 行程編輯器、E3 地圖動線
- E4 XAI Layer 1 因子、E5 XAI Layer 2 What-if、E6 XAI Layer 3 警示
- E7 Backend Platform、E8 Data Pipeline、E9 Report
- E11 Deployment、E12 QCQA、E13 Demo

**B 類（加分）**：E10, F1–F3
- E10 Plus 2 RAG（伯亨已有 prototype）
- F1 預算拆解 AI（新功能，晨楷 prompt + 孟蘋 UI）
- F2 Persona 快速開始（新功能，孟蘋 Landing）
- F3 PDF 匯出（新功能，孟蘋）

Plus 1 AI 助手已被砍（見 `decisions` log）。

---

## `updates` 欄位

```
week | owner | done_this_week | plan_next_week | blockers | submitted_at
```

每週五 22:00 前，每人填自己該週那一行的 3 個欄位（done / plan / blockers）。
已預先為 W11–W16 × 6 人產出 36 個空 row，只要填字即可。

---

## `decisions` 欄位

```
date | decision | context | decided_by | affects
```

`affects` 欄位用 Epic id 或 `all`。已預填 5 條 W10 期中考週的重大決策。

---

## Claude 使用情境

PM 把本 xlsx 上傳到 Claude 後，可以問：

- 「本週週報幫我產」 → Claude 讀 updates + tasks 算
- 「這週誰要催？」 → Claude 看 Not Started + 距 deadline
- 「Blocked 的 task 建議怎麼解？」 → Claude 看 notes + depends_on
- 「幫我更新 progress.md」 → Claude 同步到 repo
- 「W13 的負擔均勻嗎？」 → Claude 依 hours_est 算每人總工時

**不要做的事**（會破壞 Claude parse）：
- 改欄位名稱
- 合併儲存格
- 在 tasks 中插入 section 標題 row
- 日期不統一（必須 `YYYY-MM-DD`）
- 狀態手打而非下拉（拼錯會漏）
