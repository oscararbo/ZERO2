from rest_framework import serializers


class WeeklyPlanRequestSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)


class RecoveryLogRequestSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    sleep_hours = serializers.FloatField(min_value=0, max_value=24)
    stress_level = serializers.IntegerField(min_value=1, max_value=10)
    soreness_level = serializers.IntegerField(min_value=1, max_value=10)
    resting_heart_rate = serializers.IntegerField(min_value=30, max_value=220, required=False, allow_null=True)
    steps = serializers.IntegerField(min_value=0, required=False, allow_null=True)


class WearableIngestItemSerializer(serializers.Serializer):
    date = serializers.DateField()
    steps = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    active_minutes = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    calories_burned = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    avg_heart_rate = serializers.IntegerField(min_value=30, max_value=220, required=False, allow_null=True)


class WearableIngestRequestSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=['samsung_health', 'manual'])
    source = serializers.CharField(required=False, allow_blank=True, max_length=120)
    entries = WearableIngestItemSerializer(many=True)


class AsyncJobCreateRequestSerializer(serializers.Serializer):
    job_type = serializers.ChoiceField(choices=['sync_exercise_videos', 'compute_recovery_digest'])
    payload = serializers.DictField(required=False)


class ExerciseVideoRefreshRequestSerializer(serializers.Serializer):
    exercise_id = serializers.IntegerField(required=False)
    force = serializers.BooleanField(required=False, default=False)
