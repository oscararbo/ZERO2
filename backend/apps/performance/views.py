from datetime import timedelta

from django.core.cache import cache
from django.db import DatabaseError, OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView

from common.api.responses import error_response, success_response
from core_domain.models import AsyncJob, Exercise, RecoveryLog, WeeklyPlanItem
from core_domain.serializers import (
    AsyncJobSerializer,
    ExerciseVideoSerializer,
    FeatureFlagSerializer,
    RecoveryLogSerializer,
    WearableSnapshotSerializer,
    WeeklyPlanItemSerializer,
)

from .request_serializers import (
    AsyncJobCreateRequestSerializer,
    ExerciseVideoRefreshRequestSerializer,
    RecoveryLogRequestSerializer,
    WearableIngestRequestSerializer,
    WeeklyPlanRequestSerializer,
)
from .services import (
    build_nutrition_plus_plan,
    build_weekly_plan,
    create_job,
    execute_pending_jobs,
    generate_coach_brief,
    get_feature_flags,
    ingest_wearable_entries,
    refresh_exercise_video,
    save_recovery_log,
)
from .services import _scrape_video_only


class WeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = WeeklyPlanRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        start_date = serializer.validated_data.get('start_date')
        try:
            payload = build_weekly_plan(request.user, start_date)
            return success_response({
                'start_date': payload['start_date'],
                'end_date': payload['end_date'],
                'weekly_goal_target': payload['weekly_goal_target'],
                'completed_items': payload['completed_items'],
                'items': WeeklyPlanItemSerializer(payload['items'], many=True).data,
            })
        except (ProgrammingError, OperationalError, DatabaseError):
            base = start_date or timezone.now().date()
            monday = base - timedelta(days=base.weekday())
            return success_response({
                'start_date': monday,
                'end_date': monday + timedelta(days=6),
                'weekly_goal_target': 3,
                'completed_items': 0,
                'items': [],
            })

    def post(self, request):
        item_id = request.data.get('item_id')
        completed = bool(request.data.get('completed', True))
        try:
            item = WeeklyPlanItem.objects.get(id=item_id, user=request.user)
        except WeeklyPlanItem.DoesNotExist:
            return error_response('Plan item not found.', status_code=404)
        except (ProgrammingError, OperationalError, DatabaseError):
            return error_response('Performance service is temporarily unavailable.', status_code=503)

        item.completed = completed
        item.save(update_fields=['completed'])
        return success_response(WeeklyPlanItemSerializer(item).data)


class CoachBriefView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cache_key = f'coach-brief:{request.user.id}'
        cached = cache.get(cache_key)
        if cached:
            return success_response(cached)

        try:
            payload = generate_coach_brief(request.user)
        except (ProgrammingError, OperationalError, DatabaseError):
            payload = {
                'priority': 'consistency',
                'message': 'Coach brief is temporarily unavailable.',
                'sessions_last_7_days': 0,
                'avg_mood_last_7_days': None,
                'latest_recovery_score': None,
                'actions': [],
            }
        cache.set(cache_key, payload, timeout=300)
        return success_response(payload)


class NutritionPlusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cache_key = f'nutrition-plus:{request.user.id}'
        cached = cache.get(cache_key)
        if cached:
            return success_response(cached)

        try:
            payload = build_nutrition_plus_plan(request.user)
        except (ProgrammingError, OperationalError, DatabaseError):
            payload = {
                'goal': 'maintain',
                'weekly_plan': [],
                'shopping_list': [],
            }
        cache.set(cache_key, payload, timeout=900)
        return success_response(payload)


class RecoveryLogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            logs = RecoveryLog.objects.filter(user=request.user).order_by('-date')[:30]
            return success_response(RecoveryLogSerializer(logs, many=True).data)
        except (ProgrammingError, OperationalError, DatabaseError):
            return success_response([])

    def post(self, request):
        serializer = RecoveryLogRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            log = save_recovery_log(request.user, serializer.validated_data)
            return success_response(RecoveryLogSerializer(log).data, status_code=201)
        except (ProgrammingError, OperationalError, DatabaseError):
            return error_response('Performance service is temporarily unavailable.', status_code=503)


class WearablesSyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            snapshots = request.user.wearable_snapshots.order_by('-date')[:100]
            return success_response(WearableSnapshotSerializer(snapshots, many=True).data)
        except (ProgrammingError, OperationalError, DatabaseError):
            return success_response([])

    def post(self, request):
        serializer = WearableIngestRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            summary = ingest_wearable_entries(
                request.user,
                serializer.validated_data['provider'],
                serializer.validated_data.get('source', ''),
                serializer.validated_data['entries'],
            )
            return success_response(summary, status_code=201)
        except (ProgrammingError, OperationalError, DatabaseError):
            return error_response('Performance service is temporarily unavailable.', status_code=503)


class FeatureFlagsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            flags = get_feature_flags()
            return success_response(FeatureFlagSerializer(flags, many=True).data)
        except (ProgrammingError, OperationalError, DatabaseError):
            return success_response([
                {
                    'key': 'performance_hub',
                    'enabled': False,
                    'description': 'Temporarily disabled while the service is being initialized.',
                    'updated_at': None,
                }
            ])


class AsyncJobsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            jobs = AsyncJob.objects.filter(user=request.user).order_by('-created_at')[:40]
            return success_response(AsyncJobSerializer(jobs, many=True).data)
        except (ProgrammingError, OperationalError, DatabaseError):
            return success_response([])

    def post(self, request):
        serializer = AsyncJobCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data.get('payload', {})
        job_type = serializer.validated_data['job_type']
        try:
            job = create_job(request.user, job_type, payload)
            return success_response(AsyncJobSerializer(job).data, status_code=201)
        except (ProgrammingError, OperationalError, DatabaseError):
            # Accept the request while infrastructure catches up (migrations/cold start).
            # Keep the response shape compatible with AsyncJob so frontend flows remain stable.
            deferred_job = {
                'id': 0,
                'job_type': job_type,
                'status': 'pending',
                'payload': payload,
                'result': {
                    'deferred': True,
                    'reason': 'service_initializing',
                },
                'error': '',
                'created_at': timezone.now(),
                'started_at': None,
                'finished_at': None,
            }
            return success_response(deferred_job, status_code=202)


class RunPendingJobsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        try:
            processed = execute_pending_jobs(limit=int(request.data.get('limit', 10)))
            return success_response({'processed': processed})
        except (ProgrammingError, OperationalError, DatabaseError):
            return success_response({'processed': []})


class ExerciseVideoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, exercise_id):
        try:
            exercise = Exercise.objects.get(id=exercise_id)
        except Exercise.DoesNotExist:
            return error_response('Exercise not found.', status_code=404)
        except (ProgrammingError, OperationalError, DatabaseError):
            return error_response('Performance service is temporarily unavailable.', status_code=503)

        try:
            payload = refresh_exercise_video(exercise, force=False)
        except (ProgrammingError, OperationalError, DatabaseError):
            # ExerciseVideo table not migrated yet – scrape without DB persistence.
            payload = _scrape_video_only(int(exercise_id), exercise.name)
        return success_response(payload)


class ExerciseVideoRefreshView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = ExerciseVideoRefreshRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        exercise_id = serializer.validated_data.get('exercise_id')
        force = serializer.validated_data.get('force', False)

        if exercise_id:
            try:
                exercise = Exercise.objects.get(id=exercise_id)
            except Exercise.DoesNotExist:
                return error_response('Exercise not found.', status_code=404)
            except (ProgrammingError, OperationalError, DatabaseError):
                return error_response('Performance service is temporarily unavailable.', status_code=503)
            try:
                payload = refresh_exercise_video(exercise, force=force)
                return success_response(payload)
            except (ProgrammingError, OperationalError, DatabaseError):
                return error_response('Performance service is temporarily unavailable.', status_code=503)

        try:
            job = create_job(request.user, 'sync_exercise_videos', {'force': force, 'limit': 60})
            return success_response(AsyncJobSerializer(job).data, status_code=202)
        except (ProgrammingError, OperationalError, DatabaseError):
            return error_response('Performance service is temporarily unavailable.', status_code=503)


__all__ = [
    'WeeklyPlanView',
    'CoachBriefView',
    'NutritionPlusView',
    'RecoveryLogView',
    'WearablesSyncView',
    'FeatureFlagsView',
    'AsyncJobsView',
    'RunPendingJobsView',
    'ExerciseVideoView',
    'ExerciseVideoRefreshView',
]
