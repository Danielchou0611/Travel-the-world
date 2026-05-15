from dataclasses import dataclass
import math
from typing import Iterable

from django.conf import settings


@dataclass
class RecommendationScore:
    interest_match: float
    static_score: float
    final_score: float


def normalize_preferences(preferences: dict | None) -> dict[str, float]:
    normalized: dict[str, float] = {}
    for key, value in (preferences or {}).items():
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        normalized[str(key)] = max(0.0, min(1.0, score))
    return normalized


def compute_interest_match(preferences: dict[str, float], interests: Iterable[str]) -> float:
    interest_list = [str(tag) for tag in interests if str(tag).strip()]
    if not interest_list:
        return 0.0
    return sum(preferences.get(tag, 0.0) for tag in interest_list) / len(interest_list)


def compute_recommendation_score(*, preferences: dict[str, float], interests: Iterable[str], static_score: float) -> RecommendationScore:
    interest_match = compute_interest_match(preferences, interests)
    static_weight = settings.RECOMMENDATION_STATIC_WEIGHT
    interest_weight = settings.RECOMMENDATION_INTEREST_WEIGHT
    final_score = (static_weight * float(static_score)) + (interest_weight * interest_match)
    return RecommendationScore(
        interest_match=round(interest_match, 4),
        static_score=round(float(static_score), 4),
        final_score=round(final_score, 4),
    )


def haversine_distance_meters(*, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius_m = 6371000
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_m * c


def build_bounding_box(*, lat: float, lng: float, radius_m: float) -> dict[str, float]:
    lat_offset = radius_m / 111_320
    cos_lat = math.cos(math.radians(lat))
    if abs(cos_lat) < 1e-12:
        lng_offset = 180.0
    else:
        lng_offset = radius_m / (111_320 * cos_lat)

    return {
        "min_lat": lat - lat_offset,
        "max_lat": lat + lat_offset,
        "min_lng": lng - lng_offset,
        "max_lng": lng + lng_offset,
    }
