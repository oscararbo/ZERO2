from datetime import timedelta

from django.utils import timezone

from core_domain.models import MoodEntry, UserTemplateVersion


def get_latest_template_versions(user, kind):
    versions = UserTemplateVersion.objects.filter(user=user, kind=kind).order_by('template_key', '-version')
    latest_by_key = {}
    for item in versions:
        if item.template_key not in latest_by_key:
            latest_by_key[item.template_key] = item
    return list(latest_by_key.values())


def get_mood_entries(user, days=14):
    bounded_days = max(1, min(days, 90))
    since = timezone.now().date() - timedelta(days=bounded_days - 1)
    return MoodEntry.objects.filter(user=user, date__gte=since)
