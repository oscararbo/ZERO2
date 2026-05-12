# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_journalentry'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercisesession',
            name='archived_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
