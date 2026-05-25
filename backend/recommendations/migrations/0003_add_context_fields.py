from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recommendations", "0002_restaurant"),
    ]

    operations = [
        migrations.AddField(
            model_name="pointofinterest",
            name="context",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="context",
            field=models.TextField(blank=True, default=""),
        ),
    ]
