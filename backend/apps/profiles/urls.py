from django.urls import path

from .views import ApiMetaView, ProfileInsightsView, ProfileView

urlpatterns = [
    path('profile/', ProfileView.as_view()),
    path('profile/insights/', ProfileInsightsView.as_view()),
    path('meta/', ApiMetaView.as_view()),
]
