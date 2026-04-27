from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({"status": "OK", "api": "/api/"})

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('', include('api_compat.urls')),
]
