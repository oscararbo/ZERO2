from rest_framework import serializers

from ..models import CompletedExercise, Exercise, ExerciseSession


class ExerciseSerializer(serializers.ModelSerializer):
    """
    Serializer for the Exercise model.
    Provides complete exercise information including default intensity settings.
    """

    class Meta:
        model = Exercise
        fields = (
            'id',
            'name',
            'description',
            'category',
            'location',
            'goal',
            'default_sets',
            'default_reps',
        )


class CompletedExerciseSerializer(serializers.ModelSerializer):
    """
    Serializer for the CompletedExercise model.
    Includes exercise name and ID for frontend convenience.
    """

    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    exercise_id = serializers.IntegerField(source='exercise.id', read_only=True)

    class Meta:
        model = CompletedExercise
        fields = (
            'id',
            'exercise_id',
            'exercise_name',
            'sets_completed',
            'reps_per_set',
            'notes',
        )


class ExerciseSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for ExerciseSession with nested completed exercises (read-only).
    Used for list views and summary responses.
    """

    exercises = CompletedExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = ExerciseSession
        fields = (
            'id',
            'date',
            'location',
            'completed_exercises',
            'exercises',
        )


class ExerciseSessionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for ExerciseSession with writable nested completed exercises.
    Used for creating and updating exercise sessions with their completed exercises.
    """

    exercises = CompletedExerciseSerializer(many=True)

    class Meta:
        model = ExerciseSession
        fields = (
            'id',
            'date',
            'location',
            'completed_exercises',
            'exercises',
        )
