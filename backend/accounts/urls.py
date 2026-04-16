from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    ExerciseView,
    ExerciseSessionView,
    ExerciseSessionDetailView,
    CompletedExerciseView,
    MainMenuExerciseView,
    ProgressStatsView,
    JournalEntryView,
    JournalEntryDetailView,
    ChallengeListView,
    ChallengeDetailView,
    ChallengeJoinView,
    ChallengeProgressView,
    ChallengeLeaderboardView,
    ChallengeUpdateView,
    ReminderListView,
    ReminderReadView,
    ReminderReadAllView,
    BadgeListView,
    ChallengeAnalyticsView,
)

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('profile/', ProfileView.as_view()),

    path('exercises/', ExerciseView.as_view()),
    path('sessions/', ExerciseSessionView.as_view()),
    path('sessions/<int:session_id>/', ExerciseSessionDetailView.as_view()),
    path('completed/', CompletedExerciseView.as_view()),
    path('exercises-by-location/<str:location>/', MainMenuExerciseView.as_view()),
    path('progress/', ProgressStatsView.as_view()),

    path('journal/', JournalEntryView.as_view()),
    path('journal/<int:entry_id>/', JournalEntryDetailView.as_view()),

    path('challenges/', ChallengeListView.as_view()),
    path('challenges/<int:challenge_id>/', ChallengeDetailView.as_view()),
    path('challenges/<int:challenge_id>/join/', ChallengeJoinView.as_view()),
    path('challenges/<int:challenge_id>/progress/', ChallengeProgressView.as_view()),
    path('challenges/<int:challenge_id>/leaderboard/', ChallengeLeaderboardView.as_view()),
    path('challenges/<int:challenge_id>/updates/', ChallengeUpdateView.as_view()),
    path('challenges/analytics/', ChallengeAnalyticsView.as_view()),

    path('reminders/', ReminderListView.as_view()),
    path('reminders/<int:reminder_id>/read/', ReminderReadView.as_view()),
    path('reminders/read-all/', ReminderReadAllView.as_view()),
    path('badges/', BadgeListView.as_view()),
]

