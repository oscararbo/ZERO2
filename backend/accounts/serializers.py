from rest_framework import serializers
from .models import Profile, Exercise, ExerciseSession, CompletedExercise

class ProfileSerializer(serializers.ModelSerializer):
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
