from dataclasses import dataclass
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
