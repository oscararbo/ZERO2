from django.urls import path

from .views import (
    AsyncJobsView,
    CoachBriefView,
    ExerciseVideoRefreshView,
    ExerciseVideoView,
    FeatureFlagsView,
    NutritionPlusView,
    RecoveryLogView,
    RunPendingJobsView,
    WearablesSyncView,
    WeeklyPlanView,
)

urlpatterns = [
    path('performance/planner/', WeeklyPlanView.as_view()),
    path('performance/coach/', CoachBriefView.as_view()),
    path('performance/nutrition/', NutritionPlusView.as_view()),
    path('performance/recovery/', RecoveryLogView.as_view()),
    path('performance/wearables/', WearablesSyncView.as_view()),
    path('performance/feature-flags/', FeatureFlagsView.as_view()),
    path('performance/jobs/', AsyncJobsView.as_view()),
    path('performance/jobs/run-pending/', RunPendingJobsView.as_view()),
    path('exercises/<int:exercise_id>/video/', ExerciseVideoView.as_view()),
    path('performance/exercise-videos/refresh/', ExerciseVideoRefreshView.as_view()),
]
