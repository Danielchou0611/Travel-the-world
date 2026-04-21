---
description: XAI 設計諮詢。用法：/xai layer-1、/xai review <file>、/xai factors
---

參數：`$ARGUMENTS`

### 背景
本專案的 XAI 三層框架（詳見 `CLAUDE.md` 與 `specs/xai_design.md`）：
- **Layer 1 推薦因子透明化**：加權公式 `Score = 0.4×Google評分 + 0.3×log(評論數) + 0.2×符合興趣 + 0.1×動線效率`
- **Layer 2 What-if 情境模擬**：前端即時重排，不重打 API
- **Layer 3 失敗說明與不確定性**：行程過密警示、資料不足標示

### `/xai layer-1` | `layer-2` | `layer-3`
解釋該層設計、目前實作狀態、對應 component/ API、報告可寫的要點。

### `/xai review <file>`
檢查指定檔案：
1. 是否有 black-box 推薦邏輯（有→指出並建議拆解成可解釋因子）
2. 推薦結果是否回傳 `xai_reason` / `xai_factors`
3. UI 是否有「ⓘ」按鈕展開因子分解
4. 給出具體修改建議（不要代寫，指方向）

### `/xai factors`
列出目前評分公式中的 4 個因子、權重、資料來源、冠霖負責的檔案，並檢查權重加總是否為 1.0。

### `/xai uncertainty`
檢查系統是否已實作不確定性標示：
- 景點評論 < 50 → 顯示「資料較少」
- 某天景點 > 4 個 → 顯示「行程過密」
- Gemini 回應的 confidence 是否傳回前端

注意：任何推薦功能若不符合 XAI 三層原則，必須擋下不實作。
