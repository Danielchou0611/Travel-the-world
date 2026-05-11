from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update a test user for recommendation API testing."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="gary")
        parser.add_argument("--password", default="123456")
        parser.add_argument("--email", default="gary@example.com")

    def handle(self, *args, **options):
        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=options["username"],
            defaults={"email": options["email"]},
        )
        user.email = options["email"]
        user.set_password(options["password"])
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"Test user {action}: id={user.id}, username={user.username}, email={user.email}"
            )
        )
