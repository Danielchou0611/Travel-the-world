---
description: 產出組員任務簡報（單人或全員）。用法：/brief 珥豪 或 /brief all
---

參數：`$ARGUMENTS`（組員名字，或 `all`）

請依下列步驟產生任務簡報：

1. 從 `CLAUDE.md` 的「Team & Roles」欄位找到對應組員的角色與負責項目
2. 從「Current Progress Snapshot」與「Core Feature — MVP Scope」交叉比對其未完成工作
3. 按下列格式輸出：

## 📋 [組員名] 本週任務簡報

**角色**：[從 CLAUDE.md 抓]  
**主要卡點**：[最急迫的一項]

### 本週必須完成（Must）
- [ ] 任務 1｜預計 X 小時｜依賴：[誰]
- [ ] 任務 2

### 若時間允許（Nice to have）
- [ ] 任務 3

### 需要協調
- 與 [其他組員]：[要討論什麼]

### 參考文件
- `specs/mvp.md`
- `docs/API_Contract_v1.md`
- 其他相關檔案

4. 若 `$ARGUMENTS` = `all`，為每個組員各自產出一份簡報，格式相同

注意：不要跨越分工指派任務，只描述「這個人自己」的工作。
