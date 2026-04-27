from datetime import timedelta

from django.utils import timezone

from core_domain.models import ExerciseSession


def build_progress_stats(user, location=None, days_back=7):
    dates = []
    counts = []

    for i in range(days_back):
        date = timezone.now().date() - timedelta(days=(days_back - 1 - i))
        dates.append(date.strftime('%a'))

        sessions = ExerciseSession.objects.filter(user=user, date=date)
        if location:
            sessions = sessions.filter(location=location)

        count = sum(session.completed_exercises for session in sessions)
        counts.append(count)

    return {
        'labels': dates,
        'values': counts,
    }
