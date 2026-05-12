from rest_framework import serializers

from ..models import AsyncJob, ExerciseVideo, FeatureFlag, RecoveryLog, WearableSnapshot, WeeklyPlanItem


class WeeklyPlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyPlanItem
        fields = (
            'id',
            'date',
            'focus_area',
            'planned_workout',
            'planned_meal_focus',
            'mindset_task',
            'growth_task',
            'weekly_goal_target',
            'completed',
        )


class RecoveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecoveryLog
        fields = (
            'id',
            'date',
            'sleep_hours',
            'stress_level',
            'soreness_level',
            'resting_heart_rate',
            'steps',
            'recovery_score',
        )


class WearableSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = WearableSnapshot
        fields = (
            'id',
            'provider',
            'source',
            'date',
            'steps',
            'active_minutes',
            'calories_burned',
            'avg_heart_rate',
        )
class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = ('key', 'enabled', 'description', 'updated_at')


class ExerciseVideoSerializer(serializers.ModelSerializer):
    exercise_id = serializers.IntegerField(source='exercise.id', read_only=True)

    class Meta:
        model = ExerciseVideo
        fields = (
            'exercise_id',
            'youtube_video_id',
            'youtube_url',
            'embed_url',
            'title',
            'last_synced_at',
        )


class AsyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsyncJob
        fields = (
            'id',
            'job_type',
            'status',
            'payload',
            'result',
            'error',
            'created_at',
            'started_at',
            'finished_at',
        )
