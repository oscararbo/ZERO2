from django.urls import path

from .views import (
    BadgeListView,
    ChallengeAnalyticsView,
    ChallengeDetailView,
    ChallengeJoinView,
    ChallengeLeaderboardView,
    ChallengeListView,
    ChallengeProgressView,
    ChallengeUpdateView,
    ReminderListView,
    ReminderReadAllView,
    ReminderReadView,
)

urlpatterns = [
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
