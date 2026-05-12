from django.contrib.auth.models import User
from django.db import models


class Exercise(models.Model):
    CATEGORY_CHOICES = (
        ('back', 'Back'),
        ('chest', 'Chest'),
        ('legs', 'Legs'),
        ('arms', 'Arms'),
        ('shoulders', 'Shoulders'),
        ('accessories', 'Accessories'),
    )

    LOCATION_CHOICES = (
        ('home', 'Home'),
        ('gym', 'Gym'),
    )

    GOAL_CHOICES = (
        ('bulk', 'Muscle Gain'),
        ('cut', 'Definition'),
        ('both', 'Both'),
    )

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    location = models.CharField(max_length=10, choices=LOCATION_CHOICES)
    goal = models.CharField(max_length=10, choices=GOAL_CHOICES, default='both')
    default_sets = models.IntegerField(default=3)
    default_reps = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('name', 'location')
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.name} ({self.location})'


class ExerciseSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exercise_sessions')
    date = models.DateField(auto_now_add=True)
    location = models.CharField(max_length=10, choices=Exercise.LOCATION_CHOICES)
    completed_exercises = models.IntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        unique_together = ('user', 'date', 'location')
        ordering = ['-date']

    def __str__(self):
        return f'{self.user.username} - {self.date} ({self.location})'


class CompletedExercise(models.Model):
    session = models.ForeignKey(ExerciseSession, on_delete=models.CASCADE, related_name='exercises')
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    sets_completed = models.IntegerField()
    reps_per_set = models.IntegerField()
    notes = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'exercise')

    def __str__(self):
        return f'{self.exercise.name} - {self.sets_completed}x{self.reps_per_set}'
