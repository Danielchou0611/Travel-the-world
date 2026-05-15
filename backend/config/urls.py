from django.contrib import admin
from django.urls import include, path
from django.http import HttpResponse, JsonResponse


def root_view(request):
    return JsonResponse(
        {
            "service": "travel-world recommendation api",
            "status": "ok",
            "endpoints": {
                "admin": "/admin/",
                "metadata": "/api/metadata/",
                "pois": "/api/pois/",
                "recommendations": "/api/recommendations/",
                "restaurants": "/api/restaurants/",
                "restaurant_metadata": "/api/restaurants/metadata/",
                "restaurant_recommendations": "/api/restaurants/recommendations/",
            },
        }
    )


def favicon_view(request):
    return HttpResponse(status=204)


urlpatterns = [
    path("", root_view, name="root"),
    path("favicon.ico", favicon_view, name="favicon"),
    path("admin/", admin.site.urls),
    path("api/", include("recommendations.urls")),
]
