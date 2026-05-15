from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recommendations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Restaurant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("restaurant_id", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("region", models.CharField(db_index=True, max_length=128)),
                ("category", models.CharField(blank=True, db_index=True, default="", max_length=128)),
                ("venue_type", models.CharField(blank=True, db_index=True, default="", max_length=64)),
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
                ("raw_type", models.CharField(blank=True, default="", max_length=255)),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "restaurants",
                "ordering": ["-static_score", "name"],
            },
        ),
    ]
