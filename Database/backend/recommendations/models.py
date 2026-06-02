from django.conf import settings
from django.db import models


class PointOfInterest(models.Model):
    poi_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    region = models.CharField(max_length=128, db_index=True)
    category = models.CharField(max_length=128, blank=True, default="", db_index=True)
    context = models.TextField(blank=True, default="")
    interests = models.JSONField(default=list)
    google_rating = models.FloatField(null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    rating_norm = models.FloatField(default=0)
    review_norm = models.FloatField(default=0)
    station_distance_efficiency = models.FloatField(default=0)
    static_score = models.FloatField(default=0, db_index=True)
    distance_to_station_km = models.FloatField(null=True, blank=True)
    station_anchor = models.CharField(max_length=255, blank=True, default="")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    image_url = models.URLField(blank=True, default="")
    google_name_matched = models.CharField(max_length=255, blank=True, default="")
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pois"
        ordering = ["-static_score", "name"]


class Restaurant(models.Model):
    restaurant_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    region = models.CharField(max_length=128, db_index=True)
    category = models.CharField(max_length=128, blank=True, default="", db_index=True)
    venue_type = models.CharField(max_length=64, blank=True, default="", db_index=True)
    context = models.TextField(blank=True, default="")
    interests = models.JSONField(default=list)
    google_rating = models.FloatField(null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    rating_norm = models.FloatField(default=0)
    review_norm = models.FloatField(default=0)
    station_distance_efficiency = models.FloatField(default=0)
    static_score = models.FloatField(default=0, db_index=True)
    distance_to_station_km = models.FloatField(null=True, blank=True)
    station_anchor = models.CharField(max_length=255, blank=True, default="")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    image_url = models.URLField(blank=True, default="")
    google_name_matched = models.CharField(max_length=255, blank=True, default="")
    raw_type = models.CharField(max_length=255, blank=True, default="")
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurants"
        ordering = ["-static_score", "name"]


class UserPreferenceProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preference_profile",
    )
    preference_profile = models.JSONField(default=dict)
    travel_region = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_preferences"


class RecommendationQueryLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recommendation_queries",
    )
    region = models.CharField(max_length=128, blank=True, default="")
    category = models.CharField(max_length=128, blank=True, default="")
    top_k = models.PositiveIntegerField(default=20)
    preferences = models.JSONField(default=dict)
    result_poi_ids = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recommendation_query_logs"
        ordering = ["-created_at"]
