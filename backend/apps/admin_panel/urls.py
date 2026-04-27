from django.urls import path

from .views import (
    AdminAccessView,
    AdminAlertListView,
    AdminAlertReopenView,
    AdminAlertResolveView,
    AdminStatsExportCsvView,
    AdminStatsView,
)

urlpatterns = [
    path('admin/access/', AdminAccessView.as_view()),
    path('admin/stats/', AdminStatsView.as_view()),
    path('admin/stats/export/', AdminStatsExportCsvView.as_view()),
    path('admin/alerts/', AdminAlertListView.as_view()),
    path('admin/alerts/<int:pk>/resolve/', AdminAlertResolveView.as_view()),
    path('admin/alerts/<int:pk>/reopen/', AdminAlertReopenView.as_view()),
]
