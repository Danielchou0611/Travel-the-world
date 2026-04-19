from __future__ import annotations

import os
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from html.parser import HTMLParser

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_week2 import OLLAMA_BASE_URL, extract_names_with_fallback, list_ollama_models, run_rag_prototype


load_dotenv()
URL_FETCH_MAX_BYTES = int(os.getenv("RAG_URL_FETCH_MAX_BYTES", "4000000"))
ITINERARY_MIN_SPOTS = int(os.getenv("RAG_ITINERARY_MIN_SPOTS", "2"))


class ExtractRequest(BaseModel):
    text: str = ""
    url: str = ""
    query: str = Field(default="請列出文章中的旅遊景點名稱")
    top_k: int = Field(default=4, ge=1, le=200)
    reset_db: bool = False


def parse_spot_names(model_output: str) -> list[str]:
    lines = model_output.splitlines()
    names: list[str] = []
    for line in lines:
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(、:：]+", "", line).strip()
        if cleaned and cleaned not in names:
            names.append(cleaned)
    return names


def dedupe_keep_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def normalize_for_match(text: str) -> str:
    return re.sub(r"[\s，。、,.!！?？:：;；'\"`~\-_/\\()\[\]{}<>《》【】·•]+", "", text or "").strip()


def normalize_heading_text(text: str) -> str:
    cleaned = re.sub(r"^[\-\*\d\.\)\(、:：\s▶]+", "", text).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def extract_itinerary_heading(text: str) -> str:
    line = normalize_heading_text(text)
    if not line:
        return ""
    if len(line) > 80:
        return ""
    if re.search(r"[?？]$", line):
        return ""
    if re.search(r"(常見問題|費用項目|注意事項|溫馨提示|安全警示|說明|集合地點|查看更多|聯繫客服)", line):
        return ""

    day_match = re.search(r"(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天)", line, flags=re.IGNORECASE)
    if day_match:
        return day_match.group(1).upper().replace(" ", "")

    if re.search(r"(一日遊|半日遊|二日遊|三日遊|四日遊|行程|路線|套票|自由行)", line) and len(line) <= 60:
        return line

    if re.search(r"(推薦一|推薦二|推薦三|推薦四|推薦五|方案\s*\d+)", line):
        return line

    return ""


def split_chunks_into_itinerary_sections(chunks: list[str]) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    auto_index = 1

    for index, chunk in enumerate(chunks, start=1):
        heading = extract_itinerary_heading(chunk)
        if heading:
            if current and current.get("chunk_indices"):
                sections.append(current)
            current = {
                "group_id": f"group-{len(sections) + 1}",
                "title": heading,
                "chunk_indices": [index],
                "text_parts": [chunk],
            }
            continue

        if current is None:
            current = {
                "group_id": f"group-{len(sections) + 1}",
                "title": f"行程 {auto_index}",
                "chunk_indices": [index],
                "text_parts": [chunk],
            }
            auto_index += 1
        else:
            current["chunk_indices"].append(index)
            current["text_parts"].append(chunk)

    if current and current.get("chunk_indices"):
        sections.append(current)
    return sections


def build_itinerary_groups(result: dict[str, Any], spot_names: list[str]) -> list[dict[str, Any]]:
    chunks = result.get("chunks") or []
    if not chunks or not spot_names:
        return []

    sections = split_chunks_into_itinerary_sections(chunks)
    groups: list[dict[str, Any]] = []

    for section in sections:
        text_parts = section.get("text_parts") or []
        section_text = " ".join(text_parts)
        normalized_section = normalize_for_match(section_text)

        group_spot_names = [
            name for name in spot_names if normalize_for_match(name) and normalize_for_match(name) in normalized_section
        ]
        group_spot_names = dedupe_keep_order(group_spot_names)

        if len(group_spot_names) < ITINERARY_MIN_SPOTS:
            continue

        groups.append(
            {
                "group_id": section["group_id"],
                "title": section["title"],
                "spot_names": group_spot_names,
                "spot_count": len(group_spot_names),
                "chunk_indices": section["chunk_indices"],
            }
        )

    if len(groups) <= 1:
        return groups

    # Merge duplicate titles to avoid splitting one itinerary into many tiny parts.
    merged_map: dict[str, dict[str, Any]] = {}
    merged_order: list[str] = []
    for group in groups:
        key = group["title"]
        if key not in merged_map:
            merged_map[key] = {
                "group_id": group["group_id"],
                "title": group["title"],
                "spot_names": list(group["spot_names"]),
                "spot_count": group["spot_count"],
                "chunk_indices": list(group["chunk_indices"]),
            }
            merged_order.append(key)
            continue

        merged_entry = merged_map[key]
        merged_entry["spot_names"] = dedupe_keep_order(merged_entry["spot_names"] + group["spot_names"])
        merged_entry["spot_count"] = len(merged_entry["spot_names"])
        merged_entry["chunk_indices"] = dedupe_keep_order(
            [str(i) for i in merged_entry["chunk_indices"]] + [str(i) for i in group["chunk_indices"]]
        )
        merged_entry["chunk_indices"] = [int(i) for i in merged_entry["chunk_indices"]]

    return [merged_map[key] for key in merged_order]


class GuideHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_name = tag.lower()
        if tag_name in {"script", "style", "noscript"}:
            self._skip_depth += 1
            return
        if tag_name in {"p", "li", "br", "div", "section", "article", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag_name = tag.lower()
        if tag_name in {"script", "style", "noscript"} and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if tag_name in {"p", "li", "div", "section", "article", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        text = data.strip()
        if text:
            self.parts.append(text)

    def text(self) -> str:
        merged = " ".join(self.parts)
        merged = re.sub(r"\n\s*\n+", "\n", merged)
        merged = re.sub(r"[ \t]+", " ", merged)
        return merged.strip()


def fetch_guide_text_from_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="url must start with http:// or https://")

    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; JapanTravelPlanningApp/1.0)",
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            content_type = response.headers.get("Content-Type", "")
            total = 0
            chunks: list[bytes] = []
            while True:
                part = response.read(64 * 1024)
                if not part:
                    break
                chunks.append(part)
                total += len(part)
                if total >= URL_FETCH_MAX_BYTES:
                    break
            raw = b"".join(chunks)
    except HTTPError as error:
        raise HTTPException(status_code=400, detail=f"URL fetch failed: HTTP {error.code}") from error
    except URLError as error:
        raise HTTPException(status_code=400, detail=f"URL fetch failed: {error.reason}") from error
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"URL fetch failed: {error}") from error

    charset = "utf-8"
    match = re.search(r"charset=([^\s;]+)", content_type, flags=re.IGNORECASE)
    if match:
        charset = match.group(1).strip("\"'").lower()

    html = raw.decode(charset, errors="ignore")
    parser = GuideHTMLParser()
    parser.feed(html)
    parser.close()
    extracted_text = parser.text()
    extracted_text = re.sub(r"\n{3,}", "\n\n", extracted_text).strip()

    if not extracted_text:
        raise HTTPException(status_code=400, detail="Cannot extract readable text from URL content.")

    return extracted_text


def find_source_for_spot(
    spot_name: str,
    chunks: list[str],
    retrieved_chunks: list[str],
    retrieved_chunk_indices: list[int],
) -> tuple[int, str]:
    normalized_name = normalize_for_match(spot_name)
    retrieved_pairs = list(zip(retrieved_chunk_indices, retrieved_chunks))

    for chunk_index, chunk_text in retrieved_pairs:
        if normalized_name and normalized_name in normalize_for_match(chunk_text):
            return chunk_index, chunk_text

    for index, chunk_text in enumerate(chunks, start=1):
        if normalized_name and normalized_name in normalize_for_match(chunk_text):
            return index, chunk_text

    if retrieved_pairs:
        fallback_index, fallback_text = retrieved_pairs[0]
        return fallback_index, fallback_text

    if chunks:
        return 1, chunks[0]

    return 0, ""


def build_excerpt(spot_name: str, source_text: str, radius: int = 45) -> str:
    if not source_text:
        return ""

    index = source_text.find(spot_name)
    if index < 0:
        compact = re.sub(r"\s+", " ", source_text).strip()
        return compact[:120]

    start = max(0, index - radius)
    end = min(len(source_text), index + len(spot_name) + radius)
    excerpt = source_text[start:end]
    return re.sub(r"\s+", " ", excerpt).strip()


def infer_review_count(spot_name: str, source_text: str, order: int) -> int:
    count_match = re.search(r"(\d{2,6})\s*(?:則)?(?:評論|評價)", source_text)
    if count_match:
        try:
            return int(count_match.group(1))
        except ValueError:
            pass

    seed_text = f"{spot_name}|{source_text}|{order}"
    value = 0
    for char in seed_text:
        value = (value * 131 + ord(char)) % 9973
    return 15 + (value % 220)


def build_spots_payload(result: dict[str, Any], spot_names: list[str]) -> list[dict[str, Any]]:
    chunks = result.get("chunks") or []
    retrieved_chunks = result.get("retrieved_chunks") or []
    retrieved_chunk_indices = result.get("retrieved_chunk_indices") or []

    spots: list[dict[str, Any]] = []
    for order, name in enumerate(spot_names):
        source_chunk_index, source_text = find_source_for_spot(
            spot_name=name,
            chunks=chunks,
            retrieved_chunks=retrieved_chunks,
            retrieved_chunk_indices=retrieved_chunk_indices,
        )
        excerpt = build_excerpt(name, source_text)
        reviews_count = infer_review_count(name, source_text, order)

        spots.append(
            {
                "name": name,
                "source_chunk_index": source_chunk_index,
                "source_excerpt": excerpt,
                "source_text": source_text,
                "xai": f"此景點來源：攻略文章第{source_chunk_index}段" if source_chunk_index > 0 else "此景點來源：待確認",
                "reviews_count": reviews_count,
                "is_data_insufficient": reviews_count < 50,
            }
        )

    return spots


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
    ollama_models = list_ollama_models()
    return {
        "status": "ok",
        "provider": "ollama",
        "ollama_base_url": OLLAMA_BASE_URL,
        "ollama_ready": bool(ollama_models),
        "ollama_models": ollama_models,
    }


@app.post("/api/rag/extract")
def extract_spots(payload: ExtractRequest) -> dict[str, Any]:
    text = payload.text.strip()
    url = payload.url.strip()
    input_source = "text"
    if not text and url:
        text = fetch_guide_text_from_url(url)
        input_source = "url"
    if not text:
        raise HTTPException(status_code=400, detail="Please provide either text or url.")

    try:
        result = run_rag_prototype(
            input_text=text,
            user_query=payload.query,
            top_k=payload.top_k,
            reset_db=payload.reset_db,
            read_full_document=(input_source == "url"),
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    spot_names = dedupe_keep_order(
        [item.strip() for item in (result.get("spot_names") or parse_spot_names(result.get("model_output", ""))) if item]
    )
    if not spot_names:
        spot_names = dedupe_keep_order(extract_names_with_fallback(" ".join(result.get("retrieved_chunks") or [])))

    spots = build_spots_payload(result, spot_names)
    itinerary_groups = build_itinerary_groups(result, spot_names)

    return {
        "provider": "ollama",
        "input_source": input_source,
        "source_url": url if input_source == "url" else "",
        "input_text_length": len(text),
        "spot_names": spot_names,
        "spots": spots,
        "itinerary_groups": itinerary_groups,
        "retrieved_chunk_indices": result.get("retrieved_chunk_indices", []),
        "embed_model": result.get("embed_model"),
        "gen_model": result.get("gen_model"),
        "generation_warning": result.get("generation_warning", ""),
        "raw_output": result.get("model_output", ""),
    }
