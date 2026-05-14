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
ITINERARY_MIN_SPOTS = int(os.getenv("RAG_ITINERARY_MIN_SPOTS", "3"))
DAY_GROUP_MIN_SPOTS = max(1, int(os.getenv("RAG_DAY_GROUP_MIN_SPOTS", "2")))
URL_MIN_TOP_K = max(1, int(os.getenv("RAG_URL_MIN_TOP_K", "50")))
URL_READ_FULL_DOCUMENT = os.getenv("RAG_URL_READ_FULL_DOCUMENT", "false").strip().lower() in {"1", "true", "yes", "on"}
MERGE_CONSECUTIVE_DAY_GROUPS = os.getenv("RAG_MERGE_CONSECUTIVE_DAY_GROUPS", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

GENERIC_TAG_EXACT = {
    "景點",
    "景點名稱",
    "旅遊景點",
    "推薦景點",
    "熱門景點",
    "溫泉",
    "美景",
    "海中鳥居",
}

REGION_NAME_EXACT = {
    "日本",
    "東京",
    "東京綜合",
    "東京综合",
    "關西",
    "关西",
    "山陽山陰",
    "山阳山阴",
    "四國",
    "四国",
    "九州",
    "沖繩",
    "冲绳",
    "北陸",
    "中部",
    "京阪神",
    "世界遺產",
    "日本名城",
    "灣岸地區",
    "福岡",
    "佐賀",
    "長崎",
    "熊本",
    "大分",
    "宮崎",
    "鹿兒島",
    "鹿儿岛",
    "博多",
    "嬉野",
    "武雄",
    "別府",
    "别府",
    "柳川",
    "排大川",
    "五島",
}

GENERIC_SPOT_SUBSTRINGS = [
    "自由行",
    "行程",
    "攻略",
    "推薦",
    "查看更多",
    "常見問題",
    "客服",
    "平台",
    "方案",
    "商品",
    "懶人包",
    "教學",
    "一日遊",
    "二日遊",
    "三日遊",
    "四日遊",
    "半日遊",
]

TRANSPORT_NOISE_SUBSTRINGS = [
    "周遊券",
    "周游券",
    "票券",
    "套票",
    "車票",
    "车票",
    "觀光諮詢中心",
    "观光咨询中心",
    "旅客服務中心",
    "旅客服务中心",
]

STAY_SHOP_NOISE_SUBSTRINGS = [
    "飯店",
    "酒店",
    "旅館",
    "旅馆",
    "民宿",
    "套房",
    "別棟",
    "别栋",
]

SPOT_CANONICAL_MAP = {
    "东京": "東京",
    "东京车站": "東京車站",
    "关西": "關西",
    "山阳山阴": "山陽山陰",
    "四国": "四國",
    "冲绳": "沖繩",
    "横滨": "橫濱",
    "镰仓": "鎌倉",
    "轻井泽": "輕井澤",
    "长崎": "長崎",
    "门司港": "門司港",
    "成田机场": "成田機場",
    "羽田机场": "羽田機場",
    "うれしのお茶ちゃ村": "嬉野茶村",
    "うれしのお茶ちや村": "嬉野茶村",
}


class ExtractRequest(BaseModel):
    text: str = ""
    url: str = ""
    query: str = Field(default="請列出文章中的旅遊景點名稱")
    top_k: int = Field(default=4, ge=1, le=200)
    reset_db: bool = False
    debug: bool = True


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


def canonicalize_spot_name(name: str) -> str:
    cleaned = normalize_heading_text(name)
    cleaned = re.sub(r"^(東京綜合|東京综合|東京綜合版|東京综合版)", "", cleaned).strip()
    cleaned = re.sub(r"^(東京綜合|東京综合)", "", cleaned).strip()
    cleaned = re.sub(r"(版)$", "", cleaned).strip()
    normalized = normalize_for_match(cleaned).lower()
    if normalized in SPOT_CANONICAL_MAP:
        return SPOT_CANONICAL_MAP[normalized]
    return cleaned


def _contains_any_keyword(name: str, keywords: list[str]) -> bool:
    return any(keyword in name for keyword in keywords)


def _looks_like_region_name(name: str) -> bool:
    if name in REGION_NAME_EXACT:
        return True
    return bool(re.search(r"(縣|县|市|町|村|州|道|區|区)$", name)) and len(name) <= 4


def is_valid_spot_name(name: str) -> bool:
    if not name:
        return False
    if len(name) < 2 or len(name) > 22:
        return False
    if name in GENERIC_TAG_EXACT:
        return False
    if _looks_like_region_name(name):
        return False
    if _contains_any_keyword(name, TRANSPORT_NOISE_SUBSTRINGS):
        return False
    if _contains_any_keyword(name, STAY_SHOP_NOISE_SUBSTRINGS):
        return False
    if _contains_any_keyword(name, GENERIC_SPOT_SUBSTRINGS):
        return False
    if re.search(r"[?？!！]", name):
        return False
    return bool(re.search(r"[\u4e00-\u9fffA-Za-z]", name))


def classify_invalid_spot_name(name: str) -> str:
    if not name:
        return "empty"
    if len(name) < 2:
        return "too_short"
    if len(name) > 22:
        return "too_long"
    if name in GENERIC_TAG_EXACT:
        return "generic_tag"
    if _looks_like_region_name(name):
        return "generic_region"
    if _contains_any_keyword(name, TRANSPORT_NOISE_SUBSTRINGS):
        return "transport_or_ticket"
    if _contains_any_keyword(name, STAY_SHOP_NOISE_SUBSTRINGS):
        return "stay_or_shop"
    if _contains_any_keyword(name, GENERIC_SPOT_SUBSTRINGS):
        return "generic_phrase"
    if re.search(r"[?？!！]", name):
        return "punctuation_noise"
    if not re.search(r"[\u4e00-\u9fffA-Za-z]", name):
        return "non_text"
    return "unknown"


def clean_spot_names_with_debug(values: list[str], sample_limit: int = 20) -> tuple[list[str], dict[str, Any]]:
    names: list[str] = []
    seen_keys: set[str] = set()
    dropped_samples: list[dict[str, str]] = []
    reason_counts: dict[str, int] = {}

    for value in values:
        canonical_name = canonicalize_spot_name(value)
        if not is_valid_spot_name(canonical_name):
            reason = classify_invalid_spot_name(canonical_name)
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
            if len(dropped_samples) < sample_limit:
                dropped_samples.append(
                    {
                        "raw": str(value),
                        "canonical": canonical_name,
                        "reason": reason,
                    }
                )
            continue

        key = normalize_for_match(canonical_name).lower()
        if not key:
            reason_counts["empty_key"] = reason_counts.get("empty_key", 0) + 1
            if len(dropped_samples) < sample_limit:
                dropped_samples.append(
                    {
                        "raw": str(value),
                        "canonical": canonical_name,
                        "reason": "empty_key",
                    }
                )
            continue
        if key in seen_keys:
            reason_counts["duplicate"] = reason_counts.get("duplicate", 0) + 1
            if len(dropped_samples) < sample_limit:
                dropped_samples.append(
                    {
                        "raw": str(value),
                        "canonical": canonical_name,
                        "reason": "duplicate",
                    }
                )
            continue
        seen_keys.add(key)
        names.append(canonical_name)

    return names, {
        "raw_count": len(values),
        "clean_count": len(names),
        "dropped_count": max(0, len(values) - len(names)),
        "drop_reason_counts": reason_counts,
        "dropped_samples": dropped_samples,
    }


def clean_spot_names(values: list[str]) -> list[str]:
    names, _ = clean_spot_names_with_debug(values, sample_limit=0)
    return names


def normalize_heading_text(text: str) -> str:
    cleaned = re.sub(r"^[\-\*\d\.\)\(、:：\s▶]+", "", text).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def is_day_title(title: str) -> bool:
    return bool(re.search(r"^(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天)$", str(title or ""), flags=re.IGNORECASE))


def extract_itinerary_heading(text: str) -> str:
    line = normalize_heading_text(text)
    if not line:
        return ""

    line_prefix = line[:220]
    first_segment = re.split(r"[。！？!?]", line_prefix, maxsplit=1)[0].strip()
    if not first_segment:
        return ""

    if re.search(r"[?？]$", first_segment):
        return ""
    if re.search(r"(常見問題|費用項目|注意事項|溫馨提示|安全警示|說明|集合地點|查看更多|聯繫客服)", first_segment):
        return ""
    if re.search(r"(推薦|攻略|自由行|看這篇|總整理)", first_segment) and not re.search(r"(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天)", first_segment, flags=re.IGNORECASE):
        return ""

    # URL 來源文字常把 DayX 與內容黏在同段，允許在前綴中搜尋而非只在開頭。
    day_match = re.search(r"(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天)", line_prefix, flags=re.IGNORECASE)
    if day_match and day_match.start() <= 8:
        day_token = day_match.group(1)
        if re.search(r"^DAY", day_token, flags=re.IGNORECASE):
            number_match = re.search(r"\d+", day_token)
            if number_match:
                return f"DAY{number_match.group(0)}"
            return day_token.upper().replace(" ", "")
        # Chinese day tokens are treated as headings only when followed by a separator,
        # to avoid matching narrative sentences like "第四天要前往...".
        tail = first_segment[day_match.end() :].strip()
        if not tail or tail[0] in "：:【[（(、- ":
            return re.sub(r"\s+", "", day_token)

    if len(first_segment) > 70:
        return ""

    if re.search(r"^【[^】]{1,40}(一日遊|半日遊|二日遊|三日遊|四日遊|行程|自由行)[^】]{0,30}】", first_segment):
        return first_segment

    if re.search(r"^(【?\d+日遊】?|[①②③④⑤⑥⑦⑧⑨])", first_segment) and re.search(r"(行程|路線|路线|推薦)", first_segment):
        return first_segment

    if re.search(r"^行程重點", first_segment):
        return first_segment

    return ""


def _parse_chinese_number(token: str) -> int | None:
    token = str(token or "").strip()
    if not token:
        return None
    if token.isdigit():
        return int(token)

    digits = {
        "零": 0,
        "一": 1,
        "二": 2,
        "兩": 2,
        "两": 2,
        "三": 3,
        "四": 4,
        "五": 5,
        "六": 6,
        "七": 7,
        "八": 8,
        "九": 9,
    }
    if token == "十":
        return 10
    if "十" in token:
        left, right = token.split("十", maxsplit=1)
        tens = digits.get(left, 1) if left else 1
        if tens is None:
            return None
        ones = digits.get(right, 0) if right else 0
        if ones is None:
            return None
        return tens * 10 + ones
    return digits.get(token)


def extract_day_number_from_title(title: str) -> int | None:
    title_text = str(title or "").strip()
    day_match = re.match(r"^DAY\s*(\d+)$", title_text, flags=re.IGNORECASE)
    if day_match:
        try:
            return int(day_match.group(1))
        except ValueError:
            return None

    cn_day_match = re.match(r"^第([一二三四五六七八九十兩两0-9]+)天$", title_text)
    if cn_day_match:
        return _parse_chinese_number(cn_day_match.group(1))
    return None


def merge_consecutive_day_groups(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not groups:
        return []

    merged: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    start_day: int | None = None
    end_day: int | None = None

    def finalize_current() -> None:
        nonlocal current, start_day, end_day
        if current is None:
            return
        if start_day is not None and end_day is not None:
            current["title"] = f"DAY{start_day}" if start_day == end_day else f"DAY{start_day}-DAY{end_day}"
        current["spot_count"] = len(current.get("spot_names", []))
        merged.append(current)
        current = None
        start_day = None
        end_day = None

    for group in groups:
        day_number = extract_day_number_from_title(str(group.get("title", "")))
        normalized_group = {
            "group_id": group.get("group_id"),
            "title": str(group.get("title", "")),
            "spot_names": list(group.get("spot_names", [])),
            "spot_count": int(group.get("spot_count", len(group.get("spot_names", [])))),
            "chunk_indices": list(group.get("chunk_indices", [])),
        }

        if day_number is None:
            finalize_current()
            merged.append(normalized_group)
            continue

        if current is None:
            current = normalized_group
            start_day = day_number
            end_day = day_number
            continue

        current_end = end_day if end_day is not None else day_number
        is_new_itinerary = day_number == 1 and (start_day or 0) >= 1
        if is_new_itinerary or day_number < current_end:
            finalize_current()
            current = normalized_group
            start_day = day_number
            end_day = day_number
            continue

        current["spot_names"] = dedupe_keep_order(current["spot_names"] + normalized_group["spot_names"])
        current["chunk_indices"] = dedupe_keep_order(
            [str(i) for i in current["chunk_indices"]] + [str(i) for i in normalized_group["chunk_indices"]]
        )
        current["chunk_indices"] = [int(i) for i in current["chunk_indices"]]
        end_day = max(current_end, day_number)

    finalize_current()
    return merged


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


def build_itinerary_groups_with_debug(result: dict[str, Any], spot_names: list[str]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    chunks = result.get("chunks") or []
    if not chunks or not spot_names:
        return [], {
            "sections_total": 0,
            "sections_auto_title": 0,
            "candidate_groups_before_merge": 0,
            "groups_after_merge": 0,
            "dropped_section_count": 0,
            "dropped_sections": [],
        }

    sections = split_chunks_into_itinerary_sections(chunks)
    groups: list[dict[str, Any]] = []
    dropped_sections: list[dict[str, Any]] = []
    auto_title_count = 0

    for section in sections:
        if str(section.get("title", "")).startswith("行程 "):
            auto_title_count += 1

        text_parts = section.get("text_parts") or []
        section_text = " ".join(text_parts)
        normalized_section = normalize_for_match(section_text)

        group_spot_names = [
            name for name in spot_names if normalize_for_match(name) and normalize_for_match(name) in normalized_section
        ]
        group_spot_names = clean_spot_names(group_spot_names)

        required_spots = DAY_GROUP_MIN_SPOTS if is_day_title(str(section.get("title", ""))) else ITINERARY_MIN_SPOTS
        if len(group_spot_names) < required_spots:
            if len(dropped_sections) < 20:
                dropped_sections.append(
                    {
                        "title": str(section.get("title", "")),
                        "required_spots": required_spots,
                        "spot_count": len(group_spot_names),
                        "spot_preview": group_spot_names[:5],
                        "chunk_indices": section.get("chunk_indices", [])[:8],
                    }
                )
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
        return groups, {
            "sections_total": len(sections),
            "sections_auto_title": auto_title_count,
            "candidate_groups_before_merge": len(groups),
            "groups_after_merge": len(groups),
            "dropped_section_count": max(0, len(sections) - len(groups)),
            "dropped_sections": dropped_sections,
        }

    final_groups = merge_consecutive_day_groups(groups) if MERGE_CONSECUTIVE_DAY_GROUPS else groups
    return final_groups, {
        "sections_total": len(sections),
        "sections_auto_title": auto_title_count,
        "candidate_groups_before_merge": len(groups),
        "groups_after_merge": len(final_groups),
        "dropped_section_count": max(0, len(sections) - len(groups)),
        "dropped_sections": dropped_sections,
    }


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
    # Recover itinerary boundaries that are often flattened in website HTML.
    extracted_text = re.sub(
        r"(?i)(?<!\n)\s*(day\s*\d+)",
        r"\n\1",
        extracted_text,
    )
    extracted_text = re.sub(
        r"(?<!\n)\s*(第[一二三四五六七八九十0-9]+\s*天)",
        r"\n\1",
        extracted_text,
    )
    extracted_text = re.sub(
        r"(?<!\n)\s*((?:\d+\s*天(?:\s*\d+\s*夜)?|[一二三四五六七八九十]+\s*天).{0,12}(?:行程|路線|路线|範例))",
        r"\n\1",
        extracted_text,
    )
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

    effective_top_k = payload.top_k
    read_full_document = False
    if input_source == "url":
        effective_top_k = max(payload.top_k, URL_MIN_TOP_K)
        read_full_document = URL_READ_FULL_DOCUMENT

    try:
        result = run_rag_prototype(
            input_text=text,
            user_query=payload.query,
            top_k=effective_top_k,
            reset_db=payload.reset_db,
            read_full_document=read_full_document,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    spot_names = dedupe_keep_order(
        [item.strip() for item in (result.get("spot_names") or parse_spot_names(result.get("model_output", ""))) if item]
    )
    if not spot_names:
        spot_names = dedupe_keep_order(extract_names_with_fallback(" ".join(result.get("retrieved_chunks") or [])))
    spot_names, spot_clean_debug = clean_spot_names_with_debug(spot_names)

    spots = build_spots_payload(result, spot_names)
    itinerary_groups, group_debug = build_itinerary_groups_with_debug(result, spot_names)

    debug_metrics = {
        "chunk_count": len(result.get("chunks") or []),
        "retrieved_chunk_count": len(result.get("retrieved_chunks") or []),
        "retrieved_chunk_indices_count": len(result.get("retrieved_chunk_indices") or []),
        "read_full_document": read_full_document,
        "effective_top_k": effective_top_k,
        "spot_raw_count": spot_clean_debug.get("raw_count", 0),
        "spot_clean_count": spot_clean_debug.get("clean_count", 0),
        "spot_dropped_count": spot_clean_debug.get("dropped_count", 0),
        "group_count": len(itinerary_groups),
        "sections_total": group_debug.get("sections_total", 0),
        "sections_auto_title": group_debug.get("sections_auto_title", 0),
        "candidate_groups_before_merge": group_debug.get("candidate_groups_before_merge", 0),
        "groups_after_merge": group_debug.get("groups_after_merge", 0),
        "group_dropped_section_count": group_debug.get("dropped_section_count", 0),
    }

    debug_samples = {
        "spot_drop_reason_counts": spot_clean_debug.get("drop_reason_counts", {}),
        "spot_dropped_samples": spot_clean_debug.get("dropped_samples", []),
        "group_dropped_sections": group_debug.get("dropped_sections", []),
    }

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
        "debug_metrics": debug_metrics,
        "debug_samples": debug_samples if payload.debug else {},
    }
