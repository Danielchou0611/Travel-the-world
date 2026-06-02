import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from recommendations.models import PointOfInterest


class Command(BaseCommand):
    help = "Import POIs from the simplified japan_with_rating_interest.json dataset."

    def add_arguments(self, parser):
        parser.add_argument("json_path", type=str)
        mode_group = parser.add_mutually_exclusive_group()
        mode_group.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing POIs before import.",
        )
        mode_group.add_argument(
            "--sync",
            action="store_true",
            help="Delete POIs that are not present in the JSON file after import.",
        )

    def handle(self, *args, **options):
        json_path = Path(options["json_path"]).expanduser().resolve()
        if not json_path.exists():
            raise CommandError(f"JSON file not found: {json_path}")

        if options["replace"]:
            PointOfInterest.objects.all().delete()

        rows = json.loads(json_path.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise CommandError("JSON payload must be a list.")

        source_ids = set()
        created_count = 0
        updated_count = 0
        for row in rows:
            poi_id = row["id"]
            source_ids.add(poi_id)
            _, created = PointOfInterest.objects.update_or_create(
                poi_id=poi_id,
                defaults={
                    "name": self._as_text(row.get("name")),
                    "region": self._as_text(row.get("region")),
                    "category": self._as_text(row.get("category")),
                    "context": self._as_text(row.get("context")),
                    "interests": row.get("interests") or [],
                    "google_rating": row.get("google_rating"),
                    "review_count": row.get("review_count") or 0,
                    "rating_norm": row.get("rating_norm") or 0,
                    "review_norm": row.get("review_norm") or 0,
                    "station_distance_efficiency": row.get("station_distance_efficiency") or 0,
                    "static_score": row.get("static_score") or 0,
                    "distance_to_station_km": row.get("distance_to_station_km"),
                    "station_anchor": self._as_text(row.get("station_anchor")),
                    "lat": row.get("lat"),
                    "lng": row.get("lng"),
                    "image_url": self._as_text(row.get("image_url")),
                    "google_name_matched": self._as_text(row.get("google_name_matched")),
                    "raw_payload": row,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        deleted_count = 0
        if options["sync"]:
            deleted_count, _ = PointOfInterest.objects.exclude(poi_id__in=source_ids).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported POIs from {json_path.name}: created={created_count}, updated={updated_count}, deleted={deleted_count}"
            )
        )

    @staticmethod
    def _as_text(value):
        return "" if value is None else str(value)
