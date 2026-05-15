#!/usr/bin/env python3
"""Convert a CSV file into a JSON array."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


DEFAULT_INPUT = Path("output/日本全_v1_with_rating_scored.csv")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a CSV file into a JSON file.",
    )
    parser.add_argument(
        "input_csv",
        nargs="?",
        default=str(DEFAULT_INPUT),
        help=f"Path to the input CSV file. Defaults to {DEFAULT_INPUT}.",
    )
    parser.add_argument(
        "output_json",
        nargs="?",
        default="",
        help="Path to the output JSON file. Defaults to the input path with a .json suffix.",
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


def load_csv_rows(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return [
            {key: convert_scalar(value or "") for key, value in row.items()}
            for row in reader
        ]


def main() -> None:
    args = parse_args()

    input_csv = Path(args.input_csv)
    if not input_csv.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_csv}")

    output_json = Path(args.output_json) if args.output_json else input_csv.with_suffix(".json")
    rows = load_csv_rows(input_csv)

    with output_json.open("w", encoding="utf-8") as file:
        if args.indent > 0:
            json.dump(rows, file, ensure_ascii=False, indent=args.indent)
            file.write("\n")
        else:
            json.dump(rows, file, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(rows)} rows to {output_json}")


if __name__ == "__main__":
    main()
