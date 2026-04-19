from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api.responses import success_response
from core_domain.models import Challenge, Exercise, Profile, UserTemplateVersion
from core_domain.serializers import ProfileSerializer
from .services import build_profile_interest_insights


def _serialize_choices(choices):
    return [{'value': value, 'label': label} for value, label in choices]


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        return success_response(ProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not serializer.validated_data:
            return success_response(ProfileSerializer(profile).data)

        serializer.save()
        return success_response(serializer.data)


class ApiMetaView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = {
            'api': {
                'name': 'ZERO Backend API',
                'version': getattr(settings, 'APP_VERSION', 'dev'),
            },
            'choices': {
                'fitness_goals': _serialize_choices(Profile.FITNESS_GOAL_CHOICES),
                'exercise_categories': _serialize_choices(Exercise.CATEGORY_CHOICES),
                'exercise_locations': _serialize_choices(Exercise.LOCATION_CHOICES),
                'exercise_goals': _serialize_choices(Exercise.GOAL_CHOICES),
                'challenge_categories': _serialize_choices(Challenge.CATEGORY_CHOICES),
                'template_kinds': _serialize_choices(UserTemplateVersion.KIND_CHOICES),
            },
            'limits': {
                'mood_days_min': 1,
                'mood_days_max': 90,
                'weekly_goal_min': 1,
                'weekly_goal_max': 14,
                'challenge_duration_min': 1,
                'challenge_duration_max': 365,
                'challenge_target_min': 1,
                'challenge_target_max': 1000,
            },
        }
        return success_response(payload)


class ProfileInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = build_profile_interest_insights(request.user)
        return success_response(payload)


__all__ = ['ProfileView', 'ApiMetaView', 'ProfileInsightsView']
