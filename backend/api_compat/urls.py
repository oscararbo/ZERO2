from django.urls import include, path

urlpatterns = [
    path('api/', include('apps.account_auth.urls')),
    path('api/', include('apps.profiles.urls')),
    path('api/', include('apps.workouts.urls')),
    path('api/', include('apps.mindset.urls')),
    path('api/', include('apps.challenges.urls')),
    path('api/', include('apps.admin_panel.urls')),
    path('api/', include('apps.performance.urls')),

    path('api/v1/', include('apps.account_auth.urls')),
    path('api/v1/', include('apps.profiles.urls')),
    path('api/v1/', include('apps.workouts.urls')),
    path('api/v1/', include('apps.mindset.urls')),
    path('api/v1/', include('apps.challenges.urls')),
    path('api/v1/', include('apps.admin_panel.urls')),
    path('api/v1/', include('apps.performance.urls')),
]
