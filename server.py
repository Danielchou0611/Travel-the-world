from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api_log.txt", encoding='utf-8'), # 儲存日誌的 txt
        logging.StreamHandler()                                     # 同時在終端機印出
    ]
)
logger = logging.getLogger(__name__)
# 1. 匯入你寫好的 AI 核心邏輯
# 假設你的檔案名稱是 gen_gm_ver6.py
from gen_gm_ver7 import generate_itinerary, modify_itinerary

# 2. 建立 FastAPI 應用程式
app = FastAPI(title="JapanAI Travel Backend")

# 3. 設定 CORS (超級重要！)
# 因為前端在 localhost:5173，後端在 localhost:8000，這算跨網域
# 必須設定允許前端打 API 過來
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # 允許你的 Vite 前端網址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. 定義前端傳過來的資料結構 (Pydantic Models) ---

# 對應前端的 TripPreferences
class GenerateRequest(BaseModel):
    destination: str = "京都" # 預設京都，前端也可傳入
    days: int
    budget: int
    interests: List[str]
    explorationStyle: int
    foodVsAttractions: int
    mustVisit: Optional[str] = ""
    ragContent: Optional[str] = ""

# 對應聊天室修改的需求
class ModifyRequest(BaseModel):
    destination: str
    current_itinerary: Dict[str, Any] # 接收目前的完整 JSON
    user_request: str


# --- 5. 建立 API 路由 (Endpoints) ---

@app.post("/api/generate")
async def api_generate(req: GenerateRequest):
    logger.info(f"🚀 收到前端生成請求，目的地：{req.destination}")
    
    # 這裡直接將 req 轉成字典，結構已經完全適配我們修改後的 build_rag_prompt
    user_prefs_payload = req.dict()
    
    # 呼叫後端函數
    result = generate_itinerary(
        destination=req.destination, 
        user_prefs=user_prefs_payload
    )
    
    if result["status"] == "success":
        return result
    else:
        raise HTTPException(status_code=500, detail=result["message"])


@app.post("/api/modify")
async def api_modify(req: ModifyRequest):
    """
    接收聊天室對話與當前行程，進行局部修改
    """
    print(f"收到修改請求：{req.user_request}")
    
    result = modify_itinerary(
        destination=req.destination,
        current_itinerary=req.current_itinerary,
        user_request=req.user_request
    )
    
    if result["status"] == "success":
        return result
    else:
        raise HTTPException(status_code=500, detail=result["message"])