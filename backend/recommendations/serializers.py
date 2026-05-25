from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import PointOfInterest, Restaurant, UserPreferenceProfile


class PointOfInterestSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="poi_id")

    class Meta:
        model = PointOfInterest
        fields = [
            "id",
            "name",
            "region",
            "category",
            "context",
            "interests",
            "google_rating",
            "review_count",
            "rating_norm",
            "review_norm",
            "station_distance_efficiency",
            "static_score",
            "distance_to_station_km",
            "station_anchor",
            "lat",
            "lng",
            "image_url",
            "google_name_matched",
        ]


class RestaurantSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="restaurant_id")

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "region",
            "category",
            "venue_type",
            "context",
            "interests",
            "google_rating",
            "review_count",
            "rating_norm",
            "review_norm",
            "station_distance_efficiency",
            "static_score",
            "distance_to_station_km",
            "station_anchor",
            "lat",
            "lng",
            "image_url",
            "google_name_matched",
            "raw_type",
        ]


class UserPreferenceProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = UserPreferenceProfile
        fields = ["user_id", "travel_region", "preference_profile", "updated_at"]
        read_only_fields = ["updated_at"]


class UserPreferenceUpsertSerializer(serializers.Serializer):
    travel_region = serializers.CharField(required=False, allow_blank=True)
    preference_profile = serializers.DictField(
        child=serializers.FloatField(min_value=0, max_value=1),
        required=True,
    )


class RecommendationRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    region = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    preferences = serializers.DictField(
        child=serializers.FloatField(min_value=0, max_value=1),
        required=False,
    )
    top_k = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)

    def validate(self, attrs):
        if not attrs.get("preferences") and not attrs.get("user_id"):
            raise serializers.ValidationError("Either preferences or user_id is required.")
        if attrs.get("user_id"):
            user_model = get_user_model()
            if not user_model.objects.filter(id=attrs["user_id"]).exists():
                raise serializers.ValidationError({"user_id": "User does not exist."})
        return attrs


class RestaurantRecommendationRequestSerializer(serializers.Serializer):
    region = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    venue_type = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False, min_value=-90, max_value=90)
    lng = serializers.FloatField(required=False, min_value=-180, max_value=180)
    radius_m = serializers.FloatField(required=False, min_value=1)
    top_k = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)

    def validate(self, attrs):
        has_lat = "lat" in attrs
        has_lng = "lng" in attrs
        if has_lat != has_lng:
            raise serializers.ValidationError("lat and lng must be provided together.")
        return attrs
