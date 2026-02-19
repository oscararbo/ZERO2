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
]
