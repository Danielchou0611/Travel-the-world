import json
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import PointOfInterest, Restaurant, UserPreferenceProfile
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
            context="江戶時代歷史景點",
            interests=["歷史", "戶外"],
            static_score=0.8,
        )
        PointOfInterest.objects.create(
            poi_id="Q2",
            name="藝術景點",
            region="東京都",
            category="景點",
            context="當代藝術展館",
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
        self.assertEqual(response.data["results"][0]["context"], "江戶時代歷史景點")

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

    def test_poi_list_returns_context(self):
        response = self.client.get("/api/pois/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["context"], "江戶時代歷史景點")


class RestaurantApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Restaurant.objects.create(
            restaurant_id="R1",
            name="東京拉麵一號店",
            region="東京都",
            category="拉麵",
            venue_type="餐廳",
            context="車站附近的熱門拉麵店",
            static_score=0.95,
            google_rating=4.8,
            review_count=1000,
            lat=35.6812,
            lng=139.7671,
            raw_type="拉麵店",
        )
        Restaurant.objects.create(
            restaurant_id="R2",
            name="東京咖啡店",
            region="東京都",
            category="咖啡",
            venue_type="小店",
            context="適合下午休息的咖啡廳",
            static_score=0.85,
            google_rating=4.6,
            review_count=500,
            lat=35.6820,
            lng=139.7680,
            raw_type="咖啡廳",
        )
        Restaurant.objects.create(
            restaurant_id="R3",
            name="大阪壽司店",
            region="大阪府",
            category="壽司",
            venue_type="餐廳",
            context="在地人常去的壽司店",
            static_score=0.92,
            google_rating=4.7,
            review_count=800,
            lat=34.6937,
            lng=135.5023,
            raw_type="壽司店",
        )

    def test_restaurant_list_filters_by_region_and_category(self):
        response = self.client.get("/api/restaurants/?region=東京都&category=拉麵")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], "R1")
        self.assertEqual(response.data["results"][0]["raw_type"], "拉麵店")
        self.assertEqual(response.data["results"][0]["context"], "車站附近的熱門拉麵店")

    def test_restaurant_metadata_includes_venue_types(self):
        response = self.client.get("/api/restaurants/metadata/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["restaurant_count"], 3)
        self.assertIn("東京都", response.data["regions"])
        self.assertIn("拉麵", response.data["categories"])
        self.assertIn("餐廳", response.data["venue_types"])
        self.assertIn("小店", response.data["venue_types"])

    def test_restaurant_recommendations_by_region_use_static_score(self):
        response = self.client.post(
            "/api/restaurants/recommendations/",
            {"region": "東京都", "top_k": 2},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["results"][0]["id"], "R1")
        self.assertEqual(response.data["results"][0]["context"], "車站附近的熱門拉麵店")
        self.assertEqual(response.data["results"][0]["final_score"], 0.95)
        self.assertIsNone(response.data["results"][0]["distance_m"])

    def test_restaurant_recommendations_support_nearby_defaults(self):
        response = self.client.post(
            "/api/restaurants/recommendations/",
            {"lat": 35.681236, "lng": 139.767125, "top_k": 10},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["radius_m"], 300)
        result_ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(result_ids, ["R1", "R2"])
        self.assertLessEqual(response.data["results"][0]["distance_m"], 300)
        self.assertLessEqual(response.data["results"][1]["distance_m"], 300)

    def test_restaurant_recommendations_require_lat_lng_together(self):
        response = self.client.post(
            "/api/restaurants/recommendations/",
            {"lat": 35.681236, "top_k": 10},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class ImportCommandTests(TestCase):
    def _write_json(self, rows):
        temp = tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False)
        with temp:
            json.dump(rows, temp, ensure_ascii=False)
        self.addCleanup(lambda: Path(temp.name).unlink(missing_ok=True))
        return temp.name

    def test_import_restaurants_sync_removes_missing_rows(self):
        Restaurant.objects.create(
            restaurant_id="OLD",
            name="舊資料",
            region="東京都",
            category="拉麵",
        )
        json_path = self._write_json(
            [
                {
                    "id": "R1",
                    "name": "新餐廳",
                    "region": "東京都",
                    "category": "咖啡",
                    "context": "深夜也營業",
                }
            ]
        )

        call_command("import_restaurants", json_path, "--sync")

        self.assertFalse(Restaurant.objects.filter(restaurant_id="OLD").exists())
        self.assertTrue(
            Restaurant.objects.filter(
                restaurant_id="R1",
                name="新餐廳",
                context="深夜也營業",
            ).exists()
        )

    def test_import_pois_sync_removes_missing_rows(self):
        PointOfInterest.objects.create(
            poi_id="OLD",
            name="舊景點",
            region="東京都",
            category="景點",
        )
        json_path = self._write_json(
            [
                {
                    "id": "P1",
                    "name": "新景點",
                    "region": "東京都",
                    "category": "博物館",
                    "context": "親子友善的互動式博物館",
                }
            ]
        )

        call_command("import_pois", json_path, "--sync")

        self.assertFalse(PointOfInterest.objects.filter(poi_id="OLD").exists())
        self.assertTrue(
            PointOfInterest.objects.filter(
                poi_id="P1",
                name="新景點",
                context="親子友善的互動式博物館",
            ).exists()
        )
