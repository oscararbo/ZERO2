from django.contrib.auth.models import User
from django.db import models

from .exercise import Exercise


class WeeklyPlanItem(models.Model):
    FOCUS_CHOICES = (
        ('sport', 'Sport'),
        ('food', 'Food'),
        ('mindset', 'Mindset'),
        ('growth', 'Growth'),
        ('recovery', 'Recovery'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_plan_items')
    date = models.DateField()
    focus_area = models.CharField(max_length=20, choices=FOCUS_CHOICES, default='sport')
    planned_workout = models.CharField(max_length=180, blank=True)
    planned_meal_focus = models.CharField(max_length=180, blank=True)
    mindset_task = models.CharField(max_length=180, blank=True)
    growth_task = models.CharField(max_length=180, blank=True)
    weekly_goal_target = models.IntegerField(default=3)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']
        unique_together = ('user', 'date')


class RecoveryLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recovery_logs')
    date = models.DateField()
    sleep_hours = models.FloatField(default=0)
    stress_level = models.IntegerField(default=5)
    soreness_level = models.IntegerField(default=5)
    resting_heart_rate = models.IntegerField(null=True, blank=True)
    steps = models.IntegerField(null=True, blank=True)
    recovery_score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'date')


class WearableSnapshot(models.Model):
    PROVIDER_CHOICES = (
        ('samsung_health', 'Samsung Health'),
        ('manual', 'Manual'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wearable_snapshots')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    source = models.CharField(max_length=120, blank=True)
    date = models.DateField()
    steps = models.IntegerField(null=True, blank=True)
    active_minutes = models.IntegerField(null=True, blank=True)
    calories_burned = models.IntegerField(null=True, blank=True)
    avg_heart_rate = models.IntegerField(null=True, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ('user', 'provider', 'date')


class FeatureFlag(models.Model):
    key = models.CharField(max_length=80, unique=True)
    enabled = models.BooleanField(default=False)
    description = models.CharField(max_length=220, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']


class ExerciseVideo(models.Model):
    exercise = models.OneToOneField(Exercise, on_delete=models.CASCADE, related_name='video')
    youtube_video_id = models.CharField(max_length=20)
    youtube_url = models.URLField(max_length=260)
    embed_url = models.URLField(max_length=260)
    title = models.CharField(max_length=180, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_payload = models.JSONField(default=dict, blank=True)


class AsyncJob(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('done', 'Done'),
        ('failed', 'Failed'),
    )

    JOB_TYPE_CHOICES = (
        ('sync_exercise_videos', 'Sync exercise videos'),
        ('compute_recovery_digest', 'Compute recovery digest'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='async_jobs')
    job_type = models.CharField(max_length=40, choices=JOB_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payload = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
