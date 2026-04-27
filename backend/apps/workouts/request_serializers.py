from rest_framework import serializers


class SessionExerciseItemSerializer(serializers.Serializer):
    exercise_id = serializers.IntegerField(
        min_value=1,
        error_messages={'required': 'exercise_id es obligatorio.', 'invalid': 'exercise_id debe ser un numero entero.'},
    )
    sets_completed = serializers.IntegerField(
        min_value=0,
        required=False,
        default=0,
        error_messages={'invalid': 'sets_completed debe ser un numero entero.'},
    )
    reps_per_set = serializers.IntegerField(
        min_value=0,
        required=False,
        default=0,
        error_messages={'invalid': 'reps_per_set debe ser un numero entero.'},
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class ExerciseSessionCreateRequestSerializer(serializers.Serializer):
    location = serializers.CharField(
        max_length=20,
        error_messages={'required': 'location es obligatorio.', 'blank': 'location no puede estar vacio.'},
    )
    exercises = SessionExerciseItemSerializer(many=True, required=False, default=list)


class CompletedExerciseCreateRequestSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(
        min_value=1,
        error_messages={'required': 'session_id es obligatorio.', 'invalid': 'session_id debe ser un numero entero.'},
    )
    exercise_id = serializers.IntegerField(
        min_value=1,
        error_messages={'required': 'exercise_id es obligatorio.', 'invalid': 'exercise_id debe ser un numero entero.'},
    )
    sets_completed = serializers.IntegerField(
        min_value=0,
        required=False,
        default=0,
        error_messages={'invalid': 'sets_completed debe ser un numero entero.'},
    )
    reps_per_set = serializers.IntegerField(
        min_value=0,
        required=False,
        default=0,
        error_messages={'invalid': 'reps_per_set debe ser un numero entero.'},
    )
