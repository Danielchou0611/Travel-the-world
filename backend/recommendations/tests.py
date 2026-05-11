from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import PointOfInterest, UserPreferenceProfile
from .services import compute_interest_match


class RecommendationServiceTests(TestCase):
    def test_interest_match_defaults_missing_tags_to_zero(self):
        score = compute_interest_match({"歷史": 1.0}, ["歷史", "藝術"])
        self.assertEqual(score, 0.5)


class RecommendationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        PointOfInterest.objects.create(
            poi_id="Q1",
            name="歷史景點",
            region="東京都",
            category="景點",
            interests=["歷史", "戶外"],
            static_score=0.8,
        )
        PointOfInterest.objects.create(
            poi_id="Q2",
            name="藝術景點",
            region="東京都",
            category="景點",
            interests=["藝術"],
            static_score=0.75,
        )

    def test_recommendation_api_prefers_matching_interests(self):
        response = self.client.post(
            "/api/recommendations/",
            {
                "region": "東京都",
                "preferences": {"歷史": 1.0, "藝術": 0.1},
                "top_k": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], "Q1")

    def test_user_preference_upsert_and_reuse(self):
        user = get_user_model().objects.create_user(username="gary", password="secret")
        UserPreferenceProfile.objects.create(user=user, preference_profile={"藝術": 1.0})

        response = self.client.post(
            "/api/recommendations/",
            {"user_id": user.id, "region": "東京都", "top_k": 2},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], "Q2")
