#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"
USER_ID="${2:-1}"

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

print_section "Save User Preference"
curl -fsS \
  -X PUT "$BASE_URL/api/users/$USER_ID/preferences/" \
  -H "Content-Type: application/json" \
  -d '{
    "travel_region": "東京都",
    "preference_profile": {
      "藝術": 1.0,
      "博物館": 0.9,
      "室內": 0.8,
      "歷史": 0.4
    }
  }' | show_json '.'

print_section "Read User Preference"
curl -fsS \
  "$BASE_URL/api/users/$USER_ID/preferences/" | show_json '.'

print_section "Recommendations By User ID"
curl -fsS \
  -X POST "$BASE_URL/api/recommendations/" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $USER_ID,
    \"region\": \"東京都\",
    \"top_k\": 5
  }" | show_json '{count, preferences, results: .results[:5]}'

print_section "Done"
echo "User preference flow completed against $BASE_URL with user_id=$USER_ID"
