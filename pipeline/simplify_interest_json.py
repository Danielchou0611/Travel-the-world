#!/usr/bin/env python3
"""Create an interest-friendly JSON from the scored Japan attractions CSV."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_INPUT = Path("output/japan_with_rating_scored.csv")
DEFAULT_OUTPUT = Path("output/japan_with_rating_interest.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Simplify categories and export an interest-friendly JSON file.",
    )
    parser.add_argument(
        "input_csv",
        nargs="?",
        default=str(DEFAULT_INPUT),
        help=f"Path to the scored CSV. Defaults to {DEFAULT_INPUT}.",
    )
    parser.add_argument(
        "output_json",
        nargs="?",
        default=str(DEFAULT_OUTPUT),
        help=f"Path to the output JSON. Defaults to {DEFAULT_OUTPUT}.",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Indent size for pretty-printed JSON. Use 0 for compact output.",
    )
    return parser.parse_args()


def convert_scalar(value: str) -> Any:
    text = value.strip()
    if text == "":
        return None

    lowered = text.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False

    try:
        if text.isdigit() or (text.startswith("-") and text[1:].isdigit()):
            return int(text)
        return float(text)
    except ValueError:
        return text


def simplify_category(raw_category: str) -> str:
    category = raw_category.strip()

    if any(keyword in category for keyword in ("商業", "商圈", "商店街", "市場", "百貨", "購物", "複合商業")):
        return "購物"

    if any(
        keyword in category
        for keyword in (
            "主題公園",
            "主題樂園",
            "遊樂園",
            "水上遊樂園",
            "摩天輪",
            "機動遊戲",
            "ローラー・コースター",
            "水族館",
        )
    ):
        return "遊樂"

    if any(
        keyword in category
        for keyword in (
            "美術館",
            "美术馆",
            "文學館",
            "文学馆",
            "藝廊",
            "艺术馆",
            "藝術館",
            "雕塑",
            "彫刻",
            "繪本",
            "書法",
            "攝影",
            "摄影",
            "電影",
            "电影",
            "音樂",
            "音乐",
            "劇院",
            "剧院",
            "文化館",
            "文化馆",
        )
    ):
        return "文化藝術"

    if any(
        keyword in category
        for keyword in (
            "博物館",
            "博物馆",
            "資料館",
            "资料馆",
            "紀念館",
            "纪念馆",
            "紀念博物館",
            "纪念博物馆",
            "会館",
            "會館",
            "資料中心",
            "资料中心",
            "博物館建築",
            "博物馆建筑",
            "宝物館",
            "寶物館",
        )
    ):
        return "博物館"

    if any(keyword in category for keyword in ("佛寺", "寺", "神社", "神宮", "神宫", "教堂", "佛塔")):
        return "寺社"

    if any(
        keyword in category
        for keyword in (
            "公園",
            "植物園",
            "動物園",
            "野生动物园",
            "野生動物園",
            "自然",
            "風景",
            "风景",
            "巨樹",
            "庭園",
            "庭院",
            "瀑布",
            "湖",
            "山",
            "森林",
            "溪谷",
            "峡谷",
            "海灘",
            "海岸",
            "濕地",
        )
    ):
        return "自然"

    if any(keyword in category for keyword in ("溫泉", "温泉")):
        return "溫泉"

    return "景點"


def build_interests(name: str, raw_category: str, category: str) -> list[str]:
    text = f"{name} {raw_category}".strip()
    interests: list[str] = [category]

    keyword_groups = [
        ("歷史", ("歷史", "历史", "古墳", "古迹", "古蹟", "天守", "城跡", "城址", "遺產", "遗产")),
        ("藝術", ("美術", "美术", "藝術", "艺术", "雕塑", "彫刻", "書法", "攝影", "摄影", "teamLab")),
        ("科學", ("科學", "科学", "天文", "宇宙", "技術", "技术", "鐵道", "铁路", "航空", "地質", "地质")),
        ("自然", ("自然", "植物園", "植物园", "動物園", "动物园", "風景", "风景", "森林", "瀑布", "海岸", "溪谷", "濕地", "湿地")),
        ("宗教", ("寺", "神社", "神宮", "神宫", "佛", "教堂")),
        ("購物", ("商店街", "市場", "市场", "百貨", "百货", "購物", "购物", "商業", "商业")),
        ("親子", ("動物園", "动物园", "水族館", "水族馆", "主題公園", "主題樂園", "游乐", "遊樂", "玩具", "兒童", "儿童")),
        ("室內", ("博物館", "博物馆", "美術館", "美术馆", "資料館", "资料馆", "紀念館", "纪念馆", "會館", "会館")),
        ("戶外", ("塔", "公園", "公园", "庭園", "庭园", "景點", "景点", "觀景台", "观景台", "溫泉", "温泉")),
        ("打卡", ("塔", "teamLab", "觀景台", "观景台", "摩天輪", "摩天轮", "水族館", "水族馆")),
    ]

    for label, keywords in keyword_groups:
        if any(keyword in text for keyword in keywords) and label not in interests:
            interests.append(label)

    if category in {"博物館", "文化藝術"} and "室內" not in interests:
        interests.append("室內")
    if category in {"自然", "景點", "溫泉"} and "戶外" not in interests:
        interests.append("戶外")
    if category == "遊樂" and "親子" not in interests:
        interests.append("親子")

    return interests


def simplify_row(row: dict[str, str]) -> dict[str, Any]:
    raw_category = row["category"] or row["interest_tags"] or ""
    category = simplify_category(raw_category)
    simplified = {
        "id": convert_scalar(row["id"]),
        "name": convert_scalar(row["name"]),
        "region": convert_scalar(row["region"]),
        "category": category,
        "interests": build_interests(row["name"], raw_category, category),
        "google_rating": convert_scalar(row["google_rating"]),
        "review_count": convert_scalar(row["review_count"]),
        "station_anchor": convert_scalar(row["station_anchor"]),
        "distance_to_station_km": convert_scalar(row["distance_to_station_km"]),
        "interest_match": convert_scalar(row["interest_match"]),
        "rating_norm": convert_scalar(row["rating_norm"]),
        "review_norm": convert_scalar(row["review_norm"]),
        "station_distance_efficiency": convert_scalar(row["station_distance_efficiency"]),
        "xai_score": convert_scalar(row["xai_score"]),
        "image_url": convert_scalar(row["image_url"]),
        "lat": convert_scalar(row["lat"]),
        "lng": convert_scalar(row["lng"]),
        "google_name_matched": convert_scalar(row["google_name_matched"]),
    }
    return simplified


def load_rows(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return [simplify_row(row) for row in reader]


def write_json(path: Path, rows: list[dict[str, Any]], indent: int) -> None:
    with path.open("w", encoding="utf-8") as file:
        if indent > 0:
            json.dump(rows, file, ensure_ascii=False, indent=indent)
            file.write("\n")
        else:
            json.dump(rows, file, ensure_ascii=False, separators=(",", ":"))


def main() -> None:
    args = parse_args()
    input_csv = Path(args.input_csv)
    output_json = Path(args.output_json)

    if not input_csv.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_csv}")

    rows = load_rows(input_csv)
    write_json(output_json, rows, args.indent)

    category_counts = Counter(row["category"] for row in rows)
    print(f"Wrote {len(rows)} rows to {output_json}")
    print("Simplified categories:")
    for category, count in category_counts.most_common():
        print(f"{count}\t{category}")


if __name__ == "__main__":
    main()
