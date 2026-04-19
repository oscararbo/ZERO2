from django.urls import path

from .views import (
    CompletedExerciseView,
    ExerciseSessionDetailView,
    ExerciseSessionView,
    ExerciseView,
    MainMenuExerciseView,
    ProgressStatsView,
)

urlpatterns = [
    path('exercises/', ExerciseView.as_view()),
    path('sessions/', ExerciseSessionView.as_view()),
    path('sessions/<int:session_id>/', ExerciseSessionDetailView.as_view()),
    path('completed/', CompletedExerciseView.as_view()),
    path('exercises-by-location/<str:location>/', MainMenuExerciseView.as_view()),
    path('progress/', ProgressStatsView.as_view()),
]
