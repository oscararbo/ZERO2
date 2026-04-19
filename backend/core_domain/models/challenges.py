from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


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
    target_count = models.IntegerField(default=1, help_text='Target number of completions')
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
    progress = models.IntegerField(default=0, help_text='Progress 0-100')
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('challenge', 'user')
        ordering = ['-joined_at']

    def __str__(self):
        return f'{self.user.username} → {self.challenge.title}'


class ChallengeUpdate(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='updates')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_updates')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} update on {self.challenge.title}'


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
        return f'{self.user.username} - {self.code}'


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
        return f'{self.user.username} - {self.type}'
