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
    import_format = serializers.ChoiceField(choices=['json', 'csv'], required=False)
    import_filename = serializers.CharField(required=False, max_length=200)

    def validate(self, attrs):
        filename = (attrs.get('import_filename') or '').strip().lower()
        import_format = attrs.get('import_format')

        if filename and not (filename.endswith('.json') or filename.endswith('.csv')):
            raise serializers.ValidationError({
                'import_filename': 'Only .csv or .json files are allowed.'
            })

        if filename and import_format and not filename.endswith(f'.{import_format}'):
            raise serializers.ValidationError({
                'import_filename': 'File extension does not match the selected import format.'
            })

        return attrs


class AsyncJobCreateRequestSerializer(serializers.Serializer):
    job_type = serializers.ChoiceField(choices=['sync_exercise_videos', 'compute_recovery_digest'])
    payload = serializers.DictField(required=False)


class ExerciseVideoRefreshRequestSerializer(serializers.Serializer):
    exercise_id = serializers.IntegerField(required=False)
    force = serializers.BooleanField(required=False, default=False)
