from core_domain.models import ChallengeParticipant, InAppReminder, UserBadge


def award_badges_for_user(user):
    joined_count = ChallengeParticipant.objects.filter(user=user).count()
    completed_count = ChallengeParticipant.objects.filter(user=user, completed=True).count()

    rules = [
        {
            'code': 'first_join',
            'title': 'First Challenge Joined',
            'description': 'You joined your first challenge.',
            'criteria': joined_count >= 1,
        },
        {
            'code': 'consistent_3',
            'title': 'Consistency Starter',
            'description': 'You joined at least 3 challenges.',
            'criteria': joined_count >= 3,
        },
        {
            'code': 'finisher_1',
            'title': 'First Finish',
            'description': 'You completed your first challenge.',
            'criteria': completed_count >= 1,
        },
        {
            'code': 'finisher_5',
            'title': 'Challenge Machine',
            'description': 'You completed 5 challenges.',
            'criteria': completed_count >= 5,
        },
    ]

    for rule in rules:
        if not rule['criteria']:
            continue

        badge, created = UserBadge.objects.get_or_create(
            user=user,
            code=rule['code'],
            defaults={
                'title': rule['title'],
                'description': rule['description'],
            },
        )
        if created:
            InAppReminder.objects.create(
                user=user,
                type='badge',
                message=f"New badge unlocked: {badge.title}",
                metadata={'badge_code': badge.code},
            )
