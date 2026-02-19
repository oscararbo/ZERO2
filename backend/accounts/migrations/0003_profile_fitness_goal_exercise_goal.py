from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_exercise_exercisesession_completedexercise'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='fitness_goal',
            field=models.CharField(
                choices=[('bulk', 'Muscle Gain'), ('cut', 'Definition')],
                default='bulk',
                max_length=10
            ),
        ),
        migrations.AddField(
            model_name='exercise',
            name='goal',
            field=models.CharField(
                choices=[('bulk', 'Muscle Gain'), ('cut', 'Definition'), ('both', 'Both')],
                default='both',
                max_length=10
            ),
        ),
        migrations.AlterField(
            model_name='exercise',
            name='category',
            field=models.CharField(
                choices=[
                    ('back', 'Back'),
                    ('chest', 'Chest'),
                    ('legs', 'Legs'),
                    ('arms', 'Arms'),
                    ('shoulders', 'Shoulders'),
                    ('accessories', 'Accessories'),
                ],
                max_length=20
            ),
        ),
    ]
