from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import CheckEmailView, CheckUsernameView, HealthView, LoginView, RegisterView

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('health/', HealthView.as_view()),
    path('check-username/', CheckUsernameView.as_view()),
    path('check-email/', CheckEmailView.as_view()),
]
