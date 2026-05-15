#!/usr/bin/env bash
# Occupath v0 — 本機 e2e 啟動腳本
# 假設 5 個 branch 已用 git worktree checkout 到 ../branches/
# 使用方式:bash scripts/start-all.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANCHES="$ROOT/../branches"

echo "🌸 Occupath v0 啟動中..."

# ── 1. Django(李冠霖)on :8000 ──────────────────────────
echo "[1/4] 啟動 Django(李冠霖)on :8000"
osascript <<EOF
tell application "Terminal"
    do script "cd '$BRANCHES/Gary/backend' && python -m venv .venv 2>/dev/null; source .venv/bin/activate && pip install -q -r ../requirements.txt && python manage.py migrate && python manage.py runserver 8000"
end tell
EOF

sleep 3

# ── 2. Wen FastAPI(Gemini)on :8001 ─────────────────────
echo "[2/4] 啟動 Wen FastAPI on :8001"
osascript <<EOF
tell application "Terminal"
    do script "cd '$BRANCHES/wen' && python -m venv .venv 2>/dev/null; source .venv/bin/activate && pip install -q fastapi uvicorn google-generativeai pydantic && uvicorn server:app --reload --port 8001"
end tell
EOF

sleep 3

# ── 3. Austin RAG on :8010 ──────────────────────────────
echo "[3/4] 啟動 Austin RAG on :8010"
osascript <<EOF
tell application "Terminal"
    do script "cd '$ROOT/backend/rag_prototype' && source .venv/bin/activate 2>/dev/null || python -m venv .venv && source .venv/bin/activate && pip install -q -r requirements.txt && python api_server.py"
end tell
EOF

sleep 3

# ── 4. Frontend Vite on :5173 ───────────────────────────
echo "[4/4] 啟動前端 Vite on :5173"
cd "$ROOT"
[ ! -f .env.local ] && cp .env.example .env.local && echo "⚠️ 請先填寫 .env.local 的 API key"
npm install
npm run dev
