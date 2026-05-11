#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

print_section() {
  printf '\n== %s ==\n' "$1"
}

show_json() {
  if command -v jq >/dev/null 2>&1; then
    jq "$1"
  else
    cat
  fi
}

require_command curl

print_section "Health"
curl -fsS "$BASE_URL/" | show_json '.'

print_section "Metadata"
curl -fsS "$BASE_URL/api/metadata/" | show_json '.'

print_section "POIs In Tokyo"
curl -fsS "$BASE_URL/api/pois/?region=%E6%9D%B1%E4%BA%AC%E9%83%BD&page_size=3" | show_json '.results[:3]'

print_section "Recommendations"
curl -fsS \
  -X POST "$BASE_URL/api/recommendations/" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "東京都",
    "preferences": {
      "打卡": 1.0,
      "戶外": 0.8,
      "歷史": 0.3
    },
    "top_k": 5
  }' | show_json '{count, results: .results[:5]}'

print_section "Done"
echo "Smoke test completed against $BASE_URL"
