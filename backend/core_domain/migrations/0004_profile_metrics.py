from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_profile_fitness_goal_exercise_goal'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='weight',
            field=models.FloatField(default=0, help_text='Weight in kg'),
        ),
        migrations.AddField(
            model_name='profile',
            name='height',
            field=models.FloatField(default=0, help_text='Height in cm'),
        ),
        migrations.RemoveField(
            model_name='profile',
            name='unit_system',
        ),
        migrations.AlterField(
            model_name='profile',
            name='fitness_goal',
            field=models.CharField(
                choices=[('bulk', 'Muscle Gain'), ('cut', 'Definition'), ('maintain', 'Maintain')],
                default='bulk',
                max_length=10,
            ),
        ),
    ]
