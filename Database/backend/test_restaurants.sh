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

print_section "Restaurant Metadata"
curl -fsS "$BASE_URL/api/restaurants/metadata/" | show_json '.'

print_section "Restaurant List In Tokyo"
curl -fsS "$BASE_URL/api/restaurants/?region=%E6%9D%B1%E4%BA%AC%E9%83%BD&page_size=3" | show_json '{count, results: .results[:3]}'

print_section "Restaurant List In Tokyo Ramen"
curl -fsS "$BASE_URL/api/restaurants/?region=%E6%9D%B1%E4%BA%AC%E9%83%BD&category=%E6%8B%89%E9%BA%B5&page_size=3" | show_json '{count, results: .results[:3]}'

print_section "Restaurant Recommendations By Region"
curl -fsS \
  -X POST "$BASE_URL/api/restaurants/recommendations/" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "東京都",
    "top_k": 5
  }' | show_json '{count, filters, results: .results[:5]}'

print_section "Restaurant Recommendations By Region And Category"
curl -fsS \
  -X POST "$BASE_URL/api/restaurants/recommendations/" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "東京都",
    "category": "拉麵",
    "top_k": 5
  }' | show_json '{count, filters, results: .results[:5]}'

print_section "Nearby Restaurant Recommendations"
curl -fsS \
  -X POST "$BASE_URL/api/restaurants/recommendations/" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 35.681236,
    "lng": 139.767125,
    "radius_m": 300,
    "top_k": 5
  }' | show_json '{count, filters, results: .results[:5]}'

print_section "Nearby Restaurant Recommendations With Category"
curl -fsS \
  -X POST "$BASE_URL/api/restaurants/recommendations/" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 35.681236,
    "lng": 139.767125,
    "radius_m": 500,
    "category": "咖啡",
    "top_k": 5
  }' | show_json '{count, filters, results: .results[:5]}'

print_section "Done"
echo "Restaurant smoke test completed against $BASE_URL"
