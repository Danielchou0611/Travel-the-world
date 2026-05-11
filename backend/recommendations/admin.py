from django.contrib import admin

from .models import PointOfInterest, RecommendationQueryLog, UserPreferenceProfile


@admin.register(PointOfInterest)
class PointOfInterestAdmin(admin.ModelAdmin):
    list_display = ("poi_id", "name", "region", "category", "static_score")
    list_filter = ("region", "category")
    search_fields = ("poi_id", "name", "google_name_matched")


@admin.register(UserPreferenceProfile)
class UserPreferenceProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "travel_region", "updated_at")
    search_fields = ("user__username", "user__email")


@admin.register(RecommendationQueryLog)
class RecommendationQueryLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "region", "category", "top_k", "created_at")
    list_filter = ("region", "category")
