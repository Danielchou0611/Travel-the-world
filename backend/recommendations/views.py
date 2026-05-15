from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PointOfInterest, RecommendationQueryLog, Restaurant, UserPreferenceProfile
from .serializers import (
    PointOfInterestSerializer,
    RecommendationRequestSerializer,
    RestaurantRecommendationRequestSerializer,
    RestaurantSerializer,
    UserPreferenceProfileSerializer,
    UserPreferenceUpsertSerializer,
)
from .services import (
    build_bounding_box,
    compute_recommendation_score,
    haversine_distance_meters,
    normalize_preferences,
)


class PoiPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 5000


class RestaurantPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 5000


class PoiListView(generics.ListAPIView):
    serializer_class = PointOfInterestSerializer
    pagination_class = PoiPagination

    def get_queryset(self):
        queryset = PointOfInterest.objects.all()
        region = self.request.query_params.get("region")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        interests = self.request.query_params.get("interests")
        ordering = self.request.query_params.get("ordering", "-static_score")

        if region:
            queryset = queryset.filter(region=region)
        if category:
            queryset = queryset.filter(category=category)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(google_name_matched__icontains=search)
                | Q(poi_id__icontains=search)
            )

        allowed_ordering = {
            "static_score",
            "-static_score",
            "google_rating",
            "-google_rating",
            "review_count",
            "-review_count",
        }
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering, "name")
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        interests = self.request.query_params.get("interests")
        if interests:
            tags = [item.strip() for item in interests.split(",") if item.strip()]
            queryset = [poi for poi in queryset if all(tag in (poi.interests or []) for tag in tags)]

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PoiDetailView(generics.RetrieveAPIView):
    serializer_class = PointOfInterestSerializer
    lookup_field = "poi_id"
    queryset = PointOfInterest.objects.all()


class MetadataView(APIView):
    def get(self, request):
        regions = list(PointOfInterest.objects.order_by("region").values_list("region", flat=True).distinct())
        categories = list(PointOfInterest.objects.order_by("category").values_list("category", flat=True).distinct())
        return Response(
            {
                "regions": regions,
                "categories": [item for item in categories if item],
                "poi_count": PointOfInterest.objects.count(),
            }
        )


class RestaurantListView(generics.ListAPIView):
    serializer_class = RestaurantSerializer
    pagination_class = RestaurantPagination

    def get_queryset(self):
        queryset = Restaurant.objects.all()
        region = self.request.query_params.get("region")
        category = self.request.query_params.get("category")
        venue_type = self.request.query_params.get("venue_type")
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering", "-static_score")

        if region:
            queryset = queryset.filter(region=region)
        if category:
            queryset = queryset.filter(category=category)
        if venue_type:
            queryset = queryset.filter(venue_type=venue_type)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(google_name_matched__icontains=search)
                | Q(restaurant_id__icontains=search)
                | Q(raw_type__icontains=search)
            )

        allowed_ordering = {
            "static_score",
            "-static_score",
            "google_rating",
            "-google_rating",
            "review_count",
            "-review_count",
        }
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering, "name")
        return queryset


class RestaurantDetailView(generics.RetrieveAPIView):
    serializer_class = RestaurantSerializer
    lookup_field = "restaurant_id"
    queryset = Restaurant.objects.all()


class RestaurantMetadataView(APIView):
    def get(self, request):
        regions = list(Restaurant.objects.order_by("region").values_list("region", flat=True).distinct())
        categories = list(Restaurant.objects.order_by("category").values_list("category", flat=True).distinct())
        venue_types = list(Restaurant.objects.order_by("venue_type").values_list("venue_type", flat=True).distinct())
        return Response(
            {
                "regions": regions,
                "categories": [item for item in categories if item],
                "venue_types": [item for item in venue_types if item],
                "restaurant_count": Restaurant.objects.count(),
            }
        )


class UserPreferenceUpsertView(APIView):
    def put(self, request, user_id):
        return self._upsert(request, user_id)

    def patch(self, request, user_id):
        return self._upsert(request, user_id)

    def get(self, request, user_id):
        profile = UserPreferenceProfile.objects.select_related("user").filter(user_id=user_id).first()
        if not profile:
            return Response({"detail": "Preference profile not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserPreferenceProfileSerializer(profile).data)

    def _upsert(self, request, user_id):
        serializer = UserPreferenceUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_model = get_user_model()
        user = generics.get_object_or_404(user_model, id=user_id)
        profile, _ = UserPreferenceProfile.objects.get_or_create(user=user)
        profile.travel_region = serializer.validated_data.get("travel_region", profile.travel_region)
        profile.preference_profile = normalize_preferences(serializer.validated_data["preference_profile"])
        profile.save()

        return Response(UserPreferenceProfileSerializer(profile).data)


class RecommendationView(APIView):
    def post(self, request):
        serializer = RecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        preferences = normalize_preferences(payload.get("preferences"))
        user = None
        if payload.get("user_id"):
            user = get_user_model().objects.get(id=payload["user_id"])
            profile = UserPreferenceProfile.objects.filter(user=user).first()
            if profile:
                base_preferences = normalize_preferences(profile.preference_profile)
                base_preferences.update(preferences)
                preferences = base_preferences

        queryset = PointOfInterest.objects.all()
        if payload.get("region"):
            queryset = queryset.filter(region=payload["region"])
        if payload.get("category"):
            queryset = queryset.filter(category=payload["category"])

        top_k = payload["top_k"]
        scored_results = []
        for poi in queryset:
            score = compute_recommendation_score(
                preferences=preferences,
                interests=poi.interests,
                static_score=poi.static_score,
            )
            scored_results.append(
                {
                    "id": poi.poi_id,
                    "name": poi.name,
                    "region": poi.region,
                    "category": poi.category,
                    "interests": poi.interests,
                    "image_url": poi.image_url,
                    "final_score": score.final_score,
                    "score_breakdown": {
                        "interest_match": score.interest_match,
                        "static_score": score.static_score,
                    },
                }
            )

        scored_results.sort(key=lambda item: (-item["final_score"], item["name"]))
        results = scored_results[:top_k]

        RecommendationQueryLog.objects.create(
            user=user,
            region=payload.get("region", ""),
            category=payload.get("category", ""),
            top_k=top_k,
            preferences=preferences,
            result_poi_ids=[item["id"] for item in results],
        )

        return Response(
            {
                "count": len(results),
                "filters": {
                    "region": payload.get("region", ""),
                    "category": payload.get("category", ""),
                    "top_k": top_k,
                },
                "preferences": preferences,
                "results": results,
            }
        )


class RestaurantRecommendationView(APIView):
    DEFAULT_RADIUS_M = 300

    def post(self, request):
        serializer = RestaurantRecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        queryset = Restaurant.objects.all()
        if payload.get("region"):
            queryset = queryset.filter(region=payload["region"])
        if payload.get("category"):
            queryset = queryset.filter(category=payload["category"])
        if payload.get("venue_type"):
            queryset = queryset.filter(venue_type=payload["venue_type"])

        lat = payload.get("lat")
        lng = payload.get("lng")
        radius_m = None
        if lat is not None and lng is not None:
            radius_m = payload.get("radius_m", self.DEFAULT_RADIUS_M)
            bounds = build_bounding_box(lat=lat, lng=lng, radius_m=radius_m)
            queryset = queryset.filter(
                lat__isnull=False,
                lng__isnull=False,
                lat__gte=bounds["min_lat"],
                lat__lte=bounds["max_lat"],
                lng__gte=bounds["min_lng"],
                lng__lte=bounds["max_lng"],
            )

        results = []
        for restaurant in queryset:
            distance_m = None
            if lat is not None and lng is not None:
                distance_m = haversine_distance_meters(
                    lat1=lat,
                    lng1=lng,
                    lat2=restaurant.lat,
                    lng2=restaurant.lng,
                )
                if distance_m > radius_m:
                    continue

            results.append(
                {
                    "id": restaurant.restaurant_id,
                    "name": restaurant.name,
                    "region": restaurant.region,
                    "category": restaurant.category,
                    "venue_type": restaurant.venue_type,
                    "interests": restaurant.interests,
                    "google_rating": restaurant.google_rating,
                    "review_count": restaurant.review_count,
                    "rating_norm": restaurant.rating_norm,
                    "review_norm": restaurant.review_norm,
                    "station_distance_efficiency": restaurant.station_distance_efficiency,
                    "static_score": round(float(restaurant.static_score), 4),
                    "distance_to_station_km": restaurant.distance_to_station_km,
                    "station_anchor": restaurant.station_anchor,
                    "lat": restaurant.lat,
                    "lng": restaurant.lng,
                    "image_url": restaurant.image_url,
                    "google_name_matched": restaurant.google_name_matched,
                    "raw_type": restaurant.raw_type,
                    "distance_m": round(distance_m, 1) if distance_m is not None else None,
                    "final_score": round(float(restaurant.static_score), 4),
                }
            )

        results.sort(
            key=lambda item: (
                -item["final_score"],
                item["distance_m"] if item["distance_m"] is not None else float("inf"),
                item["name"],
            )
        )
        results = results[: payload["top_k"]]

        return Response(
            {
                "count": len(results),
                "filters": {
                    "region": payload.get("region", ""),
                    "category": payload.get("category", ""),
                    "venue_type": payload.get("venue_type", ""),
                    "lat": lat,
                    "lng": lng,
                    "radius_m": radius_m,
                    "top_k": payload["top_k"],
                },
                "results": results,
            }
        )
