from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PointOfInterest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("poi_id", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("region", models.CharField(db_index=True, max_length=128)),
                ("category", models.CharField(blank=True, db_index=True, default="", max_length=128)),
                ("interests", models.JSONField(default=list)),
                ("google_rating", models.FloatField(blank=True, null=True)),
                ("review_count", models.PositiveIntegerField(default=0)),
                ("rating_norm", models.FloatField(default=0)),
                ("review_norm", models.FloatField(default=0)),
                ("station_distance_efficiency", models.FloatField(default=0)),
                ("static_score", models.FloatField(db_index=True, default=0)),
                ("distance_to_station_km", models.FloatField(blank=True, null=True)),
                ("station_anchor", models.CharField(blank=True, default="", max_length=255)),
                ("lat", models.FloatField(blank=True, null=True)),
                ("lng", models.FloatField(blank=True, null=True)),
                ("image_url", models.URLField(blank=True, default="")),
                ("google_name_matched", models.CharField(blank=True, default="", max_length=255)),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "pois",
                "ordering": ["-static_score", "name"],
            },
        ),
        migrations.CreateModel(
            name="RecommendationQueryLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("region", models.CharField(blank=True, default="", max_length=128)),
                ("category", models.CharField(blank=True, default="", max_length=128)),
                ("top_k", models.PositiveIntegerField(default=20)),
                ("preferences", models.JSONField(default=dict)),
                ("result_poi_ids", models.JSONField(default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="recommendation_queries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "recommendation_query_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="UserPreferenceProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("preference_profile", models.JSONField(default=dict)),
                ("travel_region", models.CharField(blank=True, default="", max_length=128)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="preference_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "user_preferences",
            },
        ),
    ]
