from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

from core_domain.models import (
    ChallengeParticipant,
    ChallengeUpdate,
    CompletedExercise,
    ExerciseSession,
    JournalEntry,
    MoodEntry,
    Profile,
    UserTemplateVersion,
)


def _clamp(value: float, min_value: int = 0, max_value: int = 100) -> int:
    return max(min_value, min(max_value, int(round(value))))


def _percent(part: float, total: float) -> int:
    if total <= 0:
        return 0
    return _clamp((part / total) * 100)


def _make_metric(label: str, value: float, unit: str, percent: int) -> dict:
    numeric = int(round(value)) if float(value).is_integer() else round(value, 1)
    return {
        'label': label,
        'value': numeric,
        'unit': unit,
        'percent': _clamp(percent),
    }


def build_profile_interest_insights(user):
    profile, _ = Profile.objects.get_or_create(user=user, defaults={'full_name': user.username})

    today = timezone.now().date()
    since_30 = today - timedelta(days=29)
    since_14 = today - timedelta(days=13)

    sessions_30 = ExerciseSession.objects.filter(user=user, date__gte=since_30)
    completed_30 = CompletedExercise.objects.filter(session__user=user, session__date__gte=since_30)
    moods_30 = MoodEntry.objects.filter(user=user, date__gte=since_30)
    journal_30 = JournalEntry.objects.filter(user=user, created_at__date__gte=since_30)

    participations = ChallengeParticipant.objects.filter(user=user).select_related('challenge')
    participations_30 = participations.filter(joined_at__date__gte=since_30)
    updates_30 = ChallengeUpdate.objects.filter(user=user, created_at__date__gte=since_30)

    cards = []

    if profile.sport:
        sessions_count = sessions_30.count()
        active_days = sessions_30.values('date').distinct().count()
        completed_exercises = completed_30.count()
        monthly_target = max(profile.weekly_goal * 4, 1)

        consistency = _percent(active_days, monthly_target)
        training_volume = _percent(completed_exercises, max(sessions_count * 6, 1))
        execution_score = _percent(completed_exercises, max(active_days * 5, 1))

        cards.append({
            'key': 'sport',
            'title': 'Sport performance',
            'subtitle': 'Real data from your training sessions in the last 30 days.',
            'metrics': [
                _make_metric('Active days', active_days, 'days', consistency),
                _make_metric('Exercises completed', completed_exercises, 'ex', training_volume),
                _make_metric('Execution score', execution_score, '%', execution_score),
            ],
            'highlights': [
                f'{sessions_count} sessions tracked in the last 30 days',
                f'Weekly goal configured: {profile.weekly_goal} sessions',
            ],
        })

    if profile.food:
        configured_targets = sum(
            1
            for value in [
                profile.macro_calories_target,
                profile.macro_protein_target,
                profile.macro_carbs_target,
                profile.macro_fat_target,
            ]
            if value and value > 0
        )
        setup_score = _percent(configured_targets, 4)

        nutrition_joined = participations.filter(challenge__category='nutrition').count()
        nutrition_completed = participations.filter(challenge__category='nutrition', completed=True).count()
        challenge_score = _percent(nutrition_completed, max(nutrition_joined, 1))

        calories_target = profile.macro_calories_target if profile.macro_calories_target > 0 else 0
        calorie_score = _percent(max(min(calories_target, 4200) - 1400, 0), 2800) if calories_target else 0

        cards.append({
            'key': 'food',
            'title': 'Nutrition alignment',
            'subtitle': 'Based on your configured targets and nutrition challenges.',
            'metrics': [
                _make_metric('Targets configured', configured_targets, '/4', setup_score),
                _make_metric('Calorie target', calories_target, 'kcal', calorie_score),
                _make_metric('Nutrition challenge completion', challenge_score, '%', challenge_score),
            ],
            'highlights': [
                f'Protein target: {int(profile.macro_protein_target or 0)}g',
                f'Carbs/Fat target: {int(profile.macro_carbs_target or 0)}g / {int(profile.macro_fat_target or 0)}g',
            ],
        })

    if profile.mindset:
        mood_count = moods_30.count()
        mood_avg = float(moods_30.aggregate(avg=Avg('value'))['avg'] or 0)
        journal_count = journal_30.count()
        recent_mood_count = MoodEntry.objects.filter(user=user, date__gte=since_14).count()

        resilience = _percent(mood_avg, 5)
        checkin_consistency = _percent(recent_mood_count, 14)
        journaling_score = _percent(journal_count, 20)

        cards.append({
            'key': 'mindset',
            'title': 'Mindset readiness',
            'subtitle': 'Derived from mood check-ins and journal habits.',
            'metrics': [
                _make_metric('Average mood', mood_avg, '/5', resilience),
                _make_metric('Mood check-ins (14d)', recent_mood_count, 'entries', checkin_consistency),
                _make_metric('Journal entries (30d)', journal_count, 'entries', journaling_score),
            ],
            'highlights': [
                f'{mood_count} mood entries captured in the last 30 days',
                'Keep daily logs for more stable trend lines',
            ],
        })

    if profile.growth:
        growth_templates = (
            UserTemplateVersion.objects.filter(user=user, kind='growth')
            .values('template_key')
            .distinct()
            .count()
        )
        growth_updates = updates_30.filter(challenge__category='growth').count()
        journal_count = journal_30.count()

        momentum = _percent(journal_count + growth_updates, 30)
        template_depth = _percent(growth_templates, 8)
        challenge_engagement = _percent(
            participations_30.filter(challenge__category='growth').count(),
            6,
        )

        cards.append({
            'key': 'growth',
            'title': 'Personal growth',
            'subtitle': 'Growth patterns from templates, journal and challenge updates.',
            'metrics': [
                _make_metric('Learning momentum', momentum, '%', momentum),
                _make_metric('Growth templates', growth_templates, 'saved', template_depth),
                _make_metric('Growth challenge engagement', challenge_engagement, '%', challenge_engagement),
            ],
            'highlights': [
                f'{growth_updates} growth updates posted in the last 30 days',
                f'{journal_count} journal entries feeding your reflection loop',
            ],
        })

    if profile.challenges:
        totals = participations.aggregate(
            joined=Count('id'),
            completed=Count('id', filter=Q(completed=True)),
            avg_progress=Avg('progress'),
        )
        joined = int(totals['joined'] or 0)
        completed = int(totals['completed'] or 0)
        avg_progress = float(totals['avg_progress'] or 0)

        completion_rate = _percent(completed, max(joined, 1))
        participation_30d = participations_30.count()
        cadence = _percent(participation_30d, 6)

        cards.append({
            'key': 'challenges',
            'title': 'Challenge engine',
            'subtitle': 'Real completion and participation behavior from your challenges.',
            'metrics': [
                _make_metric('Joined challenges', joined, 'total', _percent(joined, 12)),
                _make_metric('Completion rate', completion_rate, '%', completion_rate),
                _make_metric('Average progress', avg_progress, '%', _clamp(avg_progress)),
            ],
            'highlights': [
                f'{participation_30d} challenges joined in the last 30 days',
                f'{completed} completed challenges so far',
            ],
        })

    return {
        'cards': cards,
        'generated_at': timezone.now().isoformat(),
    }
