from django.core.cache import cache
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


class WeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = WeeklyPlanRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        payload = build_weekly_plan(request.user, serializer.validated_data.get('start_date'))
        return success_response({
            'start_date': payload['start_date'],
            'end_date': payload['end_date'],
            'weekly_goal_target': payload['weekly_goal_target'],
            'completed_items': payload['completed_items'],
            'items': WeeklyPlanItemSerializer(payload['items'], many=True).data,
        })

    def post(self, request):
        item_id = request.data.get('item_id')
        completed = bool(request.data.get('completed', True))
        try:
            item = WeeklyPlanItem.objects.get(id=item_id, user=request.user)
        except WeeklyPlanItem.DoesNotExist:
            return error_response('Plan item not found.', status_code=404)

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

        payload = generate_coach_brief(request.user)
        cache.set(cache_key, payload, timeout=300)
        return success_response(payload)


class NutritionPlusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cache_key = f'nutrition-plus:{request.user.id}'
        cached = cache.get(cache_key)
        if cached:
            return success_response(cached)

        payload = build_nutrition_plus_plan(request.user)
        cache.set(cache_key, payload, timeout=900)
        return success_response(payload)


class RecoveryLogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        logs = RecoveryLog.objects.filter(user=request.user).order_by('-date')[:30]
        return success_response(RecoveryLogSerializer(logs, many=True).data)

    def post(self, request):
        serializer = RecoveryLogRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = save_recovery_log(request.user, serializer.validated_data)
        return success_response(RecoveryLogSerializer(log).data, status_code=201)


class WearablesSyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        snapshots = request.user.wearable_snapshots.order_by('-date')[:100]
        return success_response(WearableSnapshotSerializer(snapshots, many=True).data)

    def post(self, request):
        serializer = WearableIngestRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        summary = ingest_wearable_entries(
            request.user,
            serializer.validated_data['provider'],
            serializer.validated_data.get('source', ''),
            serializer.validated_data['entries'],
        )
        return success_response(summary, status_code=201)


class FeatureFlagsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        flags = get_feature_flags()
        return success_response(FeatureFlagSerializer(flags, many=True).data)


class AsyncJobsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        jobs = AsyncJob.objects.filter(user=request.user).order_by('-created_at')[:40]
        return success_response(AsyncJobSerializer(jobs, many=True).data)

    def post(self, request):
        serializer = AsyncJobCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = create_job(request.user, serializer.validated_data['job_type'], serializer.validated_data.get('payload', {}))
        return success_response(AsyncJobSerializer(job).data, status_code=201)


class RunPendingJobsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        processed = execute_pending_jobs(limit=int(request.data.get('limit', 10)))
        return success_response({'processed': processed})


class ExerciseVideoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, exercise_id):
        try:
            exercise = Exercise.objects.get(id=exercise_id)
        except Exercise.DoesNotExist:
            return error_response('Exercise not found.', status_code=404)

        payload = refresh_exercise_video(exercise, force=False)
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
            payload = refresh_exercise_video(exercise, force=force)
            return success_response(payload)

        job = create_job(request.user, 'sync_exercise_videos', {'force': force, 'limit': 60})
        return success_response(AsyncJobSerializer(job).data, status_code=202)


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
