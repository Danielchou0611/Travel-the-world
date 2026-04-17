from __future__ import annotations

import os
import re
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_week2 import run_rag_prototype


load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class ExtractRequest(BaseModel):
    text: str = Field(min_length=1)
    query: str = Field(default="請列出文章中的旅遊景點名稱")
    top_k: int = Field(default=4, ge=1, le=10)
    reset_db: bool = False


def parse_spot_names(model_output: str) -> list[str]:
    lines = model_output.splitlines()
    names: list[str] = []
    for line in lines:
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(、:：]+", "", line).strip()
        if cleaned and cleaned not in names:
            names.append(cleaned)
    return names


app = FastAPI(title="Japan Travel RAG API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "gemini_api_key_set": bool(GEMINI_API_KEY),
    }


@app.post("/api/rag/extract")
def extract_spots(payload: ExtractRequest) -> dict[str, Any]:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing in backend/rag_prototype/.env")

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    try:
        result = run_rag_prototype(
            input_text=text,
            user_query=payload.query,
            top_k=payload.top_k,
            reset_db=payload.reset_db,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    spot_names = parse_spot_names(result.get("model_output", ""))

    return {
        "spot_names": spot_names,
        "embed_model": result.get("embed_model"),
        "gen_model": result.get("gen_model"),
        "generation_warning": result.get("generation_warning", ""),
        "raw_output": result.get("model_output", ""),
    }

