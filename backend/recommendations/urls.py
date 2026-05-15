from django.urls import path

from .views import (
    MetadataView,
    PoiDetailView,
    PoiListView,
    RecommendationView,
    RestaurantDetailView,
    RestaurantListView,
    RestaurantMetadataView,
    RestaurantRecommendationView,
    UserPreferenceUpsertView,
)


urlpatterns = [
    path("pois/", PoiListView.as_view(), name="poi-list"),
    path("pois/<str:poi_id>/", PoiDetailView.as_view(), name="poi-detail"),
    path("metadata/", MetadataView.as_view(), name="metadata"),
    path("restaurants/", RestaurantListView.as_view(), name="restaurant-list"),
    path("restaurants/metadata/", RestaurantMetadataView.as_view(), name="restaurant-metadata"),
    path("restaurants/recommendations/", RestaurantRecommendationView.as_view(), name="restaurant-recommendations"),
    path("restaurants/<str:restaurant_id>/", RestaurantDetailView.as_view(), name="restaurant-detail"),
    path("users/<int:user_id>/preferences/", UserPreferenceUpsertView.as_view(), name="user-preferences"),
    path("recommendations/", RecommendationView.as_view(), name="recommendations"),
]
