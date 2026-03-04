from rest_framework import serializers
from .models import Profile, Exercise, ExerciseSession, CompletedExercise, JournalEntry


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the Profile model.
    Converts between Profile model instances and JSON representation.
    """
    class Meta:
        model = Profile
        fields = (
            'full_name',
            'weekly_goal',
            'fitness_goal',
            'weight',
            'height',
            'sport',
            'food',
            'mindset',
            'growth',
            'challenges',
        )


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


class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for the JournalEntry model.
    Handles journal entries for user mindset tracking.
    """
    class Meta:
        model = JournalEntry
        fields = (
            'id',
            'content',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
