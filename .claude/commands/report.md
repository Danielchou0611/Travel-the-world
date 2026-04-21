---
description: 協助撰寫期末報告章節。用法：/report section-4 或 /report all
---

參數：`$ARGUMENTS`（如 `section-3`、`section-4`、`all`）

請依下列步驟協助報告撰寫：

1. 從 `CLAUDE.md` 的「Report Requirements」區塊確認該章節的主筆、撰寫週次與內容範圍
2. 檢查 `docs/report_section_*.md` 是否已有草稿
3. 按下列原則輸出：

### 如果是空白章節
- 給出章節目錄建議（3–5 個子節）
- 每個子節點出要引用的本專案素材（CLAUDE.md 的哪些區塊 / 哪個 spec / 哪份資料）
- 給 500 字以內的開頭段落示範

### 如果已有草稿
- 標出 3 個最需要強化的段落（邏輯、證據、連結 XAI 設計）
- 不要直接改寫；提出修改方向與替換片段

### 章節對應提醒
- **Section III 系統概述**：必須連回 `CLAUDE.md` Tech Stack + Repository Structure
- **Section IV 設計決策**：必須包含 3 條「選擇 / 放棄 / 適用條件」三段式，素材見 CLAUDE.md「Key Design Decisions」
- **Section V AI 角色**：需說明 AI 自主性等級（此專案為「中低自動化 — 輔助決策」）
- **Section VI 評估**：需包含冠霖的評分公式、孟蘋的 Persona 測試結果

注意：所有推薦邏輯都不能寫成 black-box，須強調 XAI 三層框架。
