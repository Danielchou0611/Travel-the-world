#!/usr/bin/env python3
"""Legacy sample-data pipeline for cleaning attraction CSV and calculating scores."""

from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path


REQUIRED_FIELDS = {
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
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score Japan attraction records.")
    parser.add_argument(
        "--input",
        default="data/raw/attractions_japan_sample.csv",
        help="Raw attraction CSV path.",
    )
    parser.add_argument(
        "--output",
        default="data/processed/attractions_scored.csv",
        help="Scored attraction CSV path.",
    )
    return parser.parse_args()


def as_float(row: dict[str, str], field: str) -> float:
    try:
        return float(row[field])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(f"Invalid numeric value for {field!r}: {row.get(field)!r}") from exc


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        missing = REQUIRED_FIELDS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Input CSV is missing columns: {', '.join(sorted(missing))}")

        cleaned: list[dict[str, str]] = []
        seen_names: set[tuple[str, str]] = set()
        for row in reader:
            row = {key: (value or "").strip() for key, value in row.items()}
            if not row["name"] or not row["region"]:
                continue

            dedupe_key = (row["name"].casefold(), row["region"].casefold())
            if dedupe_key in seen_names:
                continue
            seen_names.add(dedupe_key)

            rating = as_float(row, "google_rating")
            reviews = int(as_float(row, "review_count"))
            distance_to_station = as_float(row, "distance_to_station_km")
            interest = as_float(row, "interest_match")
            if not 0 <= rating <= 5:
                raise ValueError(f"Rating out of range for {row['name']}: {rating}")
            if reviews < 0:
                raise ValueError(f"Review count out of range for {row['name']}: {reviews}")
            if not row["station_anchor"]:
                raise ValueError(f"Missing station anchor for {row['name']}")
            if distance_to_station < 0:
                raise ValueError(
                    f"Distance to station out of range for {row['name']}: "
                    f"{distance_to_station}",
                )
            if not 0 <= interest <= 1:
                raise ValueError(f"Interest match out of range for {row['name']}: {interest}")

            row["google_rating"] = f"{rating:.1f}"
            row["review_count"] = str(reviews)
            row["distance_to_station_km"] = f"{distance_to_station:.1f}"
            row["interest_match"] = f"{interest:.2f}"
            cleaned.append(row)

    return cleaned


def score_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    if not rows:
        return []

    max_log_reviews = max(math.log1p(as_float(row, "review_count")) for row in rows) or 1

    scored: list[dict[str, str]] = []
    for row in rows:
        rating_norm = as_float(row, "google_rating") / 5
        review_norm = math.log1p(as_float(row, "review_count")) / max_log_reviews
        interest_norm = as_float(row, "interest_match")
        station_distance_efficiency = 1 / (1 + (as_float(row, "distance_to_station_km") / 5))
        score = (
            0.4 * rating_norm
            + 0.3 * review_norm
            + 0.2 * interest_norm
            + 0.1 * station_distance_efficiency
        )
        scored.append(
            {
                **row,
                "rating_norm": f"{rating_norm:.4f}",
                "review_norm": f"{review_norm:.4f}",
                "station_distance_efficiency": f"{station_distance_efficiency:.4f}",
                "xai_score": f"{score:.4f}",
            }
        )

    return sorted(scored, key=lambda item: float(item["xai_score"]), reverse=True)


def write_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
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
    ]
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    rows = load_rows(Path(args.input))
    scored = score_rows(rows)
    write_rows(Path(args.output), scored)
    print(f"Wrote {len(scored)} scored attractions to {args.output}")


if __name__ == "__main__":
    main()
