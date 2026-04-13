#!/usr/bin/env python3
"""Analyze user preference CSV for Week 2 itinerary planning decisions."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


REQUIRED_FIELDS = {
    "user_id",
    "persona",
    "travel_style",
    "budget_level",
    "mobility",
    "interests",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze user travel preferences.")
    parser.add_argument(
        "--input",
        default="data/raw/user_preferences_sample.csv",
        help="User preference CSV path.",
    )
    parser.add_argument(
        "--json-output",
        default="reports/preference_analysis.json",
        help="JSON report output path.",
    )
    parser.add_argument(
        "--md-output",
        default="reports/preference_analysis.md",
        help="Markdown report output path.",
    )
    return parser.parse_args()


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        missing = REQUIRED_FIELDS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Input CSV is missing columns: {', '.join(sorted(missing))}")
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def split_interests(value: str) -> list[str]:
    return [item.strip() for item in value.split("|") if item.strip()]


def top_items(counter: Counter[str], limit: int = 5) -> list[dict[str, int | str]]:
    return [{"name": name, "count": count} for name, count in counter.most_common(limit)]


def itinerary_density_hint(style: str, mobility: str) -> str:
    if mobility == "low":
        return "每日 2-3 個景點，優先減少跨區移動。"
    if style == "intensive":
        return "每日 5-6 個景點，但需要檢查交通時間。"
    if style == "theme":
        return "每日 3-4 個同主題景點，保留一段彈性時間。"
    return "每日 3-4 個景點，適合輕鬆型行程。"


def analyze(rows: list[dict[str, str]]) -> dict[str, object]:
    interest_counter: Counter[str] = Counter()
    style_counter: Counter[str] = Counter()
    budget_counter: Counter[str] = Counter()
    mobility_counter: Counter[str] = Counter()
    persona_rows: dict[str, list[dict[str, str]]] = defaultdict(list)

    for row in rows:
        style_counter.update([row["travel_style"]])
        budget_counter.update([row["budget_level"]])
        mobility_counter.update([row["mobility"]])
        interest_counter.update(split_interests(row["interests"]))
        persona_rows[row["persona"]].append(row)

    personas: dict[str, object] = {}
    for persona, persona_group in sorted(persona_rows.items()):
        persona_interest_counter: Counter[str] = Counter()
        persona_style_counter: Counter[str] = Counter()
        persona_mobility_counter: Counter[str] = Counter()
        for row in persona_group:
            persona_interest_counter.update(split_interests(row["interests"]))
            persona_style_counter.update([row["travel_style"]])
            persona_mobility_counter.update([row["mobility"]])

        top_style = persona_style_counter.most_common(1)[0][0]
        top_mobility = persona_mobility_counter.most_common(1)[0][0]
        personas[persona] = {
            "users": len(persona_group),
            "top_interests": top_items(persona_interest_counter, 5),
            "dominant_style": top_style,
            "dominant_mobility": top_mobility,
            "itinerary_hint": itinerary_density_hint(top_style, top_mobility),
        }

    return {
        "total_users": len(rows),
        "top_interests": top_items(interest_counter, 10),
        "travel_style_distribution": dict(style_counter.most_common()),
        "budget_distribution": dict(budget_counter.most_common()),
        "mobility_distribution": dict(mobility_counter.most_common()),
        "personas": personas,
    }


def write_json(path: Path, report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_markdown(path: Path, report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# 使用者偏好分析",
        "",
        f"- 使用者筆數：{report['total_users']}",
        "",
        "## Top Interests",
    ]
    for item in report["top_interests"]:
        lines.append(f"- {item['name']}: {item['count']}")

    lines.extend(["", "## Travel Style Distribution"])
    for name, count in report["travel_style_distribution"].items():
        lines.append(f"- {name}: {count}")

    lines.extend(["", "## Persona Hints"])
    for persona, data in report["personas"].items():
        lines.append(f"- Persona {persona}: {data['itinerary_hint']}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    rows = load_rows(Path(args.input))
    report = analyze(rows)
    write_json(Path(args.json_output), report)
    write_markdown(Path(args.md_output), report)
    print(f"Analyzed {len(rows)} user preference rows")
    print(f"Wrote {args.json_output}")
    print(f"Wrote {args.md_output}")


if __name__ == "__main__":
    main()
