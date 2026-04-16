from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

class Profile(models.Model):
    FITNESS_GOAL_CHOICES = (
        ('bulk', 'Muscle Gain'),
        ('cut', 'Definition'),
        ('maintain', 'Maintain'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=100)
    weekly_goal = models.IntegerField(default=3)
    fitness_goal = models.CharField(max_length=10, choices=FITNESS_GOAL_CHOICES, default='bulk')

    weight = models.FloatField(default=0, help_text="Weight in kg")
    height = models.FloatField(default=0, help_text="Height in cm")

    sport = models.BooleanField(default=False)
    food = models.BooleanField(default=False)
    mindset = models.BooleanField(default=False)
    growth = models.BooleanField(default=False)
    challenges = models.BooleanField(default=False)

    def __str__(self):
        return self.full_name


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
        return f"{self.name} ({self.location})"


class ExerciseSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exercise_sessions')
    date = models.DateField(auto_now_add=True)
    location = models.CharField(max_length=10, choices=Exercise.LOCATION_CHOICES)
    completed_exercises = models.IntegerField(default=0)

    class Meta:
        unique_together = ('user', 'date', 'location')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date} ({self.location})"


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
        return f"{self.exercise.name} - {self.sets_completed}x{self.reps_per_set}"


class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.created_at.date()}"


class Challenge(models.Model):
    CATEGORY_CHOICES = (
        ('sport', 'Sport'),
        ('nutrition', 'Nutrition'),
        ('mindset', 'Mindset'),
        ('growth', 'Growth'),
        ('general', 'General'),
    )

    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_challenges')
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=15, choices=CATEGORY_CHOICES, default='general')
    duration_days = models.IntegerField(default=7)
    target_count = models.IntegerField(default=1, help_text="Target number of completions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def participant_count(self):
        return self.participants.count()

    @property
    def completed_count(self):
        return self.participants.filter(completed=True).count()

    @property
    def deadline_at(self):
        return self.created_at + timedelta(days=self.duration_days)

    @property
    def days_left(self):
        remaining = (self.deadline_at.date() - timezone.now().date()).days
        return max(0, remaining)

    @property
    def is_expired(self):
        return timezone.now() > self.deadline_at


class ChallengeParticipant(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_participations')
    joined_at = models.DateTimeField(auto_now_add=True)
    progress = models.IntegerField(default=0, help_text="Progress 0-100")
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('challenge', 'user')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.username} → {self.challenge.title}"


class ChallengeUpdate(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='updates')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_updates')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} update on {self.challenge.title}"


class UserBadge(models.Model):
    BADGE_CHOICES = (
        ('first_join', 'First Challenge Joined'),
        ('consistent_3', '3 Challenges Joined'),
        ('finisher_1', 'First Challenge Completed'),
        ('finisher_5', '5 Challenges Completed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    code = models.CharField(max_length=30, choices=BADGE_CHOICES)
    title = models.CharField(max_length=80)
    description = models.CharField(max_length=160, blank=True, null=True)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'code')
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.user.username} - {self.code}"


class InAppReminder(models.Model):
    TYPE_CHOICES = (
        ('progress', 'Progress Reminder'),
        ('badge', 'Badge Awarded'),
        ('update', 'Challenge Update'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='in_app_reminders')
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='reminders', blank=True, null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='progress')
    message = models.CharField(max_length=220)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.user.username} - {self.type}"
