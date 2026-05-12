from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_merge_20260512_0001'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FeatureFlag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=80, unique=True)),
                ('enabled', models.BooleanField(default=False)),
                ('description', models.CharField(blank=True, max_length=220)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['key']},
        ),
        migrations.CreateModel(
            name='ExerciseVideo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('youtube_video_id', models.CharField(max_length=20)),
                ('youtube_url', models.URLField(max_length=260)),
                ('embed_url', models.URLField(max_length=260)),
                ('title', models.CharField(blank=True, max_length=180)),
                ('last_synced_at', models.DateTimeField(blank=True, null=True)),
                ('last_payload', models.JSONField(blank=True, default=dict)),
                ('exercise', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='video', to='accounts.exercise')),
            ],
        ),
        migrations.CreateModel(
            name='RecoveryLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('sleep_hours', models.FloatField(default=0)),
                ('stress_level', models.IntegerField(default=5)),
                ('soreness_level', models.IntegerField(default=5)),
                ('resting_heart_rate', models.IntegerField(blank=True, null=True)),
                ('steps', models.IntegerField(blank=True, null=True)),
                ('recovery_score', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recovery_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date'],
                'unique_together': {('user', 'date')},
            },
        ),
        migrations.CreateModel(
            name='WearableSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('google_fit', 'Google Fit'), ('strava', 'Strava'), ('garmin', 'Garmin'), ('apple_health', 'Apple Health'), ('manual', 'Manual')], max_length=20)),
                ('source', models.CharField(blank=True, max_length=120)),
                ('date', models.DateField()),
                ('steps', models.IntegerField(blank=True, null=True)),
                ('active_minutes', models.IntegerField(blank=True, null=True)),
                ('calories_burned', models.IntegerField(blank=True, null=True)),
                ('avg_heart_rate', models.IntegerField(blank=True, null=True)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wearable_snapshots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date', '-created_at'],
                'unique_together': {('user', 'provider', 'date')},
            },
        ),
        migrations.CreateModel(
            name='WeeklyPlanItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('focus_area', models.CharField(choices=[('sport', 'Sport'), ('food', 'Food'), ('mindset', 'Mindset'), ('growth', 'Growth'), ('recovery', 'Recovery')], default='sport', max_length=20)),
                ('planned_workout', models.CharField(blank=True, max_length=180)),
                ('planned_meal_focus', models.CharField(blank=True, max_length=180)),
                ('mindset_task', models.CharField(blank=True, max_length=180)),
                ('growth_task', models.CharField(blank=True, max_length=180)),
                ('weekly_goal_target', models.IntegerField(default=3)),
                ('completed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weekly_plan_items', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['date'],
                'unique_together': {('user', 'date')},
            },
        ),
        migrations.CreateModel(
            name='AsyncJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_type', models.CharField(choices=[('sync_exercise_videos', 'Sync exercise videos'), ('compute_recovery_digest', 'Compute recovery digest')], max_length=40)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('running', 'Running'), ('done', 'Done'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('result', models.JSONField(blank=True, default=dict)),
                ('error', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='async_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
