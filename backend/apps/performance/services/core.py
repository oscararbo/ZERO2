import datetime
import json
import re
import urllib.parse
import urllib.request
from collections import defaultdict

from django.core.cache import cache
from django.db.models import Avg
from django.utils import timezone

from apps.workouts.meal_recommendations import build_meal_recommendations
from core_domain.models import (
    Exercise,
    ExerciseSession,
    ExerciseVideo,
    FeatureFlag,
    MoodEntry,
    Profile,
    RecoveryLog,
    WearableSnapshot,
    WeeklyPlanItem,
)


WEEKDAY_FOCUS = [
    (
        'sport',
        'Strength workout',
        'Protein + complex carbs',
        '2 minutes breathing',
        'Write one win of the day',
    ),
    (
        'food',
        'Mobility + walk 25 min',
        'Hydration + vegetables',
        'Meal gratitude note',
        'Plan tomorrow meals',
    ),
    (
        'sport',
        'Lower body session',
        'Post-workout carbs',
        'Body scan 5 min',
        'Review effort score',
    ),
    (
        'mindset',
        'Active recovery',
        'Balanced plate',
        'Journal 10 minutes',
        'Read 10 pages',
    ),
    (
        'sport',
        'Full-body session',
        'Higher protein day',
        'Visualization 3 min',
        'Weekly review draft',
    ),
    (
        'growth',
        'Outdoor cardio',
        'Flexible calories',
        'Mindful walk',
        'Define one weekly objective',
    ),
    (
        'recovery',
        'Rest day',
        'Fiber + hydration',
        'Sleep ritual',
        'Plan next week',
    ),
]


def _monday_from(date_obj: datetime.date) -> datetime.date:
    return date_obj - datetime.timedelta(days=date_obj.weekday())


def _recovery_score(
    sleep_hours: float,
    stress_level: int,
    soreness_level: int,
    resting_heart_rate: int | None,
) -> int:

    sleep_component = min(
        100,
        max(0, int((sleep_hours / 8.0) * 45)),
    )

    stress_component = max(
        0,
        int((11 - stress_level) * 3.5),
    )

    soreness_component = max(
        0,
        int((11 - soreness_level) * 2.5),
    )

    hr_component = 0

    if resting_heart_rate is not None:
        hr_component = max(
            0,
            20 - abs(resting_heart_rate - 60),
        )

    score = (
        sleep_component
        + stress_component
        + soreness_component
        + hr_component
    )

    return max(0, min(100, score))


def build_weekly_plan(
    user,
    start_date: datetime.date | None = None,
):
    today = timezone.now().date()

    start = _monday_from(start_date or today)

    profile = Profile.objects.filter(user=user).first()

    weekly_goal = profile.weekly_goal if profile else 3

    items = []

    for i in range(7):

        date_value = start + datetime.timedelta(days=i)

        (
            focus,
            workout,
            meal_focus,
            mindset_task,
            growth_task,
        ) = WEEKDAY_FOCUS[i]

        item, _ = WeeklyPlanItem.objects.update_or_create(
            user=user,
            date=date_value,
            defaults={
                'focus_area': focus,
                'planned_workout': workout,
                'planned_meal_focus': meal_focus,
                'mindset_task': mindset_task,
                'growth_task': growth_task,
                'weekly_goal_target': weekly_goal,
            },
        )

        items.append(item)

    completion = sum(
        1 for item in items if item.completed
    )

    return {
        'start_date': start,
        'end_date': start + datetime.timedelta(days=6),
        'weekly_goal_target': weekly_goal,
        'completed_items': completion,
        'items': items,
    }


def generate_coach_brief(user):

    now = timezone.now()

    seven_days_ago = (
        now.date() - datetime.timedelta(days=6)
    )

    sessions = ExerciseSession.objects.filter(
        user=user,
        date__gte=seven_days_ago,
    )

    mood_avg = (
        MoodEntry.objects.filter(
            user=user,
            date__gte=seven_days_ago,
        ).aggregate(avg=Avg('value'))['avg']
    )

    latest_recovery = (
        RecoveryLog.objects.filter(user=user)
        .order_by('-date')
        .first()
    )

    sessions_count = sessions.count()

    mood_value = (
        round(mood_avg, 1)
        if mood_avg is not None
        else None
    )

    recovery_score = (
        latest_recovery.recovery_score
        if latest_recovery
        else None
    )

    priority = 'consistency'

    message = (
        'Keep your weekly cadence and complete '
        'your planned sessions.'
    )

    if sessions_count < 2:

        priority = 'activation'

        message = (
            'Your training frequency is low this week. '
            'Complete a short session today to recover momentum.'
        )

    elif (
        recovery_score is not None
        and recovery_score < 45
    ):

        priority = 'recovery'

        message = (
            'Recovery is below optimal. '
            'Reduce intensity, prioritize sleep '
            'and hydration today.'
        )

    elif (
        mood_value is not None
        and mood_value < 5.5
    ):

        priority = 'mindset'

        message = (
            'Mood trend is low. '
            'Add one low-friction win and '
            'a 10-minute journal reset.'
        )

    actions = [
        'Complete at least one planned task before noon.',
        'Hydrate and hit protein target in the first two meals.',
        'Close the day with a 3-minute reflection update.',
    ]

    return {
        'priority': priority,
        'message': message,
        'sessions_last_7_days': sessions_count,
        'avg_mood_last_7_days': mood_value,
        'latest_recovery_score': recovery_score,
        'actions': actions,
    }


def build_nutrition_plus_plan(user):

    profile = Profile.objects.filter(user=user).first()

    goal = (
        profile.fitness_goal
        if profile
        else 'maintain'
    )

    day_names = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
    ]

    weekly = []

    aggregated = defaultdict(
        lambda: {
            'name': '',
            'unit': '',
            'amount': 0.0,
        }
    )

    for day_name in day_names:

        meals = build_meal_recommendations(goal)

        weekly.append({
            'day': day_name,
            'meals': meals,
        })

        for meal in meals:

            ingredients = (
                meal.get('recipe', {})
                .get('ingredients', [])
            )

            for ingredient in ingredients:

                key = (
                    f"{ingredient['name'].lower()}__"
                    f"{ingredient['unit'].lower()}"
                )

                aggregated[key]['name'] = (
                    ingredient['name']
                )

                aggregated[key]['unit'] = (
                    ingredient['unit']
                )

                aggregated[key]['amount'] += float(
                    ingredient['amount']
                )

    shopping = sorted(
        aggregated.values(),
        key=lambda x: x['name'],
    )

    return {
        'goal': goal,
        'weekly_plan': weekly,
        'shopping_list': shopping,
    }


def save_recovery_log(user, payload: dict):

    date_value = (
        payload.get('date')
        or timezone.now().date()
    )

    resting_hr = payload.get(
        'resting_heart_rate'
    )

    score = _recovery_score(
        float(payload['sleep_hours']),
        int(payload['stress_level']),
        int(payload['soreness_level']),
        int(resting_hr)
        if resting_hr is not None
        else None,
    )

    log, _ = RecoveryLog.objects.update_or_create(
        user=user,
        date=date_value,
        defaults={
            'sleep_hours': payload['sleep_hours'],
            'stress_level': payload['stress_level'],
            'soreness_level': payload['soreness_level'],
            'resting_heart_rate': resting_hr,
            'steps': payload.get('steps'),
            'recovery_score': score,
        },
    )

    return log


def ingest_wearable_entries(
    user,
    provider: str,
    source: str,
    entries: list[dict],
):

    created = 0

    for entry in entries:

        _, was_created = (
            WearableSnapshot.objects.update_or_create(
                user=user,
                provider=provider,
                date=entry['date'],
                defaults={
                    'source': source or provider,
                    'steps': entry.get('steps'),
                    'active_minutes': entry.get(
                        'active_minutes'
                    ),
                    'calories_burned': entry.get(
                        'calories_burned'
                    ),
                    'avg_heart_rate': entry.get(
                        'avg_heart_rate'
                    ),
                    'raw_payload': entry,
                },
            )
        )

        if was_created:
            created += 1

    return {
        'processed': len(entries),
        'created': created,
        'updated': len(entries) - created,
    }


def get_feature_flags():

    defaults = [
        (
            'performance_hub',
            True,
            'Enable performance hub pages and endpoints.',
        ),
        (
            'exercise_videos',
            True,
            'Enable YouTube demo video lookup for exercises.',
        ),
        (
            'wearable_sync',
            True,
            'Enable wearable manual sync endpoints.',
        ),
    ]

    for key, enabled, description in defaults:

        FeatureFlag.objects.get_or_create(
            key=key,
            defaults={
                'enabled': enabled,
                'description': description,
            },
        )

    return FeatureFlag.objects.all().order_by('key')


# =========================================================
# YOUTUBE VIDEO SYSTEM (NO SHORTS)
# =========================================================

SHORTS_KEYWORDS = [
    '#shorts',
    'shorts',
    'short',
]


LIVE_KEYWORDS = [
    'live',
    'stream',
]


def _normalize_text(value: str) -> str:
    return value.strip().lower()


def _is_valid_youtube_video(
    title: str,
    url: str,
) -> bool:

    title_lower = _normalize_text(title)

    url_lower = _normalize_text(url)

    if '/shorts/' in url_lower:
        return False

    for keyword in SHORTS_KEYWORDS:
        if keyword in title_lower:
            return False

    for keyword in LIVE_KEYWORDS:
        if keyword in title_lower:
            return False

    return True


def _extract_yt_initial_data(html: str) -> dict | None:

    patterns = [
        r'var ytInitialData = ({.*?});',
        r'window\["ytInitialData"\] = ({.*?});',
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            html,
            re.DOTALL,
        )

        if not match:
            continue

        try:
            return json.loads(match.group(1))
        except Exception:
            continue

    return None


def _find_video_renderers(obj):

    if isinstance(obj, dict):

        for key, value in obj.items():

            if key == 'videoRenderer':
                yield value

            yield from _find_video_renderers(value)

    elif isinstance(obj, list):

        for item in obj:
            yield from _find_video_renderers(item)


def _extract_video_candidates(
    html: str,
) -> list[dict]:

    data = _extract_yt_initial_data(html)

    if not data:
        return []

    candidates = []

    seen = set()

    for renderer in _find_video_renderers(data):

        video_id = renderer.get('videoId')

        if not video_id:
            continue

        if video_id in seen:
            continue

        seen.add(video_id)

        title_runs = (
            renderer.get('title', {})
            .get('runs', [])
        )

        title = ''

        if title_runs:
            title = title_runs[0].get(
                'text',
                '',
            )

        youtube_url = (
            f'https://www.youtube.com/watch?v={video_id}'
        )

        if not _is_valid_youtube_video(
            title=title,
            url=youtube_url,
        ):
            continue

        length_text = (
            renderer.get('lengthText')
        )

        # descartar vídeos sin duración
        # normalmente shorts/lives/problemáticos
        if not length_text:
            continue

        candidates.append({
            'video_id': video_id,
            'title': title,
            'youtube_url': youtube_url,
            'embed_url': (
                'https://www.youtube.com/embed/'
                f'{video_id}'
                '?rel=0&modestbranding=1'
            ),
        })

    return candidates


def _fetch_youtube_video(
    exercise_name: str,
) -> dict | None:

    query = urllib.parse.quote(
        f'{exercise_name} exercise tutorial full workout'
    )

    url = (
        'https://www.youtube.com/results'
        f'?search_query={query}'
    )

    request = urllib.request.Request(
        url,
        headers={
            'User-Agent': (
                'Mozilla/5.0 '
                '(Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 '
                '(KHTML, like Gecko) '
                'Chrome/124.0 Safari/537.36'
            ),
            'Accept-Language': 'en-US,en;q=0.9',
        },
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=15,
        ) as response:

            html = response.read().decode(
                'utf-8',
                errors='ignore',
            )

    except Exception:
        return None

    candidates = _extract_video_candidates(html)

    if not candidates:
        return None

    return candidates[0]


def _scrape_video_only(
    exercise_pk: int,
    exercise_name: str,
) -> dict:

    scraped = _fetch_youtube_video(
        exercise_name
    )

    if scraped:

        return {
            'exercise_id': exercise_pk,
            'video_id': scraped['video_id'],
            'url': scraped['youtube_url'],
            'embed_url': scraped['embed_url'],
            'title': scraped['title'],
            'source': 'scraped',
        }

    query = urllib.parse.quote(
        f'{exercise_name} exercise tutorial'
    )

    yt_url = (
        'https://www.youtube.com/results'
        f'?search_query={query}'
    )

    return {
        'exercise_id': exercise_pk,
        'video_id': None,
        'url': yt_url,
        'embed_url': None,
        'title': (
            f'{exercise_name} - search on YouTube'
        ),
        'source': 'search_url',
    }


def refresh_exercise_video(
    exercise: Exercise,
    force: bool = False,
):

    exercise_pk = int(
        getattr(exercise, 'pk', 0)
    )

    cache_key = f'yt-video:{exercise_pk}'

    if not force:

        cached = cache.get(cache_key)

        if cached:
            return cached

    existing = (
        ExerciseVideo.objects.filter(
            exercise=exercise
        ).first()
    )

    if (
        existing
        and not force
        and existing.last_synced_at
        and (
            timezone.now()
            - existing.last_synced_at
        ).days < 14
    ):

        payload = {
            'exercise_id': exercise_pk,
            'video_id': (
                existing.youtube_video_id
            ),
            'url': existing.youtube_url,
            'embed_url': existing.embed_url,
            'title': existing.title,
            'source': 'database',
        }

        cache.set(
            cache_key,
            payload,
            timeout=3600,
        )

        return payload

    scraped = _fetch_youtube_video(
        exercise.name
    )

    if not scraped:

        if existing:

            payload = {
                'exercise_id': exercise_pk,
                'video_id': (
                    existing.youtube_video_id
                ),
                'url': existing.youtube_url,
                'embed_url': existing.embed_url,
                'title': existing.title,
                'source': 'fallback_database',
            }

            cache.set(
                cache_key,
                payload,
                timeout=1800,
            )

            return payload

        return {
            'exercise_id': exercise_pk,
            'video_id': None,
            'url': None,
            'embed_url': None,
            'title': None,
            'source': 'not_found',
        }

    ExerciseVideo.objects.update_or_create(
        exercise=exercise,
        defaults={
            'youtube_video_id': (
                scraped['video_id']
            ),
            'youtube_url': (
                scraped['youtube_url']
            ),
            'embed_url': (
                scraped['embed_url']
            ),
            'title': scraped['title'],
            'last_synced_at': timezone.now(),
            'last_payload': {
                'query': exercise.name,
            },
        },
    )

    payload = {
        'exercise_id': exercise_pk,
        'video_id': scraped['video_id'],
        'url': scraped['youtube_url'],
        'embed_url': scraped['embed_url'],
        'title': scraped['title'],
        'source': 'scraped',
    }

    cache.set(
        cache_key,
        payload,
        timeout=3600,
    )

    return payload
