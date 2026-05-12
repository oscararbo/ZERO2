from django.urls import path

from .views import (
    AdminAccessView,
    AdminAlertListView,
    AdminAlertReopenView,
    AdminAlertResolveView,
    AdminChallengeDetailView,
    AdminChallengesListView,
    AdminStatsExportCsvView,
    AdminStatsView,
    AdminUserDetailView,
    AdminUsersListView,
)

urlpatterns = [
    path('admin/access/', AdminAccessView.as_view()),
    path('admin/stats/', AdminStatsView.as_view()),
    path('admin/stats/export/', AdminStatsExportCsvView.as_view()),
    path('admin/alerts/', AdminAlertListView.as_view()),
    path('admin/alerts/<int:pk>/resolve/', AdminAlertResolveView.as_view()),
    path('admin/alerts/<int:pk>/reopen/', AdminAlertReopenView.as_view()),
    path('admin/users/', AdminUsersListView.as_view()),
    path('admin/users/<int:user_id>/', AdminUserDetailView.as_view()),
    path('admin/challenges/', AdminChallengesListView.as_view()),
    path('admin/challenges/<int:challenge_id>/', AdminChallengeDetailView.as_view()),
]
