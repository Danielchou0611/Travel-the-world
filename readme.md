```Bash
cd server

pip playwright

python -m playwright install chromium

uvicorn server:app --reload --port 8001

pdf下載的時候後端報錯的話: uvicorn server:app --loop asyncio --port 8001

cd front
npm install
npm run dev

```
