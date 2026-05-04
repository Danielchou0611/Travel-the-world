@echo off

echo ==============================
echo Start Backend (FastAPI)
echo ==============================

start cmd /k "cd /d C:\NTU_YANBH\WebAPP1\project\backend\rag_prototype && .venv\Scripts\python -m uvicorn api_server:app --host 127.0.0.1 --port 8010"

echo ==============================
echo Start Frontend (Node)
echo ==============================

start cmd /k "cd /d C:\NTU_YANBH\WebAPP1\project && npm run dev"

echo ==============================
echo All services are now active.
echo ==============================

pause