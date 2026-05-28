import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
#from pydantic import BaseModel
#from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from fastapi.responses import Response
from playwright.async_api import async_playwright
from urllib.parse import quote
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
from gen_gm_ver8 import generate_itinerary, modify_itinerary, sequence_p_route

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

# 2. 定義前端傳來的資料結構
class SequencePRequest(BaseModel):
    spots: List[Dict[str, Any]]

# 3. 新增 API Endpoint
@app.post("/api/sequence_p_route")
async def api_sequence_p(req: SequencePRequest):
    logger.info("✨ 收到 P 人智能排序請求")
    result = sequence_p_route(spots=req.spots)
    
    if result["status"] == "success":
        return result
    else:
        raise HTTPException(status_code=500, detail=result["message"])

# --- 4. 定義前端傳過來的資料結構 (Pydantic Models) ---

# 對應前端的 TripPreferences
class GenerateRequest(BaseModel):
    # 🌟 核心修改 1：使用 Union 讓它同時接受 List (多城市) 或 str (單一城市)
    destination: Union[List[str], str] = ["京都"] 
    days: int
    budget: int
    interests: List[str]
    explorationStyle: int
    foodVsAttractions: int
    mustVisit: Optional[str] = ""
    ragContent: Optional[str] = ""
    # 🌟 核心修改 2：加上前端新增的 specialRequirements 欄位
    specialRequirements: Optional[str] = "" 
    # 新增：讓後端知道這次是 P 人或 J 人
    type: Optional[str] = "J"

    # 新增：P 人抽卡收藏的完整景點 JSON
    selectedSpots: List[Dict[str, Any]] = Field(default_factory=list)
# 對應聊天室修改的需求
class ModifyRequest(BaseModel):
    # 🌟 核心修改 3：這裡的 destination 也要跟著改成支援 List
    destination: Union[List[str], str] 
    current_itinerary: Dict[str, Any] 
    user_request: str
    user_prefs: Optional[Dict[str, Any]] = None # 預留接收前端的 user_pref


# --- 5. 建立 API 路由 (Endpoints) ---

@app.post("/api/generate")
async def api_generate(req: GenerateRequest):
    logger.info(f"🚀 收到前端生成請求，目的地：{req.destination}")
    logger.info(f"🧭 type: {req.type}")
    logger.info(f"📍 selectedSpots count from server.py: {len(req.selectedSpots)}")
    # 這裡直接將 req 轉成字典，結構已經完全適配我們修改後的 build_rag_prompt
    user_prefs_payload = req.dict()
    
    # 呼叫後端函數
    result = generate_itinerary(
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
    user_prefs = req.current_itinerary.get("preferences", {})
    result = modify_itinerary(
        current_itinerary=req.current_itinerary,
        user_request=req.user_request,
        user_prefs=user_prefs
    )
    
    if result["status"] == "success":
        return result
    else:
        raise HTTPException(status_code=500, detail=result["message"])
    
class ExportPdfRequest(BaseModel):
    html: str
    filename: str = "itinerary.pdf"


@app.post("/api/export-pdf")
async def export_pdf(payload: ExportPdfRequest):
    print("[PDF] request received", flush=True)
    print("[PDF] filename:", payload.filename, flush=True)
    print("[PDF] html length:", len(payload.html) if payload.html else 0, flush=True)
    if not payload.html:
        raise HTTPException(status_code=400, detail="Missing html")

    try:
        async with async_playwright() as p:
            print("[PDF] launch browser", flush=True)
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"],
            )

            try:
                print("[PDF] new page", flush=True)
                page = await browser.new_page(
                    viewport={
                        "width": 800,
                        "height": 1200,
                    },
                    device_scale_factor=1,
                )

                print("[PDF] prepare html", flush=True)

                pdf_fix_css = """
                <style>
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                html,
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 800px !important;
                    background: #ffffff !important;
                }

                .container {
                    width: 800px !important;
                    max-width: 800px !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    min-height: auto !important;
                }
                </style>
                """

                html = payload.html

                if "</head>" in html:
                    html = html.replace("</head>", f"{pdf_fix_css}</head>")
                else:
                    html = pdf_fix_css + html

                print("[PDF] set content", flush=True)

                await page.set_content(
                    html,
                    wait_until="domcontentloaded",
                    timeout=60000,
                )

                
                print("[PDF] set content", flush=True)
                await page.set_content(
                    payload.html,
                    wait_until="domcontentloaded",
                    timeout=60000,
                )

                print("[PDF] emulate media", flush=True)
                # 使用 screen CSS，不使用 print CSS
                await page.emulate_media(media="screen")

                print("[PDF] waiting fonts and images", flush=True)

                await page.evaluate(
                    """
                    async () => {
                        const timeout = (ms) =>
                            new Promise(resolve => setTimeout(resolve, ms));

                        if (document.fonts) {
                            await Promise.race([
                                document.fonts.ready,
                                timeout(10000)
                            ]);
                        }

                        const images = Array.from(document.images);

                        images.forEach(img => {
                            img.loading = 'eager';
                        });

                        const waitImages = Promise.all(
                            images.map(img => {
                                if (img.complete) {
                                    return Promise.resolve();
                                }

                                return new Promise(resolve => {
                                    img.onload = resolve;
                                    img.onerror = resolve;
                                });
                            })
                        );

                        await Promise.race([
                            waitImages,
                            timeout(10000)
                        ]);
                    }
                    """
                )

                print("[PDF] fonts and images done", flush=True)
                print("[PDF] calculate size", flush=True)
                # 計算 .container 實際高度，做成長頁 PDF
                size = await page.evaluate(
                    """
                    () => {
                        const target = document.querySelector('.container') || document.body;
                        const rect = target.getBoundingClientRect();

                        return {
                            width: Math.ceil(rect.width || 800),
                            height: Math.ceil(target.scrollHeight || rect.height)
                        };
                    }
                    """
                )
                print("[PDF] create pdf", flush=True)
                pdf_bytes = await page.pdf(
                    print_background=True,
                    width=f"{size['width']}px",
                    height=f"{size['height'] + 30}px",
                    margin={
                        "top": "0",
                        "right": "0",
                        "bottom": "0",
                        "left": "0",
                    },
                    prefer_css_page_size=False,
                )
                print("[PDF] pdf done", len(pdf_bytes), flush=True)
            finally:
                await browser.close()

        safe_filename = quote(payload.filename or "itinerary.pdf")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
            },
        )

    except Exception as e:
        print("PDF export failed:", e)
        raise HTTPException(status_code=500, detail=str(e))