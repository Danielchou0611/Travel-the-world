#!/usr/bin/env python3
"""Standalone Japan attraction pipeline: JSON -> normalized CSV -> scored CSV."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from pathlib import Path
from typing import Any


SOURCE_NAME = "japan_with_rating"
DEFAULT_GOOGLE_RATING = 4.0
DEFAULT_REVIEW_COUNT = 100
DEFAULT_INTEREST_MATCH = 0.70
DEFAULT_LOOKUP_PATH = Path(__file__).resolve().parent / "reference" / "source_id_metadata_lookup.csv"

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
    "google_name_matched",
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
    "google_name_matched",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a Japan attractions JSON file into normalized/scored CSV outputs.",
    )
    parser.add_argument("input_json", help="Path to the source JSON file.")
    parser.add_argument("output_dir", help="Directory where the CSV and report files will be written.")
    parser.add_argument(
        "--prefecture-lookup",
        default=str(DEFAULT_LOOKUP_PATH),
        help="Optional lookup CSV for backfilling prefecture/category/coordinates by source_id.",
    )
    parser.add_argument(
        "--output-prefix",
        default="",
        help="Optional filename prefix. Defaults to the input filename stem.",
    )
    return parser.parse_args()


def coalesce(record: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return str(value).strip()
    return ""


def clean_image_url(value: str) -> str:
    value = value.strip()
    return "" if not value or value == "No Image" else value


def parse_coordinates(record: dict[str, Any]) -> tuple[str, str]:
    coordinate_text = coalesce(record, ["coordinates", "coordinate", "geo"])
    if coordinate_text:
        match = COORDINATE_PATTERN.fullmatch(coordinate_text)
        if match:
            return f"{float(match.group('lat')):.7f}", f"{float(match.group('lng')):.7f}"

    lat = coalesce(record, ["lat", "latitude"])
    lng = coalesce(record, ["lng", "lon", "long", "longitude"])
    return lat, lng


def as_float(value: str, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def load_prefecture_lookup(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}

    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        lookup: dict[str, dict[str, str]] = {}
        for row in reader:
            source_id = (row.get("source_id") or "").strip()
            if source_id:
                lookup[source_id] = {key: (value or "").strip() for key, value in row.items()}
    return lookup


def metadata_score(row: dict[str, str]) -> tuple[int, int, int, int]:
    return (
        1 if row["prefecture"] else 0,
        1 if row["lat"] and row["lng"] else 0,
        1 if row["has_image"] == "1" else 0,
        1 if row["google_review_count"] else 0,
    )


def load_normalized_rows(
    input_json: Path,
    prefecture_lookup: dict[str, dict[str, str]],
) -> tuple[list[dict[str, str]], dict[str, int]]:
    raw_data = json.loads(input_json.read_text(encoding="utf-8"))
    if not isinstance(raw_data, list):
        raise ValueError("Input JSON must be a list of attraction objects.")

    stats = {
        "raw_rows": len(raw_data),
        "duplicate_rows_removed": 0,
        "lookup_prefecture_hits": 0,
        "rows_missing_prefecture": 0,
        "rows_missing_coordinates": 0,
        "rows_missing_station_mapping": 0,
        "rows_missing_google_rating": 0,
        "rows_missing_review_count": 0,
    }

    deduped: dict[str, dict[str, str]] = {}
    for record in raw_data:
        if not isinstance(record, dict):
            continue

        source_id = coalesce(record, ["id", "source_id"])
        if not source_id:
            continue

        lookup_row = prefecture_lookup.get(source_id, {})
        lat, lng = parse_coordinates(record)
        if (not lat or not lng) and lookup_row:
            lat = lat or lookup_row.get("lat", "")
            lng = lng or lookup_row.get("lng", "")

        prefecture = coalesce(record, ["prefecture", "region", "address_prefecture", "address_region"])
        if not prefecture and lookup_row:
            prefecture = lookup_row.get("prefecture", "")
            if prefecture:
                stats["lookup_prefecture_hits"] += 1

        category = coalesce(record, ["category", "type"]) or lookup_row.get("category", "")
        image_url = clean_image_url(coalesce(record, ["image_url", "image"])) or lookup_row.get(
            "image_url",
            "",
        )

        row = {
            "source_id": source_id,
            "name": coalesce(record, ["name"]) or lookup_row.get("name", ""),
            "prefecture": prefecture.strip(),
            "category": category,
            "lat": lat,
            "lng": lng,
            "google_rating": coalesce(record, ["google_rating", "google_star", "rating"]),
            "google_star": coalesce(record, ["google_star", "google_rating", "rating"]),
            "google_review_count": coalesce(
                record,
                ["google_review_count", "review_count", "reviews", "rating_count"],
            ),
            "google_name_matched": coalesce(record, ["google_name_matched", "matched_name"]),
            "image_url": image_url,
            "has_image": "1" if image_url else "0",
            "source": SOURCE_NAME,
        }

        current = deduped.get(source_id)
        if current is None:
            deduped[source_id] = row
        else:
            stats["duplicate_rows_removed"] += 1
            if metadata_score(row) > metadata_score(current):
                deduped[source_id] = row

    normalized_rows = list(deduped.values())
    for row in normalized_rows:
        if not row["prefecture"]:
            stats["rows_missing_prefecture"] += 1
        elif row["prefecture"] not in STATION_ANCHORS:
            stats["rows_missing_station_mapping"] += 1
        if not row["lat"] or not row["lng"]:
            stats["rows_missing_coordinates"] += 1
        if not row["google_rating"]:
            stats["rows_missing_google_rating"] += 1
        if not row["google_review_count"]:
            stats["rows_missing_review_count"] += 1

    normalized_rows.sort(key=lambda row: (row["prefecture"], row["name"], row["source_id"]))
    return normalized_rows, stats


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


def build_scored_rows(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], dict[str, int]]:
    eligible_rows = [
        row for row in rows if row["prefecture"] in STATION_ANCHORS and row["lat"] and row["lng"]
    ]
    if not eligible_rows:
        return [], {"scored_rows": 0, "skipped_rows": len(rows)}

    review_values = [
        max(0, int(as_float(row["google_review_count"], DEFAULT_REVIEW_COUNT))) for row in eligible_rows
    ]
    max_log_reviews = max((math.log1p(value) for value in review_values), default=1.0) or 1.0

    scored_rows: list[dict[str, str]] = []
    for row in eligible_rows:
        anchor_name, anchor_lat, anchor_lng = STATION_ANCHORS[row["prefecture"]]
        lat = as_float(row["lat"], anchor_lat)
        lng = as_float(row["lng"], anchor_lng)
        google_rating = as_float(row["google_rating"], DEFAULT_GOOGLE_RATING)
        review_count = max(0, int(as_float(row["google_review_count"], DEFAULT_REVIEW_COUNT)))
        distance_to_station = haversine_km(lat, lng, anchor_lat, anchor_lng)
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
                "id": row["source_id"],
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
                "lat": f"{lat:.7f}",
                "lng": f"{lng:.7f}",
                "source_id": row["source_id"],
                "google_name_matched": row["google_name_matched"],
            }
        )

    scored_rows.sort(key=lambda item: float(item["xai_score"]), reverse=True)
    return scored_rows, {"scored_rows": len(scored_rows), "skipped_rows": len(rows) - len(scored_rows)}


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_report(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def output_prefix(args: argparse.Namespace) -> str:
    return args.output_prefix or Path(args.input_json).stem


def main() -> None:
    args = parse_args()
    input_json = Path(args.input_json)
    output_dir = Path(args.output_dir)
    prefix = output_prefix(args)
    prefecture_lookup = load_prefecture_lookup(Path(args.prefecture_lookup))

    normalized_rows, normalize_stats = load_normalized_rows(input_json, prefecture_lookup)
    scored_rows, score_stats = build_scored_rows(normalized_rows)

    normalized_output = output_dir / f"{prefix}_normalized.csv"
    scored_output = output_dir / f"{prefix}_scored.csv"
    report_output = output_dir / f"{prefix}_pipeline_report.json"

    write_csv(normalized_output, normalized_rows, NORMALIZED_FIELDS)
    write_csv(scored_output, scored_rows, SCORED_FIELDS)

    report: dict[str, Any] = {
        **normalize_stats,
        **score_stats,
        "input_json": str(input_json),
        "prefecture_lookup": str(Path(args.prefecture_lookup)),
        "prefecture_lookup_rows": len(prefecture_lookup),
        "normalized_rows": len(normalized_rows),
        "default_google_rating": DEFAULT_GOOGLE_RATING,
        "default_review_count": DEFAULT_REVIEW_COUNT,
        "default_interest_match": DEFAULT_INTEREST_MATCH,
        "normalized_output": str(normalized_output),
        "scored_output": str(scored_output),
    }
    write_report(report_output, report)

    print(f"Wrote {len(normalized_rows)} normalized attractions to {normalized_output}")
    print(f"Wrote {len(scored_rows)} scored attractions to {scored_output}")
    print(f"Wrote pipeline report to {report_output}")


if __name__ == "__main__":
    main()
