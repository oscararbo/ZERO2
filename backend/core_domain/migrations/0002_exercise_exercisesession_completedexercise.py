import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Exercise',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('category', models.CharField(choices=[('espalda', 'Espalda'), ('pecho', 'Pecho'), ('pierna', 'Pierna'), ('brazo', 'Brazo'), ('hombro', 'Hombro'), ('complementarios', 'Complementarios')], max_length=20)),
                ('location', models.CharField(choices=[('home', 'Home'), ('gym', 'Gym')], max_length=10)),
                ('default_sets', models.IntegerField(default=3)),
                ('default_reps', models.IntegerField(default=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['category', 'name'],
                'unique_together': {('name', 'location')},
            },
        ),
        migrations.CreateModel(
            name='ExerciseSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(auto_now_add=True)),
                ('location', models.CharField(choices=[('home', 'Home'), ('gym', 'Gym')], max_length=10)),
                ('completed_exercises', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exercise_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date'],
                'unique_together': {('user', 'date', 'location')},
            },
        ),
        migrations.CreateModel(
            name='CompletedExercise',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sets_completed', models.IntegerField()),
                ('reps_per_set', models.IntegerField()),
                ('notes', models.TextField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(auto_now_add=True)),
                ('exercise', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.exercise')),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exercises', to='accounts.exercisesession')),
            ],
            options={
                'unique_together': {('session', 'exercise')},
            },
        ),
    ]
