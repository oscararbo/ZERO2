from datetime import datetime

from django.utils import timezone

from core_domain.models import MoodEntry, UserTemplateVersion
from common.services.results import failure, success


def normalize_template_key(title):
    normalized = ''.join(ch.lower() if ch.isalnum() else '-' for ch in title.strip())
    normalized = '-'.join(part for part in normalized.split('-') if part)
    return normalized[:80] or f"tpl-{timezone.now().strftime('%Y%m%d%H%M%S')}"


def create_template_version(user, kind, title, payload, template_key=None):
    key = (template_key or '').strip() or normalize_template_key(title)

    latest = UserTemplateVersion.objects.filter(
        user=user,
        kind=kind,
        template_key=key,
    ).order_by('-version').first()

    next_version = (latest.version + 1) if latest else 1
    UserTemplateVersion.objects.filter(
        user=user,
        kind=kind,
        template_key=key,
        is_active=True,
    ).update(is_active=False)

    template = UserTemplateVersion.objects.create(
        user=user,
        kind=kind,
        template_key=key,
        title=title,
        payload=payload,
        version=next_version,
        is_active=True,
    )
    return success(template, code=201)


def parse_iso_date(date_text):
    if not date_text:
        return timezone.now().date(), None

    if hasattr(date_text, 'year') and hasattr(date_text, 'month') and hasattr(date_text, 'day'):
        return date_text, None

    try:
        parsed = datetime.strptime(date_text, '%Y-%m-%d').date()
        return parsed, None
    except ValueError:
        return None, 'date must be YYYY-MM-DD.'


def upsert_mood_entry(user, value, date_text=None):
    try:
        mood_value = max(1, min(5, int(value)))
    except (TypeError, ValueError):
        return failure('value must be an integer.', code=400)

    mood_date, date_error = parse_iso_date(date_text)
    if date_error:
        return failure(date_error, code=400)

    entry, _ = MoodEntry.objects.update_or_create(
        user=user,
        date=mood_date,
        defaults={'value': mood_value},
    )
    return success(entry, code=200)
