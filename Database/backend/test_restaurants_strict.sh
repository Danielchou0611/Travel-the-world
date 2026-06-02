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

fetch() {
  local method="$1"
  local url="$2"
  local body="${3:-}"

  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "$url" -H "Content-Type: application/json" -d "$body"
  else
    curl -fsS -X "$method" "$url"
  fi
}

assert_jq() {
  local json="$1"
  local expression="$2"
  local message="$3"

  if ! printf '%s' "$json" | jq -e "$expression" >/dev/null; then
    echo "ASSERTION FAILED: $message" >&2
    printf '%s\n' "$json" | jq '.'
    exit 1
  fi
}

show_json() {
  local json="$1"
  printf '%s\n' "$json" | jq '.'
}

require_command curl
require_command jq

print_section "Health"
health_json="$(fetch GET "$BASE_URL/")"
assert_jq "$health_json" '.status == "ok"' "Health endpoint did not return ok status"
assert_jq "$health_json" '.endpoints.restaurants == "/api/restaurants/"' "Restaurants endpoint missing from root response"
show_json "$health_json"

print_section "Restaurant Metadata"
metadata_json="$(fetch GET "$BASE_URL/api/restaurants/metadata/")"
assert_jq "$metadata_json" '.restaurant_count > 0' "Restaurant count must be greater than zero"
assert_jq "$metadata_json" '.regions | index("東京都") != null' "東京都 should exist in regions"
assert_jq "$metadata_json" '.categories | length > 0' "Categories should not be empty"
assert_jq "$metadata_json" '.venue_types | length > 0' "Venue types should not be empty"
show_json "$metadata_json"

print_section "Restaurant List In Tokyo"
tokyo_list_json="$(fetch GET "$BASE_URL/api/restaurants/?region=%E6%9D%B1%E4%BA%AC%E9%83%BD&page_size=3")"
assert_jq "$tokyo_list_json" '.count > 0' "Tokyo restaurant list should not be empty"
assert_jq "$tokyo_list_json" '.results | length > 0' "Tokyo restaurant list results should not be empty"
assert_jq "$tokyo_list_json" 'all(.results[]; .region == "東京都")' "Tokyo restaurant list should only contain 東京都"
assert_jq "$tokyo_list_json" 'all(.results[]; (.raw_type // "") != "")' "All listed restaurants should include raw_type"
show_json "$tokyo_list_json"

print_section "Restaurant List In Tokyo Ramen"
tokyo_ramen_json="$(fetch GET "$BASE_URL/api/restaurants/?region=%E6%9D%B1%E4%BA%AC%E9%83%BD&category=%E6%8B%89%E9%BA%B5&page_size=3")"
assert_jq "$tokyo_ramen_json" '.count > 0' "Tokyo ramen list should not be empty"
assert_jq "$tokyo_ramen_json" 'all(.results[]; .region == "東京都" and .category == "拉麵")' "Tokyo ramen list should only contain 東京都 拉麵"
show_json "$tokyo_ramen_json"

print_section "Restaurant Recommendations By Region"
region_reco_json="$(fetch POST "$BASE_URL/api/restaurants/recommendations/" '{
  "region": "東京都",
  "top_k": 5
}')"
assert_jq "$region_reco_json" '.count > 0' "Region recommendations should not be empty"
assert_jq "$region_reco_json" '.filters.region == "東京都"' "Region filter should be 東京都"
assert_jq "$region_reco_json" 'all(.results[]; .region == "東京都")' "Region recommendations should only contain 東京都"
assert_jq "$region_reco_json" 'all(.results[]; .distance_m == null)' "Region recommendations without coordinates should have null distance_m"
assert_jq "$region_reco_json" 'all(.results[]; .final_score == .static_score)' "final_score should equal static_score"
assert_jq "$region_reco_json" '([.results[].final_score] | . == (sort | reverse))' "Region recommendations should be sorted by final_score descending"
show_json "$region_reco_json"

print_section "Restaurant Recommendations By Region And Category"
region_category_reco_json="$(fetch POST "$BASE_URL/api/restaurants/recommendations/" '{
  "region": "東京都",
  "category": "拉麵",
  "top_k": 5
}')"
assert_jq "$region_category_reco_json" '.count > 0' "Region/category recommendations should not be empty"
assert_jq "$region_category_reco_json" 'all(.results[]; .region == "東京都" and .category == "拉麵")' "Region/category recommendations should match filters"
assert_jq "$region_category_reco_json" 'all(.results[]; .final_score == .static_score)' "final_score should equal static_score for region/category recommendations"
show_json "$region_category_reco_json"

print_section "Nearby Restaurant Recommendations"
nearby_json="$(fetch POST "$BASE_URL/api/restaurants/recommendations/" '{
  "lat": 35.681236,
  "lng": 139.767125,
  "radius_m": 300,
  "top_k": 5
}')"
assert_jq "$nearby_json" '.count > 0' "Nearby recommendations should not be empty"
assert_jq "$nearby_json" '.filters.radius_m == 300' "Nearby radius should be 300"
assert_jq "$nearby_json" 'all(.results[]; .distance_m != null)' "Nearby recommendations should include distance_m"
assert_jq "$nearby_json" 'all(.results[]; .distance_m <= 300)' "Nearby recommendations should stay within 300 meters"
assert_jq "$nearby_json" 'all(.results[]; .final_score == .static_score)' "final_score should equal static_score for nearby recommendations"
show_json "$nearby_json"

print_section "Nearby Restaurant Recommendations With Category"
nearby_category_json="$(fetch POST "$BASE_URL/api/restaurants/recommendations/" '{
  "lat": 35.681236,
  "lng": 139.767125,
  "radius_m": 500,
  "category": "咖啡",
  "top_k": 5
}')"
assert_jq "$nearby_category_json" '.count > 0' "Nearby category recommendations should not be empty"
assert_jq "$nearby_category_json" '.filters.category == "咖啡"' "Nearby category filter should be 咖啡"
assert_jq "$nearby_category_json" 'all(.results[]; .category == "咖啡")' "Nearby category recommendations should only contain 咖啡"
assert_jq "$nearby_category_json" 'all(.results[]; .distance_m <= 500)' "Nearby category recommendations should stay within 500 meters"
show_json "$nearby_category_json"

print_section "Validation Error Check"
validation_json="$(curl -sS -X POST "$BASE_URL/api/restaurants/recommendations/" -H "Content-Type: application/json" -d '{
  "lat": 35.681236,
  "top_k": 5
}')"
assert_jq "$validation_json" '.non_field_errors[0] == "lat and lng must be provided together."' "Validation error message mismatch"
show_json "$validation_json"

print_section "Done"
echo "Strict restaurant test completed successfully against $BASE_URL"
