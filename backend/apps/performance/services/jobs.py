from django.utils import timezone

from core_domain.models import AsyncJob, Exercise

from .core import refresh_exercise_video


def create_job(user, job_type: str, payload: dict | None = None):
    return AsyncJob.objects.create(
        user=user,
        job_type=job_type,
        payload=payload or {},
        status='pending',
    )


def _run_job(job: AsyncJob):
    if job.job_type == 'sync_exercise_videos':
        limit = int(job.payload.get('limit', 20))
        refreshed = 0
        for exercise in Exercise.objects.all()[: max(1, min(limit, 200))]:
            refresh_exercise_video(exercise, force=bool(job.payload.get('force', False)))
            refreshed += 1
        return {'refreshed': refreshed}

    if job.job_type == 'compute_recovery_digest':
        # Placeholder for periodic aggregation; keeps async engine extensible.
        return {'status': 'digest-ready'}

    raise ValueError(f'Unsupported job type: {job.job_type}')


def execute_pending_jobs(limit: int = 10):
    processed = []
    jobs = AsyncJob.objects.filter(status='pending').order_by('created_at')[: max(1, limit)]
    for job in jobs:
        job.status = 'running'
        job.started_at = timezone.now()
        job.save(update_fields=['status', 'started_at'])
        try:
            result = _run_job(job)
            job.status = 'done'
            job.result = result
            job.finished_at = timezone.now()
            job.save(update_fields=['status', 'result', 'finished_at'])
            processed.append({'id': job.id, 'status': 'done', 'result': result})
        except Exception as exc:
            job.status = 'failed'
            job.error = str(exc)
            job.finished_at = timezone.now()
            job.save(update_fields=['status', 'error', 'finished_at'])
            processed.append({'id': job.id, 'status': 'failed', 'error': str(exc)})
    return processed
