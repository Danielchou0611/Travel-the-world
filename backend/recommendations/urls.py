from django.urls import path

from .views import MetadataView, PoiDetailView, PoiListView, RecommendationView, UserPreferenceUpsertView


urlpatterns = [
    path("pois/", PoiListView.as_view(), name="poi-list"),
    path("pois/<str:poi_id>/", PoiDetailView.as_view(), name="poi-detail"),
    path("metadata/", MetadataView.as_view(), name="metadata"),
    path("users/<int:user_id>/preferences/", UserPreferenceUpsertView.as_view(), name="user-preferences"),
    path("recommendations/", RecommendationView.as_view(), name="recommendations"),
]
