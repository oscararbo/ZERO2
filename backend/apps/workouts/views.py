from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api.responses import error_response, success_response
from core_domain.models import Exercise, ExerciseSession
from core_domain.serializers import (
    CompletedExerciseSerializer,
    ExerciseSerializer,
    ExerciseSessionDetailSerializer,
    ExerciseSessionSerializer,
)

from .request_serializers import CompletedExerciseCreateRequestSerializer, ExerciseSessionCreateRequestSerializer
from .services import (
    build_progress_stats,
    get_or_create_session,
    upsert_completed_exercise_for_session,
    upsert_session_exercises,
)


class ExerciseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location = request.query_params.get('location', None)
        category = request.query_params.get('category', None)

        exercises = Exercise.objects.all()
        if location:
            exercises = exercises.filter(location=location)
        if category:
            exercises = exercises.filter(category=category)

        serializer = ExerciseSerializer(exercises, many=True)
        return success_response(serializer.data)


class ExerciseSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location = request.query_params.get('location', None)

        sessions = ExerciseSession.objects.filter(user=request.user).order_by('-date')
        if location:
            sessions = sessions.filter(location=location)

        serializer = ExerciseSessionSerializer(sessions[:7], many=True)
        return success_response(serializer.data)

    def post(self, request):
        request_serializer = ExerciseSessionCreateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        location = request_serializer.validated_data['location']
        exercises = request_serializer.validated_data.get('exercises', [])

        session = get_or_create_session(request.user, location)
        result = upsert_session_exercises(session, exercises)
        if not result.ok:
            return error_response(result.error, status_code=result.code)

        serializer = ExerciseSessionDetailSerializer(result.data)
        return success_response(serializer.data, status_code=result.code)


class ExerciseSessionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
        except ExerciseSession.DoesNotExist:
            return error_response('La sesión no fue encontrada.', status_code=status.HTTP_404_NOT_FOUND)

        serializer = ExerciseSessionDetailSerializer(session)
        return success_response(serializer.data)


class CompletedExerciseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request_serializer = CompletedExerciseCreateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        session_id = request_serializer.validated_data['session_id']
        exercise_id = request_serializer.validated_data['exercise_id']
        sets_completed = request_serializer.validated_data['sets_completed']
        reps_per_set = request_serializer.validated_data['reps_per_set']

        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
        except ExerciseSession.DoesNotExist:
            return error_response('La sesión o el ejercicio no fueron encontrados.', status_code=status.HTTP_404_NOT_FOUND)

        result = upsert_completed_exercise_for_session(session, exercise_id, sets_completed, reps_per_set)
        if not result.ok:
            return error_response(result.error, status_code=result.code)

        serializer = CompletedExerciseSerializer(result.data['completed'])
        return success_response(serializer.data, status_code=result.code)


class MainMenuExerciseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, location):
        categories = [
            {'key': 'back', 'label': 'Back'},
            {'key': 'chest', 'label': 'Chest'},
            {'key': 'legs', 'label': 'Legs'},
            {'key': 'arms', 'label': 'Arms'},
            {'key': 'shoulders', 'label': 'Shoulders'},
            {'key': 'accessories', 'label': 'Accessories'},
        ]

        goal = request.query_params.get('goal', None)
        result = {}
        for cat_info in categories:
            exercises_query = Exercise.objects.filter(location=location, category=cat_info['key'])
            if goal:
                exercises_query = exercises_query.filter(goal__in=[goal, 'both'])

            result[cat_info['key']] = {
                'label': cat_info['label'],
                'exercises': ExerciseSerializer(exercises_query, many=True).data,
            }

        return success_response(result)


class ProgressStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location = request.query_params.get('location', None)
        payload = build_progress_stats(request.user, location=location, days_back=7)
        return success_response(payload)

__all__ = [
    'ExerciseView',
    'ExerciseSessionView',
    'ExerciseSessionDetailView',
    'CompletedExerciseView',
    'MainMenuExerciseView',
    'ProgressStatsView',
]
