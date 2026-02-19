from django.contrib import admin
from .models import Profile, Exercise, ExerciseSession, CompletedExercise

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user', 'weekly_goal')
    search_fields = ('full_name', 'user__username')

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'location', 'default_sets', 'default_reps')
    list_filter = ('category', 'location')
    search_fields = ('name',)

@admin.register(ExerciseSession)
class ExerciseSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'location', 'completed_exercises')
    list_filter = ('date', 'location')
    search_fields = ('user__username',)

@admin.register(CompletedExercise)
class CompletedExerciseAdmin(admin.ModelAdmin):
    list_display = ('exercise', 'session', 'sets_completed', 'reps_per_set')
    list_filter = ('exercise__category',)
    search_fields = ('exercise__name', 'session__user__username')
