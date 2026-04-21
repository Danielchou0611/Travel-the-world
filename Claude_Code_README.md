# Claude Code 專案整合套件

這個資料夾包含了讓 Claude Code 能快速理解本專案的所有檔案。

## 🚀 快速開始

### 步驟 1：安裝 Claude Code

在 VSCode 或 Terminal 安裝：
```bash
npm install -g @anthropic-ai/claude-code
```

或在 VSCode 直接安裝 Claude Code 擴充套件（Extensions → 搜尋 "Claude Code"）

### 步驟 2：把這些檔案放進專案根目錄

```
your-project-root/
├── CLAUDE.md                    ← 放這裡（必要）
├── .clauderules                 ← 放這裡（必要）
├── .mcp.json                    ← 若要用 MCP（選用）
├── .claude/
│   └── commands/
│       ├── status.md
│       ├── brief.md
│       ├── report.md
│       ├── api.md
│       ├── standup.md
│       └── xai.md
├── docs/
│   ├── API_Contract_v1.md
│   ├── progress.md
│   ├── market_research.html     ← 孟蘋的市調報告（請自行放入）
│   ├── wireframe.pdf            ← 孟蘋的 Figma PDF（請自行放入）
│   ├── rag_architecture.md      ← 伯亨的 RAG 文件（請自行放入）
│   └── report_section_I_II.md   ← 宜學的報告草稿
└── specs/
    ├── mvp.md
    ├── xai_design.md
    └── db_schema.md
```

### 步驟 3：啟動 Claude Code

在 VSCode Terminal 執行：
```bash
claude
```

Claude Code 會自動讀取 `CLAUDE.md` 與 `.clauderules`，知道專案的完整上下文。

## 📋 自訂指令（Slash Commands）使用方式

在 Claude Code 對話框內輸入以下指令：

| 指令 | 用途 | 範例 |
|------|------|------|
| `/status` | 查看目前專案進度 | `/status` |
| `/brief` | 產出組員任務簡報 | `/brief 珥豪` |
| `/report` | 協助撰寫報告 | `/report section-4` |
| `/api` | 檢視 API Contract | `/api list` |
| `/standup` | 產出週會摘要 | `/standup` |
| `/xai` | XAI 設計諮詢 | `/xai layer-1` |

## 🔧 常用操作示範

### 讓 Claude Code 幫你 code review
```
> 幫我 review 這個檔案：trips/views.py
```

### 產出本週標準會議摘要
```
> /standup
```

### 寫報告第四章
```
> /report section-4
```

### 檢查 API 實作是否符合 Contract
```
> /api check /api/trips/{id}/generate/
```

## 💡 使用技巧

1. **一次專注一件事**: Claude Code 在單一檔案或功能上效果最好
2. **搭配 git**: 在每次讓 Claude 修改前先 commit，方便回滾
3. **用 slash command 統一格式**: 避免每次重新解釋需求
4. **定期更新 CLAUDE.md**: 專案有重大變動時（技術棧、分工）請更新

## ⚠️ 注意事項

- `CLAUDE.md` 是 Claude Code 理解專案的核心，請保持更新
- `.clauderules` 定義了編碼規範，修改時請先與組員討論
- `.mcp.json` 若要用 GitHub MCP，需要建立 Personal Access Token
- `specs/` 資料夾是各功能的規格，修改需通知相關組員

## 🤖 Claude Code 會怎麼幫你

根據 `CLAUDE.md` 的設定，Claude Code 會：

1. 了解每個檔案的 owner，不會跨越分工直接改程式
2. 遵守 `.clauderules` 的編碼規範（Python PEP 8、TypeScript strict mode）
3. 所有 API 實作對照 `docs/API_Contract_v1.md`
4. 任何推薦邏輯必須包含 XAI 解釋（不寫 black-box）
5. 付費功能（見 CLAUDE.md）絕對不實作
6. 寫完功能會提醒更新對應的報告章節

---

*由 PM 宜學整理，本文件請所有組員閱讀。*
