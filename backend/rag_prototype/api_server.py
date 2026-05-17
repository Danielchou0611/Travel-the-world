from __future__ import annotations

import os
import re
import json
from functools import lru_cache
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from html.parser import HTMLParser

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_week2 import OLLAMA_BASE_URL, extract_names_with_fallback, list_ollama_models, run_rag_prototype


# 載入 .env，讓 API 服務可透過環境變數調整 RAG、URL 抓取與 POI 查詢參數。
load_dotenv()

# URL 與 POI 查詢相關設定：限制遠端文章下載大小、查詢分頁大小與逾時秒數。
URL_FETCH_MAX_BYTES = int(os.getenv("RAG_URL_FETCH_MAX_BYTES", "4000000"))
POI_API_BASE_URL = os.getenv("POI_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
POI_LOOKUP_PAGE_SIZE = max(1, int(os.getenv("POI_LOOKUP_PAGE_SIZE", "20")))
POI_LOOKUP_TIMEOUT_SECONDS = float(os.getenv("POI_LOOKUP_TIMEOUT_SECONDS", "5"))
POI_LOOKUP_MAX_QUERIES = max(1, int(os.getenv("POI_LOOKUP_MAX_QUERIES", "18")))

# 行程分組與 URL 輸入的檢索策略設定。
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

# 明確排除泛稱標籤，避免把「景點」「推薦景點」這類詞當成實際景點名稱。
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

# 地區名稱白名單式排除表：這些通常是城市或行政區，不是單一 POI。
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

# 景點抽取後的雜訊片段：命中時會被視為泛稱或非景點。
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

# 交通票券、車站或通行方式等字串，避免混入景點清單。
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

# 住宿、商店或非景點服務字串，避免被前端當成可推薦景點。
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

# 景點名稱正規化對照表：把常見別名、錯字或繁簡差異映射到統一名稱。
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
    """RAG 抽取 API 的請求格式，支援直接傳文字或提供 URL。"""

    text: str = ""
    url: str = ""
    query: str = Field(default="請列出文章中的旅遊景點名稱")
    top_k: int = Field(default=4, ge=1, le=200)
    reset_db: bool = False
    debug: bool = True


def parse_spot_names(model_output: str) -> list[str]:
    """從模型輸出的多行文字中取出景點名稱候選清單。"""
    lines = model_output.splitlines()
    names: list[str] = []
    for line in lines:
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(、:：]+", "", line).strip()
        if cleaned and cleaned not in names:
            names.append(cleaned)
    return names


def dedupe_keep_order(values: list[str]) -> list[str]:
    """去除重複項目，同時保留原本出現順序。"""
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def normalize_for_match(text: str) -> str:
    """移除空白與常見標點，產生適合模糊比對的 key。"""
    return re.sub(r"[\s，。、,.!！?？:：;；'\"`~\-_/\\()\[\]{}<>《》【】·•]+", "", text or "").strip()


def canonicalize_spot_name(name: str) -> str:
    """清理景點名稱並套用 canonical 對照，讓同一景點用一致名稱表示。"""
    cleaned = normalize_heading_text(name)
    cleaned = re.sub(r"^(東京綜合|東京综合|東京綜合版|東京综合版)", "", cleaned).strip()
    cleaned = re.sub(r"^(東京綜合|東京综合)", "", cleaned).strip()
    cleaned = re.sub(r"(版)$", "", cleaned).strip()
    normalized = normalize_for_match(cleaned).lower()
    if normalized in SPOT_CANONICAL_MAP:
        return SPOT_CANONICAL_MAP[normalized]
    return cleaned


def _contains_any_keyword(name: str, keywords: list[str]) -> bool:
    """判斷名稱是否包含任何雜訊關鍵字。"""
    return any(keyword in name for keyword in keywords)


def _looks_like_region_name(name: str) -> bool:
    """判斷候選名稱是否比較像地區或行政區，而不是景點。"""
    if name in REGION_NAME_EXACT:
        return True
    return bool(re.search(r"(縣|县|市|町|村|州|道|區|区)$", name)) and len(name) <= 4


def is_valid_spot_name(name: str) -> bool:
    """檢查清理後的候選字串是否可作為有效景點名稱。"""
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
    """回傳候選名稱被濾掉的原因，供 debug_samples 顯示。"""
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
    """清理、去重景點名稱，並收集被濾掉的樣本與原因統計。"""
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
    """只回傳清理後景點清單，不帶 debug 資訊。"""
    names, _ = clean_spot_names_with_debug(values, sample_limit=0)
    return names


def normalize_heading_text(text: str) -> str:
    """清理行程標題或候選名稱前面的編號、符號與多餘空白。"""
    cleaned = re.sub(r"^[\-\*\d\.\)\(、:：\s▶]+", "", text).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def is_day_title(title: str) -> bool:
    """判斷標題是否為 DAY1、DAY 2 或中文第幾天格式。"""
    return bool(re.search(r"^(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天)$", str(title or ""), flags=re.IGNORECASE))


def extract_itinerary_heading(text: str) -> str:
    """從 chunk 文字中判斷是否存在行程段落標題，供後續分組使用。"""
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
    """將中文數字或阿拉伯數字轉成整數，用於解析第幾天。"""
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
    """從 DAY 標題取出天數，無法判斷時回傳 None。"""
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
    """合併連續 DAY 分組，讓同一趟多日行程可回傳成較完整的 group。"""
    if not groups:
        return []

    merged: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    start_day: int | None = None
    end_day: int | None = None

    def finalize_current() -> None:
        """結束目前累積的 DAY group，補上標題與景點數後放入結果。"""
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
        # 每個 group 先轉成固定欄位格式，避免缺少欄位造成後續處理失敗。
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
        # DAY 編號回到 1 或倒退時，視為另一條行程的開始。
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
    """依據行程標題把 chunks 切成多個 itinerary section。"""
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    auto_index = 1

    for index, chunk in enumerate(chunks, start=1):
        # 偵測到新標題時，先收尾上一個 section，再建立新的 section。
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
            # 沒有明確標題的內容使用自動標題，仍保留成可分組 section。
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
    """把抽取出的景點對回文章段落，建立前端可用的行程群組與 debug 統計。"""
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
        # 將 section 文字正規化後，檢查哪些 spot_names 實際出現在該段內容中。
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
        # 景點數不足的 section 不回傳給前端，但保留少量樣本供 debug。
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
    """簡易 HTML 文字抽取器，用來從旅遊文章頁面取出可餵給 RAG 的純文字。"""

    def __init__(self) -> None:
        """初始化文字暫存與 skip 狀態。"""
        super().__init__()
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """遇到區塊型標籤時補換行，遇到 script/style 則開始略過內容。"""
        tag_name = tag.lower()
        if tag_name in {"script", "style", "noscript"}:
            self._skip_depth += 1
            return
        if tag_name in {"p", "li", "br", "div", "section", "article", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        """處理結束標籤，並在區塊結束處補換行。"""
        tag_name = tag.lower()
        if tag_name in {"script", "style", "noscript"} and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if tag_name in {"p", "li", "div", "section", "article", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        """收集可讀文字，略過 script/style/noscript 中的內容。"""
        if self._skip_depth > 0:
            return
        text = data.strip()
        if text:
            self.parts.append(text)

    def text(self) -> str:
        """合併已收集文字並清理多餘空白。"""
        merged = " ".join(self.parts)
        merged = re.sub(r"\n\s*\n+", "\n", merged)
        merged = re.sub(r"[ \t]+", " ", merged)
        return merged.strip()


def fetch_guide_text_from_url(url: str) -> str:
    """下載指定 URL 的 HTML，抽取成純文字並復原常見行程段落邊界。"""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="url must start with http:// or https://")

    # 使用瀏覽器風格 User-Agent，降低部分網站拒絕簡單 urllib request 的機率。
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; JapanTravelPlanningApp/1.0)",
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            # 分段讀取並限制最大位元組數，避免大型頁面佔用過多記憶體。
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

    # 依 HTTP header 的 charset 解碼；失敗字元直接忽略以保留可讀內容。
    html = raw.decode(charset, errors="ignore")
    parser = GuideHTMLParser()
    parser.feed(html)
    parser.close()
    extracted_text = parser.text()
    # Recover itinerary boundaries that are often flattened in website HTML.
    # 網頁轉純文字後常會把 DAY 標題壓在同一行，這裡補回換行方便後續切 chunk。
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
    """在檢索結果或完整 chunks 中找出景點名稱最可能來自哪個段落。"""
    normalized_name = normalize_for_match(spot_name)
    retrieved_pairs = list(zip(retrieved_chunk_indices, retrieved_chunks))

    for chunk_index, chunk_text in retrieved_pairs:
        # 優先使用向量檢索回來的 chunks，因為它們是本次回答的主要來源。
        if normalized_name and normalized_name in normalize_for_match(chunk_text):
            return chunk_index, chunk_text

    for index, chunk_text in enumerate(chunks, start=1):
        # 若檢索 chunks 找不到，退回完整索引 chunks 全文搜尋。
        if normalized_name and normalized_name in normalize_for_match(chunk_text):
            return index, chunk_text

    if retrieved_pairs:
        fallback_index, fallback_text = retrieved_pairs[0]
        return fallback_index, fallback_text

    if chunks:
        return 1, chunks[0]

    return 0, ""


def build_excerpt(spot_name: str, source_text: str, radius: int = 45) -> str:
    """從來源段落擷取景點附近的一小段文字，作為推薦理由與 trace。"""
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
    """從文字中推測評論數；若沒有明確數字則產生穩定的備援值。"""
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


# POI 查詢別名表：把 RAG 抽出的中文名稱擴展成資料庫或 Google 常見名稱。
POI_SEARCH_ALIASES = {
    "東京晴空塔": ["東京スカイツリー", "晴空塔", "Tokyo Skytree"],
    "晴空塔": ["東京スカイツリー", "Tokyo Skytree"],
    "東京鐵塔": ["東京タワー", "Tokyo Tower"],
    "東京铁塔": ["東京タワー", "Tokyo Tower"],
    "淺草寺": ["浅草寺"],
    "浅草寺": ["淺草寺"],
    "澀谷十字路口": ["渋谷スクランブル交差点", "渋谷", "澀谷"],
    "涩谷十字路口": ["渋谷スクランブル交差点", "渋谷", "涩谷"],
    "伏見稻荷大社": ["伏見稲荷大社"],
    "清水寺": ["清水寺"],
}


# 補充以 Unicode escape 表示的正確中文別名，避免原始檔編碼或字型顯示問題。
POI_SEARCH_ALIASES.update(
    {
        "\u9577\u5d0e\u7a3b\u4f50\u5c71": ["\u7a32\u4f50\u5c71", "\u9577\u5d0e\u7a32\u4f50\u5c71", "Mount Inasa"],
        "\u5225\u5e9c\u6eab\u6cc9": ["\u5225\u5e9c\u6e29\u6cc9"],
        "\u5b09\u91ce\u6eab\u6cc9": ["\u5b09\u91ce\u6e29\u6cc9"],
        "\u5ca1\u5d0e\u8526\u5c4b": [
            "\u4eac\u90fd\u5ca1\u5d0e \u8526\u5c4b\u66f8\u5e97",
            "\u4eac\u90fd\u5ca1\u5d0e\u8526\u5c4b\u66f8\u5e97",
            "\u8526\u5c4b\u66f8\u5e97",
        ],
        "\u6c38\u89c0\u5802": ["\u6c38\u89b3\u5802", "\u6c38\u89c0\u5802\u79aa\u6797\u5bfa", "\u6c38\u89b3\u5802\u7985\u6797\u5bfa"],
        "\u5357\u79aa\u5bfa": ["\u5357\u7985\u5bfa"],
        "\u5317\u91ce\u5929\u6eff\u5bae": ["\u5317\u91ce\u5929\u6e80\u5bae"],
        "\u9748\u5c71\u8b77\u570b\u795e\u793e": [
            "\u970a\u5c71\u8b77\u56fd\u795e\u793e",
            "\u4eac\u90fd\u970a\u5c71\u8b77\u570b\u795e\u793e",
            "\u4eac\u90fd\u970a\u5c71\u8b77\u56fd\u795e\u793e",
        ],
    }
)

# 各地景點的人工別名補強，用來提高 POI / restaurant API 的命中率。
POI_SEARCH_ALIASES.update(
    {
        "合羽橋道具街": ["合羽橋本通り商店街", "東京合羽橋商店街振興組合", "合羽橋"],
        "宇治平等院": ["平等院"],
        "心齋橋": ["心斎橋", "心斎橋筋商店街"],
        "新世界商店街": ["新世界"],
        "阿倍野展望台": ["ハルカス300", "ハルカス300（展望台）", "あべのハルカス"],
        "鎌倉大佛": ["鎌倉大仏殿高徳院", "鎌倉大仏", "高徳院"],
        "箱根雕刻之森美術館": ["箱根雕刻森林美術館", "彫刻の森美術館"],
        "札幌電視塔": ["さっぽろテレビ塔"],
        "堺町通商店街": ["小樽堺町通り商店街"],
        "小樽音樂盒堂": ["小樽オルゴール堂"],
        "北一硝子": ["北一ヴェネツィア美術館", "大正硝子館 本店"],
        "金森紅磚倉庫": ["金森赤レンガ倉庫"],
        "金森红砖仓库": ["金森赤レンガ倉庫"],
        "元町教會群": ["カトリック元町教会"],
        "元町教会群": ["カトリック元町教会"],
        "函館山展望台": ["函館山展望台"],
        "函馆山展望台": ["函館山展望台"],
        "兼六园": ["兼六園"],
        "兼六園": ["兼六園"],
        "東茶屋街": ["ひがし茶屋街"],
        "二十一世紀美術館": ["金澤21世紀美術館", "金沢21世紀美術館"],
        "三町老街": ["高山市三町伝統的建造物群保存地区", "三町筋"],
        "神戶港灣": ["神戸ハーバーランド"],
        "馬賽克廣場": ["神戸ハーバーランドumie モザイク", "モザイク大観覧車"],
        "姬路城": ["姫路城"],
        "書寫山圓教寺": ["書寫山", "書写山"],
        "书写山圆教寺": ["書寫山", "書写山"],
        "和平紀念公園": ["平和記念公園", "广岛和平纪念公园"],
        "原爆圓頂館": ["原爆ドーム"],
        "博多運河城": ["キャナルシティ博多"],
        "稻佐山展望台": ["稲佐山山頂展望台", "稲佐山"],
        "櫻之馬場城彩苑": ["桜の馬場 城彩苑"],
        "仙巒園": ["仙巖園", "仙巌園"],
        "備瀨福木林道": ["備瀬のフクギ並木"],
        "壺屋通": ["壺屋やちむん通り"],
        "瑞巖寺": ["瑞巌寺"],
        "松島灣": ["松島海岸", "松島"],
        "華嚴瀑布": ["華厳滝"],
        "伊勢神宮內宮": ["皇大神宮（伊勢神宮 内宮）", "伊勢神宮 内宮"],
        "御蔭橫丁": ["おかげ横丁"],
        "直島草間彌生南瓜": ["南瓜", "「南瓜」草間彌生"],
        "萬翠莊": ["萬翠荘"],
        "血池地獄": ["血の池地獄"],
        "金鱃湖": ["金鱗湖"],
        "湯之坪街道": ["湯の坪街道"],
        "津輕藩睡魔村": ["津軽藩ねぷた村", "ねぶたの家 ワ･ラッセ"],
        "青森魚菜中心": ["株式会社青森魚菜センター 本店"],
        "乳頭溫泉鄉": ["乳頭温泉郷 鶴の湯温泉"],
        "中町通": ["中町商店街振興組合"],
        "戶隱神社": ["戸隠神社 奥社", "戸隠神社 中社"],
        "黑部水壩": ["黒部ダム"],
        "立山黑部路線": ["黒部ダム", "立山ケーブルカー"],
        "城崎海岸": ["城ヶ崎海岸"],
        "高野山奧之院": ["高野山奥之院"],
        "白兔神社": ["白兎神社"],
    }
)


# 查詢字串變體表：處理常見繁簡、日文新舊字體或 OCR/編碼差異。
POI_QUERY_VARIANT_MAP = {
    "溫": "温",
    "稻": "稲",
    "觀": "観",
    "禪": "禅",
    "滿": "満",
    "靈": "霊",
    "國": "国",
}

# 使用 Unicode code point 建立跨字形替換，避免直接顯示時混淆。
POI_QUERY_VARIANT_MAP.update(
    {
        "\u6dfa": "\u6d45",  # 淺 -> 浅
        "\u5ee3": "\u5e83",  # 廣 -> 広
        "\u6a02": "\u697d",  # 樂 -> 楽
        "\u81fa": "\u53f0",  # 臺 -> 台
        "\u6ff1": "\u6d5c",  # 濱 -> 浜
        "\u5cef": "\u5cf0",  # 峯 -> 峰
        "\u7028": "\u702c",  # 瀨 -> 瀬
        "\u9f8d": "\u7adc",  # 龍 -> 竜
        "\u5713": "\u5186",  # 圓 -> 円
        "\u6afb": "\u685c",  # 櫻 -> 桜
        "\u9435": "\u9244",  # 鐵 -> 鉄
        "\u8c50": "\u8c4a",  # 豐 -> 豊
        "\u6eab": "\u6e29",  # 溫 -> 温
        "\u89c0": "\u89b3",  # 觀 -> 観
        "\u79aa": "\u7985",  # 禪 -> 禅
        "\u6eff": "\u6e80",  # 滿 -> 満
        "\u7a3b": "\u7a32",  # 稻 -> 稲
        "\u9748": "\u970a",  # 靈 -> 霊
        "齋": "斎",
        "斋": "斎",
        "佛": "仏",
        "戶": "戸",
        "巖": "巌",
        "鱃": "鱗",
        "园": "園",
        "红": "紅",
        "仓": "倉",
        "馆": "館",
        "书": "書",
        "圆": "円",
        "黑": "黒",
        "嚴": "厳",
        "瀑": "滝",
        "灣": "湾",
    }
)

# 餐廳查詢需要比景點更積極地處理繁簡、日文漢字與食品類別詞。
RESTAURANT_QUERY_VARIANT_MAP = {
    "拉麵": "ラーメン",
    "拉面": "ラーメン",
    "壽司": "寿司",
    "豬排": "とんかつ",
    "猪排": "とんかつ",
    "燒肉": "焼肉",
    "總": "総",
    "雙": "双",
    "華": "華",
    "淺": "浅",
    "國": "国",
    "區": "区",
    "車站": "駅",
    "神戶": "神戸",
    "燈": "灯",
    "斯斯穆": "ススム",
}

# 常見日本餐廳品牌與別名，用於把「品牌 + 分店名」降階成資料庫較容易命中的查詢。
RESTAURANT_CHAIN_ALIASES = {
    "一蘭": ["一蘭", "ICHIRAN"],
    "鳥貴族": ["鳥貴族"],
    "淺草今半": ["浅草今半", "淺草今半"],
    "浅草今半": ["浅草今半"],
    "無敵家": ["無敵家", "麺創房 無敵家"],
    "築地壽司清": ["築地寿司清", "築地壽司清"],
    "築地寿司清": ["築地寿司清"],
    "星乃珈琲店": ["星乃珈琲店"],
    "美津の": ["美津の", "お好み焼 美津の"],
    "串カツだるま": ["串カツだるま", "だるま"],
    "金龍拉麵": ["金龍ラーメン", "金龍拉麵"],
    "鶴橋風月": ["鶴橋風月"],
    "本家第一旭": ["本家第一旭", "第一旭"],
    "祇園辻利": ["祇園辻利"],
    "かつくら": ["かつくら", "名代とんかつ かつくら"],
    "先斗町魯ビン": ["先斗町魯ビン", "魯ビン"],
    "GARAKU": ["GARAKU", "スープカレーGARAKU"],
    "成吉思汗だるま": ["成吉思汗だるま", "だるま"],
    "政壽司": ["政寿司", "おたる政寿司"],
    "政寿司": ["政寿司", "おたる政寿司"],
    "LeTAO": ["LeTAO", "小樽洋菓子舗ルタオ"],
    "けやき": ["けやき", "らーめんけやき"],
    "六花亭": ["六花亭"],
    "博多一雙": ["博多一双", "博多一雙"],
    "博多一双": ["博多一双"],
    "元祖博多めんたい重": ["元祖博多めんたい重"],
    "一風堂": ["一風堂"],
    "博多華味鳥": ["博多華味鳥"],
    "あつた蓬莱軒": ["あつた蓬莱軒"],
    "矢場とん": ["矢場とん"],
    "山本屋總本家": ["山本屋総本家", "山本屋總本家"],
    "山本屋総本家": ["山本屋総本家"],
    "コメダ珈琲店": ["コメダ珈琲店", "珈琲所 コメダ珈琲店"],
    "志津香": ["志津香"],
    "中村藤吉": ["中村藤吉", "中村藤吉本店"],
    "ますたに": ["ますたに"],
    "暖暮": ["暖暮", "ラーメン 暖暮"],
    "本部牧場": ["本部牧場"],
    "首里そば": ["首里そば"],
    "BLUE SEAL": ["BLUE SEAL", "ブルーシール"],
    "HARBS": ["HARBS"],
    "bills": ["bills"],
    "上野藪そば": ["上野 藪そば", "藪そば"],
    "藪そば": ["藪そば"],
    "牛かつもと村": ["牛かつもと村", "牛かつ もと村"],
    "くら寿司": ["くら寿司", "蔵寿司"],
    "京丹波": ["京丹波"],
    "麺闘庵": ["麺闘庵"],
    "551蓬莱": ["551蓬莱", "蓬莱"],
    "松原庵": ["松原庵", "鎌倉 松原庵"],
    "とびっちょ": ["とびっちょ"],
    "六厘舍": ["六厘舎", "六厘舍"],
    "NewYork Perfect Cheese": ["NewYork Perfect Cheese", "NEWYORK PERFECT CHEESE"],
    "斑鳩": ["斑鳩"],
    "松屋": ["松屋"],
    "鯛匠 HANANA": ["鯛匠 HANANA", "HANANA"],
    "Arabica": ["% Arabica", "Arabica"],
    "% Arabica": ["% Arabica", "Arabica"],
    "餃子の王将": ["餃子の王将"],
    "Steak Land": ["Steak Land", "ステーキランド"],
    "Ishida": ["Ishida", "神戸牛ステーキIshida"],
    "神戶牛ステーキIshida": ["Ishida", "神戸牛ステーキIshida"],
    "神戸牛ステーキIshida": ["Ishida", "神戸牛ステーキIshida"],
    "老祥記": ["老祥記"],
    "磯丸水産": ["磯丸水産"],
    "みっちゃん": ["みっちゃん", "みっちゃん総本店"],
    "八昌": ["八昌"],
    "牡蠣屋": ["牡蠣屋"],
    "藤い屋": ["藤い屋"],
    "もりもり寿し": ["もりもり寿し"],
    "茶房素心": ["茶房素心"],
    "Go Go Curry": ["Go Go Curry", "ゴーゴーカレー"],
    "四海樓": ["四海楼", "四海樓"],
    "文明堂": ["文明堂", "文明堂総本店"],
    "吉宗": ["吉宗"],
    "AFURI": ["AFURI"],
    "麺屋一燈": ["麺屋一燈", "麺屋一燈"],
    "肉汁麺ススム": ["肉汁麺ススム"],
    "すき家": ["すき家"],
    "CoCo壱番屋": ["CoCo壱番屋", "カレーハウス CoCo壱番屋"],
    "やよい軒": ["やよい軒"],
    "大戸屋": ["大戸屋", "大戸屋ごはん処"],
    "スシロー": ["スシロー"],
    "牛角": ["牛角"],
    "根室花まる": ["根室花まる"],
    "焼肉ライク": ["焼肉ライク"],
    "はま寿司": ["はま寿司"],
}

RESTAURANT_BRANCH_WORDS = [
    "本店",
    "総本店",
    "總本店",
    "本社総本店",
    "駅店",
    "站店",
    "店",
]

# 地區前綴表：查 POI 前可移除「東京都」「京都府」等地名，增加模糊搜尋命中。
POI_REGION_PREFIXES = [
    "東京都",
    "京都府",
    "大阪府",
    "北海道",
    "長崎縣",
    "大分縣",
    "佐賀縣",
    "福岡縣",
    "熊本縣",
    "鹿兒島縣",
    "沖繩縣",
    "長崎",
    "大分",
    "佐賀",
    "福岡",
    "熊本",
    "鹿兒島",
    "沖繩",
]

# 補上標準日本地區與城市名稱，支援更多資料來源格式。
POI_REGION_PREFIXES.extend(
    [
        "\u6771\u4eac\u90fd",
        "\u4eac\u90fd\u5e9c",
        "\u5927\u962a\u5e9c",
        "\u5317\u6d77\u9053",
        "\u795e\u5948\u5ddd\u7e23",
        "\u5343\u8449\u7e23",
        "\u5948\u826f\u7e23",
        "\u5175\u5eab\u7e23",
        "\u9577\u5d0e\u7e23",
        "\u5927\u5206\u7e23",
        "\u4f50\u8cc0\u7e23",
        "\u798f\u5ca1\u7e23",
        "\u718a\u672c\u7e23",
        "\u9e7f\u5152\u5cf6\u7e23",
        "\u6c96\u7e69\u7e23",
        "\u9752\u68ee\u7e23",
        "\u79cb\u7530\u7e23",
        "\u9577\u91ce\u7e23",
        "\u975c\u5ca1\u7e23",
        "\u548c\u6b4c\u5c71\u7e23",
        "\u5cf6\u6839\u7e23",
        "\u9ce5\u53d6\u7e23",
        "\u6771\u4eac",
        "\u4eac\u90fd",
        "\u5927\u962a",
        "\u5948\u826f",
        "\u795e\u6236",
        "\u9577\u5d0e",
        "\u5225\u5e9c",
        "\u5b09\u91ce",
        "\u672d\u5e4c",
        "\u5c0f\u6a3d",
        "\u51fd\u9928",
        "\u540d\u53e4\u5c4b",
        "\u91d1\u6fa4",
        "\u9ad8\u5c71",
        "\u5ee3\u5cf6",
        "\u798f\u5ca1",
        "\u718a\u672c",
        "\u9e7f\u5152\u5cf6",
        "\u6c96\u7e69",
        "\u7bb1\u6839",
        "\u938c\u5009",
        "\u4ed9\u53f0",
        "\u65e5\u5149",
        "\u4f0a\u52e2",
        "\u9ad8\u677e",
        "\u677e\u5c71",
    ]
)

# 區域推論表：從文章或景點名稱中的關鍵字推測 POI API 的 region 查詢條件。
POI_REGION_HINTS = [
    ("\u6771\u4eac", "\u6771\u4eac\u90fd"),
    ("合羽橋", "\u6771\u4eac\u90fd"),
    ("\u4eac\u90fd", "\u4eac\u90fd\u5e9c"),
    ("\u5ca1\u5d0e\u8526\u5c4b", "\u4eac\u90fd\u5e9c"),
    ("宇治", "\u4eac\u90fd\u5e9c"),
    ("平等院", "\u4eac\u90fd\u5e9c"),
    ("\u5927\u962a", "\u5927\u962a\u5e9c"),
    ("心齋橋", "\u5927\u962a\u5e9c"),
    ("新世界", "\u5927\u962a\u5e9c"),
    ("阿倍野", "\u5927\u962a\u5e9c"),
    ("\u5948\u826f", "\u5948\u826f\u7e23"),
    ("鎌倉大佛", "\u795e\u5948\u5ddd\u7e23"),
    ("\u795e\u6236", "\u5175\u5eab\u7e23"),
    ("神戶港", "\u5175\u5eab\u7e23"),
    ("馬賽克", "\u5175\u5eab\u7e23"),
    ("\u59ec\u8def", "\u5175\u5eab\u7e23"),
    ("姬路", "\u5175\u5eab\u7e23"),
    ("\u9577\u5d0e", "\u9577\u5d0e\u7e23"),
    ("\u5225\u5e9c", "\u5927\u5206\u7e23"),
    ("\u7531\u5e03\u9662", "\u5927\u5206\u7e23"),
    ("血池地獄", "\u5927\u5206\u7e23"),
    ("金鱃湖", "\u5927\u5206\u7e23"),
    ("湯之坪", "\u5927\u5206\u7e23"),
    ("\u5b09\u91ce", "\u4f50\u8cc0\u7e23"),
    ("\u4f50\u8cc0", "\u4f50\u8cc0\u7e23"),
    ("\u798f\u5ca1", "\u798f\u5ca1\u7e23"),
    ("博多運河城", "\u798f\u5ca1\u7e23"),
    ("\u718a\u672c", "\u718a\u672c\u7e23"),
    ("城彩苑", "\u718a\u672c\u7e23"),
    ("\u9e7f\u5152\u5cf6", "\u9e7f\u5152\u5cf6\u7e23"),
    ("仙巒園", "\u9e7f\u5152\u5cf6\u7e23"),
    ("\u6c96\u7e69", "\u6c96\u7e69\u7e23"),
    ("備瀨", "\u6c96\u7e69\u7e23"),
    ("壺屋", "\u6c96\u7e69\u7e23"),
    ("\u672d\u5e4c", "\u5317\u6d77\u9053"),
    ("\u5c0f\u6a3d", "\u5317\u6d77\u9053"),
    ("\u51fd\u9928", "\u5317\u6d77\u9053"),
    ("金森", "\u5317\u6d77\u9053"),
    ("元町教", "\u5317\u6d77\u9053"),
    ("\u540d\u53e4\u5c4b", "\u611b\u77e5\u7e23"),
    ("\u91d1\u6fa4", "\u77f3\u5ddd\u7e23"),
    ("兼六", "\u77f3\u5ddd\u7e23"),
    ("茶屋街", "\u77f3\u5ddd\u7e23"),
    ("二十一世紀", "\u77f3\u5ddd\u7e23"),
    ("21世紀", "\u77f3\u5ddd\u7e23"),
    ("\u9ad8\u5c71", "\u5c90\u961c\u7e23"),
    ("三町", "\u5c90\u961c\u7e23"),
    ("\u5ee3\u5cf6", "\u5ee3\u5cf6\u7e23"),
    ("和平紀念", "\u5ee3\u5cf6\u7e23"),
    ("原爆", "\u5ee3\u5cf6\u7e23"),
    ("\u5ca1\u5c71", "\u5ca1\u5c71\u7e23"),
    ("\u4ed9\u53f0", "\u5bae\u57ce\u7e23"),
    ("瑞巖寺", "\u5bae\u57ce\u7e23"),
    ("松島", "\u5bae\u57ce\u7e23"),
    ("\u65e5\u5149", "\u6803\u6728\u7e23"),
    ("華嚴", "\u6803\u6728\u7e23"),
    ("\u7bb1\u6839", "\u795e\u5948\u5ddd\u7e23"),
    ("\u938c\u5009", "\u795e\u5948\u5ddd\u7e23"),
    ("\u6cb3\u53e3\u6e56", "\u5c71\u68a8\u7e23"),
    ("伊勢", "\u4e09\u91cd\u7e23"),
    ("御蔭", "\u4e09\u91cd\u7e23"),
    ("直島", "\u9999\u5ddd\u7e23"),
    ("南瓜", "\u9999\u5ddd\u7e23"),
    ("萬翠", "\u611b\u5a9b\u7e23"),
    ("津輕", "\u9752\u68ee\u7e23"),
    ("青森", "\u9752\u68ee\u7e23"),
    ("乳頭", "\u79cb\u7530\u7e23"),
    ("戶隱", "\u9577\u91ce\u7e23"),
    ("中町通", "\u9577\u91ce\u7e23"),
    ("立山", "\u5bcc\u5c71\u7e23"),
    ("黑部", "\u5bcc\u5c71\u7e23"),
    ("城崎海岸", "\u975c\u5ca1\u7e23"),
    ("高野山", "\u548c\u6b4c\u5c71\u7e23"),
]


def build_text_variants(value: str) -> list[str]:
    """根據變體對照表產生多個查詢字串版本。"""
    variants = [value]
    for source, replacement in POI_QUERY_VARIANT_MAP.items():
        # 對既有 variants 逐步展開，讓多個替換規則可以疊加。
        variants.extend([item.replace(source, replacement) for item in list(variants) if source in item])
    return dedupe_keep_order(variants)


def build_restaurant_text_variants(value: str) -> list[str]:
    """產生餐廳查詢專用字串變體，補強繁簡、日文漢字與食品詞轉換。"""
    variants = build_text_variants(value)
    for source, replacement in RESTAURANT_QUERY_VARIANT_MAP.items():
        variants.extend([item.replace(source, replacement) for item in list(variants) if source in item])
    return dedupe_keep_order(variants)


def _strip_restaurant_food_words(value: str) -> str:
    """移除品牌與分店名之間常見的食品類別詞，例如拉麵、壽司或燒肉。"""
    cleaned = value
    for word in ["拉麵", "拉面", "ラーメン", "らーめん", "壽司", "寿司", "燒肉", "焼肉", "豬排", "猪排"]:
        cleaned = cleaned.replace(word, "")
    return cleaned.strip()


def _split_restaurant_chain_branch(value: str) -> list[str]:
    """將「品牌 + 分店」拆成品牌查詢與帶空格的分店查詢。"""
    queries: list[str] = []
    variants = build_restaurant_text_variants(value)
    for variant in variants:
        compact_variant = normalize_for_match(variant)
        for brand, aliases in RESTAURANT_CHAIN_ALIASES.items():
            brand_variants = build_restaurant_text_variants(brand) + aliases
            for brand_variant in dedupe_keep_order(brand_variants):
                compact_brand = normalize_for_match(brand_variant)
                if not compact_brand or compact_brand not in compact_variant:
                    continue

                queries.extend(aliases)
                queries.append(brand_variant)

                start = compact_variant.find(compact_brand)
                if start != 0:
                    continue

                branch = compact_variant[len(compact_brand) :]
                branch = _strip_restaurant_food_words(branch)
                if len(branch) >= 2:
                    for alias in aliases + [brand_variant]:
                        queries.append(f"{alias} {branch}")
                        queries.append(f"{alias}{branch}")
                    for branch_word in RESTAURANT_BRANCH_WORDS:
                        if branch.endswith(branch_word) and len(branch) > len(branch_word) + 1:
                            short_branch = branch[: -len(branch_word)]
                            for alias in aliases + [brand_variant]:
                                queries.append(f"{alias} {short_branch}")
                                queries.append(f"{alias}{short_branch}")
    return dedupe_keep_order([query.strip() for query in queries if query and query.strip()])


def build_restaurant_lookup_queries(spot_name: str) -> list[str]:
    """建立餐廳優先的查詢清單，從完整分店名逐步降階到品牌名。"""
    queries: list[str] = []
    base_values = [spot_name, _strip_restaurant_food_words(spot_name)]
    normalized_name = normalize_for_match(spot_name)
    if normalized_name:
        base_values.append(normalized_name)

    for value in dedupe_keep_order([item for item in base_values if item]):
        queries.extend(_split_restaurant_chain_branch(value))
        queries.extend(build_restaurant_text_variants(value))
        queries.extend(strip_region_prefixes(value))
        for stripped in strip_region_prefixes(value):
            queries.extend(_split_restaurant_chain_branch(stripped))
            queries.extend(build_restaurant_text_variants(stripped))

    return dedupe_keep_order([query.strip() for query in queries if query and query.strip()])


def infer_poi_region_hints(text: str) -> list[str]:
    """從名稱或來源文字推測可能的日本地區，用於縮小 POI 查詢範圍。"""
    hints: list[str] = []
    variant_text = " ".join(build_text_variants(text or ""))
    for keyword, region in POI_REGION_HINTS:
        if keyword in variant_text:
            hints.append(region)
    return dedupe_keep_order(hints)


def strip_region_prefixes(value: str) -> list[str]:
    """移除地區前綴後產生候選查詢字串。"""
    stripped: list[str] = []
    for prefix in POI_REGION_PREFIXES:
        if value.startswith(prefix):
            candidate = value[len(prefix) :].strip()
            if len(normalize_for_match(candidate)) >= 3:
                stripped.append(candidate)
    return stripped


def _as_float(value: Any) -> float | None:
    """安全轉換成 float，空值或非法格式回傳 None。"""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any, default: int = 0) -> int:
    """安全轉換成 int，失敗時回傳預設值。"""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def build_poi_lookup_queries(spot_name: str) -> list[str]:
    """為單一景點建立多組 POI API 搜尋 query，提高資料庫匹配機率。"""
    queries = []

    # 餐廳名稱常含分店資訊或食品類別詞，先加入餐廳專用降階查詢。
    queries.extend(build_restaurant_lookup_queries(spot_name))
    queries.append(spot_name)
    normalized_name = normalize_for_match(spot_name)
    if normalized_name and normalized_name != spot_name:
        queries.append(normalized_name)

    for candidate in list(queries):
        # 同時嘗試字形變體與去除地區前綴後的版本。
        queries.extend(build_text_variants(candidate))
        queries.extend(strip_region_prefixes(candidate))
        for stripped in strip_region_prefixes(candidate):
            queries.extend(build_text_variants(stripped))

    for key, aliases in POI_SEARCH_ALIASES.items():
        # 若命中人工別名表，加入更多資料庫常見名稱。
        if key in spot_name or key in normalized_name:
            queries.extend(aliases)

    return dedupe_keep_order([query.strip() for query in queries if query and query.strip()])[:POI_LOOKUP_MAX_QUERIES]


@lru_cache(maxsize=2048)
def fetch_api_candidates(endpoint: str, query: str, region: str = "") -> list[dict[str, Any]]:
    """呼叫本機 POI/restaurant API，回傳符合搜尋字串的候選資料。"""
    if not POI_API_BASE_URL:
        return []

    params_payload = {"search": query, "page_size": POI_LOOKUP_PAGE_SIZE}
    if region:
        params_payload["region"] = region
    params = urlencode(params_payload)
    request = Request(
        f"{POI_API_BASE_URL}/api/{endpoint}/?{params}",
        headers={"Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=POI_LOOKUP_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        # POI API 不可用時不讓整個 RAG API 失敗，只回傳空候選。
        return []

    results = payload.get("results", []) if isinstance(payload, dict) else payload
    return [item for item in results if isinstance(item, dict)]


def fetch_poi_candidates(query: str, region: str = "") -> list[dict[str, Any]]:
    """查詢景點 POI endpoint。"""
    return fetch_api_candidates("pois", query, region=region)


def fetch_restaurant_candidates(query: str, region: str = "") -> list[dict[str, Any]]:
    """查詢餐廳 endpoint，讓餐飲景點也能被匹配。"""
    return fetch_api_candidates("restaurants", query, region=region)


def poi_match_score(spot_name: str, poi: dict[str, Any]) -> float:
    """根據名稱吻合程度與 static_score 計算候選 POI 分數。"""
    query_key = normalize_for_match(spot_name).lower()
    candidate_names = [
        str(poi.get("name") or ""),
        str(poi.get("google_name_matched") or ""),
        str(poi.get("id") or ""),
        str(poi.get("raw_type") or ""),
    ]
    candidate_keys = [normalize_for_match(name).lower() for name in candidate_names if name]

    if query_key and query_key in candidate_keys:
        # 完全命中名稱時給最高基本分。
        return 100.0 + float(poi.get("static_score") or 0)

    if query_key and any(key.startswith(query_key) or query_key.startswith(key) for key in candidate_keys if key):
        return 92.0 + float(poi.get("static_score") or 0)

    if query_key and any(query_key in key or key in query_key for key in candidate_keys if key):
        # 部分包含也視為合理候選，但分數低於完全命中。
        return 80.0 + float(poi.get("static_score") or 0)

    return float(poi.get("static_score") or 0)


def lookup_poi_for_spot(spot_name: str, region_hints: list[str] | None = None) -> tuple[dict[str, Any] | None, str, str]:
    """用多組 query 與 region hint 查詢 POI/餐廳資料，選出最佳匹配。"""
    best_poi: dict[str, Any] | None = None
    best_query = ""
    best_source_type = ""
    best_score = -1.0
    regions = dedupe_keep_order(region_hints or [])
    lookup_queries = build_poi_lookup_queries(spot_name)

    def consider_candidate(query: str, region: str, source_type: str, candidate: dict[str, Any]) -> bool:
        """更新目前最佳候選；若餐廳高分命中則回傳 True 讓外層提早停止。"""
        nonlocal best_poi, best_query, best_source_type, best_score
        score = poi_match_score(query, candidate)
        candidate_region = str(candidate.get("region") or "")
        if region and candidate_region == region:
            # 區域完全符合時加分，降低同名異地景點誤配。
            score += 5.0
        elif regions and candidate_region and candidate_region not in regions:
            # 分店資料不完整時仍允許品牌命中，但對跨區候選降權。
            score -= 12.0
        if source_type == "restaurant":
            score += 8.0
        if score > best_score:
            best_poi = candidate
            best_query = query
            best_source_type = source_type
            best_score = score
        return source_type == "restaurant" and score >= 88.0

    # 餐廳資料先查，命中高分候選就不用再打 POI endpoint，降低延遲與誤配。
    for query in lookup_queries:
        for region in regions + [""]:
            for candidate in fetch_restaurant_candidates(query, region=region):
                if consider_candidate(query, region, "restaurant", candidate):
                    return best_poi, best_query, best_source_type

    # 餐廳查不到或分數不足時，再退回一般 POI endpoint。
    for query in lookup_queries:
        for region in regions + [""]:
            for candidate in fetch_poi_candidates(query, region=region):
                consider_candidate(query, region, "poi", candidate)

    return best_poi, best_query, best_source_type


def tags_from_poi(poi: dict[str, Any] | None) -> list[str]:
    """從 POI 資料產生前端顯示用 tags；沒有匹配時標記為 RAG only。"""
    if not poi:
        return ["RAG only"]

    values: list[str] = []
    category = str(poi.get("category") or "").strip()
    if category:
        values.append(category)
    interests = poi.get("interests") or []
    if isinstance(interests, list):
        values.extend(str(item).strip() for item in interests if str(item).strip())
    return dedupe_keep_order(values) or ["POI"]


def build_enriched_spot_payload(
    spot_name: str,
    order: int,
    source_chunk_index: int,
    source_text: str,
    source_excerpt: str,
    poi: dict[str, Any] | None,
    poi_query: str,
    match_source_type: str = "",
) -> dict[str, Any]:
    """組合單一景點的前端 payload，包含 RAG 來源、POI 匹配與評分資訊。"""
    reason = f"RAG source excerpt: {source_excerpt}" if source_excerpt else "Extracted by RAG from the travel guide."
    match_source_type = match_source_type or "poi"
    is_restaurant = match_source_type == "restaurant"
    api_endpoint = "restaurants" if is_restaurant else "pois"

    if not poi:
        # 找不到 POI 資料時仍回傳 RAG 抽取結果，並標記資料不足。
        return {
            "schema": "rag_enriched_spot_v1",
            "name": spot_name,
            "extracted_name": spot_name,
            "area": "",
            "rating": "-",
            "reason": reason,
            "reviewsCount": 0,
            "tags": ["RAG only"],
            "position": None,
            "imageUrl": "",
            "source": f"RAG chunk #{source_chunk_index}" if source_chunk_index > 0 else "RAG extracted spot",
            "sourceExcerpt": source_excerpt,
            "source_chunk_index": source_chunk_index,
            "source_text": source_text,
            "dataInsufficient": True,
            "poiMatch": {
                "matched": False,
                "query": poi_query or spot_name,
                "apiBaseUrl": POI_API_BASE_URL,
                "endpoint": api_endpoint,
                "sourceType": match_source_type,
            },
            "restaurantMatch": {
                "matched": False,
                "query": poi_query or spot_name,
                "apiBaseUrl": POI_API_BASE_URL,
                "endpoint": "restaurants",
            },
            "reviews_count": 0,
            "is_data_insufficient": True,
        }

    # POI 命中時，轉換座標、評分與評論數，整理成前端既有 schema。
    lat = _as_float(poi.get("lat"))
    lng = _as_float(poi.get("lng"))
    review_count = _as_int(poi.get("review_count"), 0)
    rating = _as_float(poi.get("google_rating"))
    position = {"lat": lat, "lng": lng} if lat is not None and lng is not None else None

    return {
        "schema": "rag_enriched_spot_v1",
        "name": spot_name,
        "extracted_name": spot_name,
        "matchedName": poi.get("name") or spot_name,
        "area": poi.get("region") or "",
        "rating": f"{rating:.1f}" if rating is not None else "-",
        "reason": reason,
        "reviewsCount": review_count,
        "tags": tags_from_poi(poi),
        "position": position,
        "imageUrl": poi.get("image_url") or "",
        "source": f"RAG chunk #{source_chunk_index}; {'restaurant' if is_restaurant else 'POI'} database match",
        "sourceExcerpt": source_excerpt,
        "source_chunk_index": source_chunk_index,
        "source_text": source_text,
        "dataInsufficient": review_count < 50,
        "matchSourceType": match_source_type,
        "poi": {
            "id": poi.get("id"),
            "name": poi.get("name"),
            "google_name_matched": poi.get("google_name_matched"),
            "category": poi.get("category"),
            "venue_type": poi.get("venue_type"),
            "static_score": poi.get("static_score"),
            "image_url": poi.get("image_url"),
            "station_anchor": poi.get("station_anchor"),
            "distance_to_station_km": poi.get("distance_to_station_km"),
            "source_type": match_source_type,
        },
        "restaurant": {
            "id": poi.get("id"),
            "name": poi.get("name"),
            "google_name_matched": poi.get("google_name_matched"),
            "category": poi.get("category"),
            "venue_type": poi.get("venue_type"),
            "raw_type": poi.get("raw_type"),
            "static_score": poi.get("static_score"),
            "image_url": poi.get("image_url"),
            "station_anchor": poi.get("station_anchor"),
            "distance_to_station_km": poi.get("distance_to_station_km"),
        }
        if is_restaurant
        else None,
        "poiMatch": {
            "matched": True,
            "query": poi_query or spot_name,
            "apiBaseUrl": POI_API_BASE_URL,
            "endpoint": api_endpoint,
            "sourceType": match_source_type,
        },
        "restaurantMatch": {
            "matched": is_restaurant,
            "query": poi_query or spot_name,
            "apiBaseUrl": POI_API_BASE_URL,
            "endpoint": "restaurants",
        },
        "reviews_count": review_count,
        "is_data_insufficient": review_count < 50,
    }


def build_spots_payload(result: dict[str, Any], spot_names: list[str]) -> list[dict[str, Any]]:
    """把 RAG 抽出的景點名稱批次轉成帶 POI 資料的 spots payload。"""
    chunks = result.get("chunks") or []
    retrieved_chunks = result.get("retrieved_chunks") or []
    retrieved_chunk_indices = result.get("retrieved_chunk_indices") or []

    spots: list[dict[str, Any]] = []
    for order, name in enumerate(spot_names):
        # 先找出來源段落與摘要，再用名稱加來源文字推測地區並查詢 POI。
        source_chunk_index, source_text = find_source_for_spot(
            spot_name=name,
            chunks=chunks,
            retrieved_chunks=retrieved_chunks,
            retrieved_chunk_indices=retrieved_chunk_indices,
        )
        excerpt = build_excerpt(name, source_text)
        region_hints = infer_poi_region_hints(f"{name} {source_text}")
        poi, poi_query, match_source_type = lookup_poi_for_spot(name, region_hints=region_hints)
        spots.append(
            build_enriched_spot_payload(
                spot_name=name,
                order=order,
                source_chunk_index=source_chunk_index,
                source_text=source_text,
                source_excerpt=excerpt,
                poi=poi,
                poi_query=poi_query,
                match_source_type=match_source_type,
            )
        )

    return spots


# FastAPI app 主體：提供健康檢查與 RAG 景點抽取 endpoint。
app = FastAPI(title="Japan Travel RAG API", version="0.1.0")

# CORS 設定：允許本機 Vite dev server 與 preview server 呼叫 API。
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
    """健康檢查 endpoint，回報 Ollama 是否可用與本機模型清單。"""
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
    """RAG 抽取主 endpoint：接受文字或 URL，回傳景點、POI 補強資料與 debug 指標。"""
    text = payload.text.strip()
    url = payload.url.strip()
    input_source = "text"
    if not text and url:
        # 若使用者提供 URL，先抓取並轉成純文字再進入 RAG 流程。
        text = fetch_guide_text_from_url(url)
        input_source = "url"
    if not text:
        raise HTTPException(status_code=400, detail="Please provide either text or url.")

    effective_top_k = payload.top_k
    read_full_document = False
    if input_source == "url":
        # URL 文章通常較長，因此提高最低 top_k，並可透過環境變數改成讀完整文件。
        effective_top_k = max(payload.top_k, URL_MIN_TOP_K)
        read_full_document = URL_READ_FULL_DOCUMENT

    try:
        # 呼叫 rag_week2 的核心流程：切塊、embedding、檢索與模型抽取景點名稱。
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
        # 若模型輸出沒有可用名稱，退回 regex fallback 從檢索 chunks 中再抽一次。
        spot_names = dedupe_keep_order(extract_names_with_fallback(" ".join(result.get("retrieved_chunks") or [])))
    spot_names, spot_clean_debug = clean_spot_names_with_debug(spot_names)

    # 將乾淨的景點名稱補上 POI/餐廳資料，並建立行程分組。
    spots = build_spots_payload(result, spot_names)
    matched_count = sum(1 for spot in spots if spot.get("poiMatch", {}).get("matched"))
    restaurant_matched_count = sum(1 for spot in spots if spot.get("restaurantMatch", {}).get("matched"))
    poi_matched_count = sum(
        1
        for spot in spots
        if spot.get("poiMatch", {}).get("matched") and spot.get("matchSourceType") != "restaurant"
    )
    itinerary_groups, group_debug = build_itinerary_groups_with_debug(result, spot_names)

    # debug_metrics 給前端或開發者觀察 RAG、清理、POI 匹配與分組效果。
    debug_metrics = {
        "chunk_count": len(result.get("chunks") or []),
        "retrieved_chunk_count": len(result.get("retrieved_chunks") or []),
        "retrieved_chunk_indices_count": len(result.get("retrieved_chunk_indices") or []),
        "read_full_document": read_full_document,
        "effective_top_k": effective_top_k,
        "spot_raw_count": spot_clean_debug.get("raw_count", 0),
        "spot_clean_count": spot_clean_debug.get("clean_count", 0),
        "spot_dropped_count": spot_clean_debug.get("dropped_count", 0),
        "poi_api_base_url": POI_API_BASE_URL,
        "matched_count": matched_count,
        "poi_matched_count": poi_matched_count,
        "restaurant_matched_count": restaurant_matched_count,
        "lookup_unmatched_count": max(0, len(spots) - matched_count),
        "group_count": len(itinerary_groups),
        "sections_total": group_debug.get("sections_total", 0),
        "sections_auto_title": group_debug.get("sections_auto_title", 0),
        "candidate_groups_before_merge": group_debug.get("candidate_groups_before_merge", 0),
        "groups_after_merge": group_debug.get("groups_after_merge", 0),
        "group_dropped_section_count": group_debug.get("dropped_section_count", 0),
    }

    # debug_samples 保留少量被濾掉的樣本，方便調整規則但避免 response 過大。
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
