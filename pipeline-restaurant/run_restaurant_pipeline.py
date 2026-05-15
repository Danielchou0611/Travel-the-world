#!/usr/bin/env python3
"""Run the restaurant pipeline end-to-end for the interest JSON output."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


DEFAULT_OUTPUT_DIR = Path("output")
DEFAULT_INTEREST_SUFFIX = "_interest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run build_japan_restaurants.py and simplify_restaurant_interest_json.py in sequence.",
    )
    parser.add_argument("input_json", help="Path to the source JSON file.")
    parser.add_argument(
        "output_dir",
        nargs="?",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"Directory where intermediate and final outputs will be written. Defaults to {DEFAULT_OUTPUT_DIR}.",
    )
    parser.add_argument(
        "--prefecture-lookup",
        default="",
        help="Optional lookup CSV for backfilling prefecture/category/coordinates by source_id.",
    )
    parser.add_argument(
        "--prefecture-json-dir",
        default="",
        help="Optional directory of per-prefecture JSON files used to backfill prefecture metadata.",
    )
    parser.add_argument(
        "--source-prefecture",
        default="",
        help="Optional prefecture label to apply to all rows when the input JSON is a single-prefecture file.",
    )
    parser.add_argument(
        "--output-prefix",
        default="",
        help="Optional filename prefix. Defaults to the input filename stem.",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Indent size for pretty-printed final JSON. Use 0 for compact output.",
    )
    return parser.parse_args()


def run_step(command: list[str]) -> None:
    print(f"+ {' '.join(command)}")
    subprocess.run(command, check=True)


def main() -> None:
    args = parse_args()

    script_dir = Path(__file__).resolve().parent
    input_json = Path(args.input_json)
    output_dir = Path(args.output_dir)
    prefix = args.output_prefix or input_json.stem

    scored_csv = output_dir / f"{prefix}_scored.csv"
    interest_json = output_dir / f"{prefix}{DEFAULT_INTEREST_SUFFIX}"

    build_command = [
        sys.executable,
        str(script_dir / "build_japan_restaurants.py"),
        str(input_json),
        str(output_dir),
    ]
    if args.prefecture_lookup:
        build_command.extend(["--prefecture-lookup", args.prefecture_lookup])
    if args.prefecture_json_dir:
        build_command.extend(["--prefecture-json-dir", args.prefecture_json_dir])
    if args.source_prefecture:
        build_command.extend(["--source-prefecture", args.source_prefecture])
    if args.output_prefix:
        build_command.extend(["--output-prefix", args.output_prefix])

    simplify_command = [
        sys.executable,
        str(script_dir / "simplify_restaurant_interest_json.py"),
        str(scored_csv),
        str(interest_json),
        "--indent",
        str(args.indent),
    ]

    run_step(build_command)
    run_step(simplify_command)

    print("\nPipeline complete:")
    print(f"- Scored CSV: {scored_csv}")
    print(f"- Interest JSON: {interest_json}")


if __name__ == "__main__":
    main()
