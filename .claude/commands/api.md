---
description: 檢視或驗證 API Contract。用法：/api list、/api check /api/trips/{id}/generate/
---

參數：`$ARGUMENTS`

請依參數執行：

### `/api list`
列出 `docs/API_Contract_v1.md` 所有 endpoint，格式：

| Method | Path | Owner | 狀態 | 用途 |
|--------|------|-------|------|------|
| POST | /api/trips/ | 珥豪 | ⬜ 未實作 | 建立行程 |

### `/api check <path>`
對該 endpoint：
1. 顯示 Contract 中定義的 Request / Response schema
2. 搜尋 backend `trips/views.py`、`trips/serializers.py` 是否有對應實作
3. 搜尋 frontend `src/services/api.ts` 是否已有呼叫
4. 指出三邊（Contract / Backend / Frontend）的差異，並提醒誰要改

### `/api xai <path>`
檢查該 endpoint 是否符合 XAI 規範：
- 推薦類 endpoint 必須回傳 `xai_reason` 或 `xai_factors`
- 若缺失，提醒補上並提供欄位範例

注意：Contract 修改前必須與珥豪、晨楷（後端）+ 孟蘋（前端）確認。
