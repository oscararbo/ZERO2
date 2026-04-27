from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

from core_domain.models import ChallengeParticipant, InAppReminder


def create_progress_reminders_for_user(user):
    now = timezone.now()
    stale_limit = now - timedelta(days=2)
    daily_limit = now - timedelta(hours=24)

    candidates = ChallengeParticipant.objects.filter(
        user=user,
        completed=False,
        joined_at__lte=stale_limit,
        challenge__created_at__gte=now - timedelta(days=45),
    ).select_related('challenge')

    for participant in candidates:
        exists_recent = InAppReminder.objects.filter(
            user=user,
            challenge=participant.challenge,
            type='progress',
            created_at__gte=daily_limit,
        ).exists()
        if exists_recent:
            continue

        InAppReminder.objects.create(
            user=user,
            challenge=participant.challenge,
            type='progress',
            message=f"Reminder: update your progress in '{participant.challenge.title}'.",
            metadata={'challenge_id': participant.challenge.id},
        )


def build_challenge_analytics(user):
    participations = ChallengeParticipant.objects.filter(user=user)

    totals = participations.aggregate(
        total_joined=Count('id'),
        total_completed=Count('id', filter=Q(completed=True)),
        average_progress=Avg('progress'),
    )

    total = totals['total_joined'] or 0
    completed = totals['total_completed'] or 0
    avg_progress = round(float(totals['average_progress'] or 0), 1)

    categories = ['sport', 'nutrition', 'mindset', 'growth', 'general']
    category_map = {
        row['challenge__category']: row
        for row in participations.values('challenge__category').annotate(
            joined=Count('id'),
            completed=Count('id', filter=Q(completed=True)),
        )
    }

    by_category = []
    for category in categories:
        row = category_map.get(category)
        joined = row['joined'] if row else 0
        done = row['completed'] if row else 0
        completion_rate = round((done / joined) * 100, 1) if joined else 0
        by_category.append(
            {
                'category': category,
                'joined': joined,
                'completed': done,
                'completion_rate': completion_rate,
            }
        )

    return {
        'total_joined': total,
        'total_completed': completed,
        'completion_rate': round((completed / total) * 100, 1) if total else 0,
        'average_progress': avg_progress,
        'by_category': by_category,
    }
