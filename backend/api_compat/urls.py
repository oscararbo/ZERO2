from django.urls import include, path

urlpatterns = [
    path('api/', include('apps.account_auth.urls')),
    path('api/', include('apps.profiles.urls')),
    path('api/', include('apps.workouts.urls')),
    path('api/', include('apps.mindset.urls')),
    path('api/', include('apps.challenges.urls')),
]
