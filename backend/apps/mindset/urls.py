from django.urls import path

from .views import (
    JournalEntryDetailView,
    JournalEntryView,
    MoodEntryView,
    UserTemplateHistoryView,
    UserTemplateListView,
)

urlpatterns = [
    path('journal/', JournalEntryView.as_view()),
    path('journal/<int:entry_id>/', JournalEntryDetailView.as_view()),
    path('mood/', MoodEntryView.as_view()),
    path('templates/', UserTemplateListView.as_view()),
    path('templates/<str:kind>/<str:template_key>/', UserTemplateHistoryView.as_view()),
]
