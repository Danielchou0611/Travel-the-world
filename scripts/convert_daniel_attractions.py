#!/usr/bin/env python3
"""Convert Travel-the-world-Daniel Japan JSON files into reusable catalog CSVs."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
from pathlib import Path
from typing import Any


SOURCE_NAME = "Travel-the-world-Daniel"
DEFAULT_GOOGLE_RATING = 4.0
DEFAULT_REVIEW_COUNT = 100
DEFAULT_INTEREST_MATCH = 0.70

COORDINATE_PATTERN = re.compile(r"Point\((?P<lng>-?\d+(?:\.\d+)?) (?P<lat>-?\d+(?:\.\d+)?)\)")

STATION_ANCHORS: dict[str, tuple[str, float, float]] = {
    "北海道": ("Sapporo Station", 43.0687, 141.3508),
    "青森縣": ("Aomori Station", 40.8285, 140.7347),
    "岩手縣": ("Morioka Station", 39.7017, 141.1364),
    "宮城縣": ("Sendai Station", 38.2602, 140.8824),
    "秋田縣": ("Akita Station", 39.7167, 140.1297),
    "山形縣": ("Yamagata Station", 38.2489, 140.3273),
    "福島縣": ("Fukushima Station", 37.7541, 140.4596),
    "茨城縣": ("Mito Station", 36.3708, 140.4761),
    "栃木縣": ("Utsunomiya Station", 36.5593, 139.8987),
    "群馬縣": ("Maebashi Station", 36.3834, 139.0726),
    "埼玉縣": ("Omiya Station", 35.9064, 139.6241),
    "千葉縣": ("Chiba Station", 35.6134, 140.1132),
    "東京都": ("Tokyo Station", 35.6812, 139.7671),
    "神奈川縣": ("Yokohama Station", 35.4662, 139.6227),
    "新潟縣": ("Niigata Station", 37.9121, 139.0618),
    "富山縣": ("Toyama Station", 36.7015, 137.2130),
    "石川縣": ("Kanazawa Station", 36.5781, 136.6480),
    "福井縣": ("Fukui Station", 36.0619, 136.2236),
    "山梨縣": ("Kofu Station", 35.6671, 138.5683),
    "長野縣": ("Nagano Station", 36.6430, 138.1888),
    "岐阜縣": ("Gifu Station", 35.4090, 136.7563),
    "靜岡縣": ("Shizuoka Station", 34.9717, 138.3888),
    "愛知縣": ("Nagoya Station", 35.1709, 136.8815),
    "三重縣": ("Tsu Station", 34.7340, 136.5101),
    "滋賀縣": ("Otsu Station", 35.0038, 135.8644),
    "京都府": ("Kyoto Station", 34.9858, 135.7588),
    "大阪府": ("Osaka Station", 34.7025, 135.4959),
    "兵庫縣": ("Kobe Station", 34.6795, 135.1781),
    "奈良縣": ("Nara Station", 34.6805, 135.8188),
    "和歌山縣": ("Wakayama Station", 34.2320, 135.1911),
    "鳥取縣": ("Tottori Station", 35.4940, 134.2258),
    "島根縣": ("Matsue Station", 35.4640, 133.0636),
    "岡山縣": ("Okayama Station", 34.6666, 133.9186),
    "廣島縣": ("Hiroshima Station", 34.3976, 132.4753),
    "山口縣": ("Yamaguchi Station", 34.1727, 131.4800),
    "德島縣": ("Tokushima Station", 34.0742, 134.5510),
    "香川縣": ("Takamatsu Station", 34.3505, 134.0466),
    "愛媛縣": ("Matsuyama Station", 33.8403, 132.7515),
    "高知縣": ("Kochi Station", 33.5663, 133.5434),
    "福岡縣": ("Hakata Station", 33.5902, 130.4207),
    "佐賀縣": ("Saga Station", 33.2640, 130.2973),
    "長崎縣": ("Nagasaki Station", 32.7521, 129.8707),
    "熊本縣": ("Kumamoto Station", 32.7903, 130.6899),
    "大分縣": ("Oita Station", 33.2330, 131.6066),
    "宮崎縣": ("Miyazaki Station", 31.9157, 131.4314),
    "鹿兒島縣": ("Kagoshima-Chuo Station", 31.5837, 130.5410),
    "沖繩縣": ("Naha Bus Terminal", 26.2125, 127.6792),
}

NORMALIZED_FIELDS = [
    "source_id",
    "name",
    "prefecture",
    "category",
    "lat",
    "lng",
    "google_rating",
    "google_star",
    "google_review_count",
    "image_url",
    "has_image",
    "source",
]

SCORED_FIELDS = [
    "id",
    "name",
    "region",
    "category",
    "google_rating",
    "review_count",
    "interest_tags",
    "station_anchor",
    "distance_to_station_km",
    "interest_match",
    "rating_norm",
    "review_norm",
    "station_distance_efficiency",
    "xai_score",
    "image_url",
    "lat",
    "lng",
    "source_id",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert Daniel Japan attraction JSON files.")
    parser.add_argument(
        "--input-dir",
        default="Travel-the-world-Daniel/japan_data",
        help="Directory containing per-prefecture JSON files.",
    )
    parser.add_argument(
        "--normalized-output",
        default="data/processed/daniel_attractions_normalized.csv",
        help="Output path for cleaned source catalog.",
    )
    parser.add_argument(
        "--scored-output",
        default="data/processed/daniel_attractions_scored.csv",
        help="Output path for app-ready scored catalog.",
    )
    parser.add_argument(
        "--report-output",
        default="reports/daniel_conversion_report.json",
        help="Output path for conversion statistics.",
    )
    parser.add_argument(
        "--frontend-output",
        default="frontend/public/data/attractions_scored.csv",
        help="Frontend catalog path used when --sync-frontend is set.",
    )
    parser.add_argument(
        "--sync-frontend",
        action="store_true",
        help="Copy scored output to the frontend catalog after conversion.",
    )
    return parser.parse_args()


def parse_coordinates(value: str) -> tuple[float | None, float | None]:
    match = COORDINATE_PATTERN.fullmatch(value.strip())
    if not match:
        return None, None
    return float(match.group("lat")), float(match.group("lng"))


def coalesce(row: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value).strip()
    return ""


def clean_image_url(value: str) -> str:
    value = value.strip()
    return "" if value == "No Image" else value


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def load_raw_rows(input_dir: Path) -> tuple[list[dict[str, str]], dict[str, int]]:
    rows: list[dict[str, str]] = []
    stats = {
        "input_files": 0,
        "raw_rows": 0,
        "rows_without_coordinates": 0,
        "rows_without_station_mapping": 0,
    }

    for path in sorted(input_dir.glob("*.json")):
        stats["input_files"] += 1
        prefecture = path.stem
        anchor = STATION_ANCHORS.get(prefecture)
        if anchor is None:
            stats["rows_without_station_mapping"] += 1

        data = json.loads(path.read_text(encoding="utf-8"))
        for raw in data:
            stats["raw_rows"] += 1
            lat, lng = parse_coordinates(str(raw.get("coordinates", "")))
            if lat is None or lng is None:
                stats["rows_without_coordinates"] += 1

            image_url = clean_image_url(str(raw.get("image", "")))
            google_rating = coalesce(raw, ["google_rating", "google_rate", "rating"])
            google_star = coalesce(raw, ["google_star", "star", "stars"])
            if not google_rating:
                google_rating = google_star
            if not google_star:
                google_star = google_rating

            rows.append(
                {
                    "source_id": str(raw.get("id", "")).strip(),
                    "name": str(raw.get("name", "")).strip(),
                    "prefecture": prefecture,
                    "category": str(raw.get("type", "")).strip(),
                    "lat": "" if lat is None else f"{lat:.7f}",
                    "lng": "" if lng is None else f"{lng:.7f}",
                    "google_rating": google_rating,
                    "google_star": google_star,
                    "google_review_count": coalesce(
                        raw,
                        ["google_review_count", "review_count", "reviews", "rating_count"],
                    ),
                    "image_url": image_url,
                    "has_image": "1" if image_url else "0",
                    "source": SOURCE_NAME,
                }
            )

    return rows, stats


def dedupe_rows(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], int]:
    by_id: dict[str, dict[str, str]] = {}
    duplicate_count = 0

    for row in rows:
        key = row["source_id"] or f"{row['prefecture']}::{row['name']}::{row['lat']}::{row['lng']}"
        current = by_id.get(key)
        if current is None:
            by_id[key] = row
            continue

        duplicate_count += 1
        current_has_image = current["has_image"] == "1"
        row_has_image = row["has_image"] == "1"
        if row_has_image and not current_has_image:
            by_id[key] = row

    return list(by_id.values()), duplicate_count


def as_float(value: str, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def build_scored_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    max_log_reviews = math.log1p(DEFAULT_REVIEW_COUNT)
    scored_rows: list[dict[str, str]] = []

    for index, row in enumerate(rows, start=1):
        anchor_name, anchor_lat, anchor_lng = STATION_ANCHORS[row["prefecture"]]
        lat = as_float(row["lat"], anchor_lat)
        lng = as_float(row["lng"], anchor_lng)
        distance_to_station = haversine_km(lat, lng, anchor_lat, anchor_lng)
        google_rating = as_float(row["google_rating"], DEFAULT_GOOGLE_RATING)
        review_count = int(as_float(row["google_review_count"], DEFAULT_REVIEW_COUNT))
        rating_norm = google_rating / 5
        review_norm = math.log1p(review_count) / max_log_reviews
        station_distance_efficiency = 1 / (1 + distance_to_station / 5)
        xai_score = (
            0.4 * rating_norm
            + 0.3 * review_norm
            + 0.2 * DEFAULT_INTEREST_MATCH
            + 0.1 * station_distance_efficiency
        )

        scored_rows.append(
            {
                "id": str(index),
                "name": row["name"],
                "region": row["prefecture"],
                "category": row["category"],
                "google_rating": f"{google_rating:.1f}",
                "review_count": str(review_count),
                "interest_tags": row["category"],
                "station_anchor": anchor_name,
                "distance_to_station_km": f"{distance_to_station:.1f}",
                "interest_match": f"{DEFAULT_INTEREST_MATCH:.2f}",
                "rating_norm": f"{rating_norm:.4f}",
                "review_norm": f"{review_norm:.4f}",
                "station_distance_efficiency": f"{station_distance_efficiency:.4f}",
                "xai_score": f"{xai_score:.4f}",
                "image_url": row["image_url"],
                "lat": row["lat"],
                "lng": row["lng"],
                "source_id": row["source_id"],
            }
        )

    return sorted(scored_rows, key=lambda item: float(item["xai_score"]), reverse=True)


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_report(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    raw_rows, stats = load_raw_rows(Path(args.input_dir))
    normalized_rows, duplicate_count = dedupe_rows(raw_rows)
    scored_rows = build_scored_rows(normalized_rows)

    normalized_output = Path(args.normalized_output)
    scored_output = Path(args.scored_output)
    report_output = Path(args.report_output)
    frontend_output = Path(args.frontend_output)

    write_csv(normalized_output, normalized_rows, NORMALIZED_FIELDS)
    write_csv(scored_output, scored_rows, SCORED_FIELDS)

    report = {
        **stats,
        "normalized_rows": len(normalized_rows),
        "scored_rows": len(scored_rows),
        "duplicate_rows_removed": duplicate_count,
        "rows_without_image": sum(1 for row in normalized_rows if row["has_image"] == "0"),
        "default_google_rating": DEFAULT_GOOGLE_RATING,
        "default_review_count": DEFAULT_REVIEW_COUNT,
        "default_interest_match": DEFAULT_INTEREST_MATCH,
        "normalized_output": str(normalized_output),
        "scored_output": str(scored_output),
    }

    if args.sync_frontend:
        frontend_output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(scored_output, frontend_output)
        report["frontend_output"] = str(frontend_output)

    write_report(report_output, report)
    print(f"Wrote {len(normalized_rows)} normalized attractions to {normalized_output}")
    print(f"Wrote {len(scored_rows)} scored attractions to {scored_output}")
    print(f"Wrote conversion report to {report_output}")
    if args.sync_frontend:
        print(f"Synced frontend catalog to {frontend_output}")


if __name__ == "__main__":
    main()
