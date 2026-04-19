from django.contrib.auth.models import User
from django.db import models


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

    weight = models.FloatField(default=0, help_text='Weight in kg')
    height = models.FloatField(default=0, help_text='Height in cm')
    macro_calories_target = models.FloatField(default=0, help_text='Daily calorie target')
    macro_protein_target = models.FloatField(default=0, help_text='Daily protein target in grams')
    macro_carbs_target = models.FloatField(default=0, help_text='Daily carbs target in grams')
    macro_fat_target = models.FloatField(default=0, help_text='Daily fat target in grams')

    sport = models.BooleanField(default=False)
    food = models.BooleanField(default=False)
    mindset = models.BooleanField(default=False)
    growth = models.BooleanField(default=False)
    challenges = models.BooleanField(default=False)

    def __str__(self):
        return self.full_name
