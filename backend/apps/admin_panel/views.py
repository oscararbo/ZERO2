import csv
from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Avg, Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView

from common.api.responses import success_response
from core_domain.models import (
    Challenge,
    ChallengeParticipant,
    CompletedExercise,
    Exercise,
    ExerciseSession,
    InAppReminder,
    JournalEntry,
    MoodEntry,
    Profile,
    UserBadge,
)
from .models import AdminPanelAlert


class AdminAccessView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return success_response({'is_admin': True})


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        payload = self._build_stats_payload(request)
        return success_response(payload)

    def _build_stats_payload(self, request):
        now = timezone.now()
        today = now.date()
        start_date, end_date = self._parse_date_range(request, today)
        top_limit = self._parse_top_limit(request)
        range_days = (end_date - start_date).days + 1

        # prior period (same length, immediately before)
        prior_end = start_date - timedelta(days=1)
        prior_start = prior_end - timedelta(days=range_days - 1)

        users_in_range = User.objects.filter(date_joined__date__range=(start_date, end_date))
        sessions_in_range = ExerciseSession.objects.filter(date__range=(start_date, end_date))
        moods_in_range = MoodEntry.objects.filter(date__range=(start_date, end_date))
        journals_in_range = JournalEntry.objects.filter(created_at__date__range=(start_date, end_date))
        completed_in_range = CompletedExercise.objects.filter(completed_at__date__range=(start_date, end_date))
        challenge_completed_in_range = ChallengeParticipant.objects.filter(
            completed=True,
            completed_at__date__range=(start_date, end_date),
        )
        challenge_participants_in_range = ChallengeParticipant.objects.filter(joined_at__date__range=(start_date, end_date))
        reminders_in_range = InAppReminder.objects.filter(created_at__date__range=(start_date, end_date))
        unread_reminders_in_range = reminders_in_range.filter(read_at__isnull=True)

        users_total = User.objects.count()
        users_active = User.objects.filter(is_active=True).count()
        users_staff = User.objects.filter(is_staff=True).count()

        users_last_7_days = User.objects.filter(date_joined__date__gte=today - timedelta(days=6)).count()
        users_last_30_days = User.objects.filter(date_joined__date__gte=today - timedelta(days=29)).count()
        users_in_selected_range = users_in_range.count()

        profiles_total = Profile.objects.count()
        profile_completion_rate = round((profiles_total / users_total) * 100, 1) if users_total else 0.0

        exercise_total = Exercise.objects.count()
        sessions_total = ExerciseSession.objects.count()
        completed_exercises_total = CompletedExercise.objects.count()
        sessions_in_selected_range = sessions_in_range.count()
        completed_exercises_in_selected_range = completed_in_range.count()

        sessions_last_7_days = ExerciseSession.objects.filter(date__gte=today - timedelta(days=6)).count()
        sessions_last_30_days = ExerciseSession.objects.filter(date__gte=today - timedelta(days=29)).count()

        journal_entries_total = JournalEntry.objects.count()
        mood_entries_total = MoodEntry.objects.count()
        avg_mood_last_30 = MoodEntry.objects.filter(date__gte=today - timedelta(days=29)).aggregate(avg=Avg('value'))['avg']
        avg_mood_selected = moods_in_range.aggregate(avg=Avg('value'))['avg']

        challenges_total = Challenge.objects.count()
        challenge_participants_total = ChallengeParticipant.objects.count()
        challenge_participants_completed = ChallengeParticipant.objects.filter(completed=True).count()
        challenge_completion_rate = round(
            (challenge_participants_completed / challenge_participants_total) * 100,
            1,
        ) if challenge_participants_total else 0.0
        challenge_participants_in_selected_range = challenge_participants_in_range.count()
        challenge_participants_completed_in_selected_range = challenge_completed_in_range.count()
        selected_challenge_completion_rate = round(
            (challenge_participants_completed_in_selected_range / challenge_participants_in_selected_range) * 100,
            1,
        ) if challenge_participants_in_selected_range else 0.0

        badges_total = UserBadge.objects.count()
        reminders_total = InAppReminder.objects.count()
        reminders_unread_total = InAppReminder.objects.filter(read_at__isnull=True).count()
        reminders_in_selected_range_count = reminders_in_range.count()
        reminders_unread_in_selected_range_count = unread_reminders_in_range.count()

        interest_distribution = {
            'sport': Profile.objects.filter(sport=True).count(),
            'food': Profile.objects.filter(food=True).count(),
            'mindset': Profile.objects.filter(mindset=True).count(),
            'growth': Profile.objects.filter(growth=True).count(),
            'challenges': Profile.objects.filter(challenges=True).count(),
        }

        fitness_goal_distribution = list(
            Profile.objects.values('fitness_goal').annotate(value=Count('id')).order_by('fitness_goal')
        )

        trend_days = min(60, max(7, (end_date - start_date).days + 1))
        trend_start = today - timedelta(days=trend_days - 1)

        user_growth_series = self._build_daily_series(
            User.objects.filter(date_joined__date__gte=trend_start),
            date_field='date_joined',
            days=trend_days,
            today=today,
        )

        session_series = self._build_daily_series(
            ExerciseSession.objects.filter(date__gte=trend_start),
            date_field='date',
            days=trend_days,
            today=today,
        )

        top_users = self._build_top_users(start_date, end_date, top_limit)
        alerts = self._build_alerts(
            users_total=users_total,
            users_in_selected_range=users_in_selected_range,
            sessions_in_selected_range=sessions_in_selected_range,
            profile_completion_rate=profile_completion_rate,
            challenge_completion_rate=selected_challenge_completion_rate,
            challenge_participants_in_selected_range=challenge_participants_in_selected_range,
            reminders_in_selected_range=reminders_in_selected_range_count,
            reminders_unread_in_selected_range=reminders_unread_in_selected_range_count,
            mood_entries_in_selected_range=moods_in_range.count(),
        )

        # persist new open alerts (dedup by type)
        self._persist_alerts(alerts)

        # period comparison
        comparison = self._build_comparison(
            prior_start=prior_start,
            prior_end=prior_end,
            users_in_range=users_in_selected_range,
            sessions_in_range=sessions_in_selected_range,
            journals_in_range=journals_in_range.count(),
            moods_in_range=moods_in_range.count(),
            completed_in_range=completed_exercises_in_selected_range,
            challenge_participants_in_range=challenge_participants_in_selected_range,
            challenge_completed_in_range=challenge_participants_completed_in_selected_range,
        )

        # cohort segmentation
        cohorts = self._build_cohorts(start_date, end_date)

        payload = {
            'summary': {
                'users_total': users_total,
                'users_active': users_active,
                'users_staff': users_staff,
                'users_last_7_days': users_last_7_days,
                'users_last_30_days': users_last_30_days,
                'users_in_selected_range': users_in_selected_range,
                'profiles_total': profiles_total,
                'profile_completion_rate': profile_completion_rate,
                'exercise_catalog_total': exercise_total,
                'exercise_sessions_total': sessions_total,
                'completed_exercises_total': completed_exercises_total,
                'sessions_last_7_days': sessions_last_7_days,
                'sessions_last_30_days': sessions_last_30_days,
                'sessions_in_selected_range': sessions_in_selected_range,
                'completed_exercises_in_selected_range': completed_exercises_in_selected_range,
                'journal_entries_total': journal_entries_total,
                'mood_entries_total': mood_entries_total,
                'mood_average_last_30_days': round(avg_mood_last_30, 2) if avg_mood_last_30 is not None else None,
                'journal_entries_in_selected_range': journals_in_range.count(),
                'mood_entries_in_selected_range': moods_in_range.count(),
                'mood_average_selected_range': round(avg_mood_selected, 2) if avg_mood_selected is not None else None,
                'challenges_total': challenges_total,
                'challenge_participants_total': challenge_participants_total,
                'challenge_participants_completed': challenge_participants_completed,
                'challenge_completion_rate': challenge_completion_rate,
                'challenge_participants_in_selected_range': challenge_participants_in_selected_range,
                'challenge_participants_completed_in_selected_range': challenge_participants_completed_in_selected_range,
                'challenge_completion_rate_selected_range': selected_challenge_completion_rate,
                'badges_total': badges_total,
                'reminders_total': reminders_total,
                'reminders_unread_total': reminders_unread_total,
                'reminders_in_selected_range': reminders_in_selected_range_count,
                'reminders_unread_in_selected_range': reminders_unread_in_selected_range_count,
            },
            'distributions': {
                'interests': interest_distribution,
                'fitness_goals': fitness_goal_distribution,
            },
            'trends': {
                'new_users': user_growth_series,
                'sessions': session_series,
            },
            'comparison': comparison,
            'cohorts': cohorts,
            'top_users': top_users,
            'alerts': alerts,
            'meta': {
                'range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': range_days,
                },
                'prior_range': {
                    'start': prior_start.isoformat(),
                    'end': prior_end.isoformat(),
                },
                'top_limit': top_limit,
                'trend_days': trend_days,
            },
            'generated_at': now.isoformat(),
        }
        return payload

    def _parse_date_range(self, request, today):
        start_raw = (request.query_params.get('start') or '').strip()
        end_raw = (request.query_params.get('end') or '').strip()

        if start_raw and end_raw:
            try:
                start_date = timezone.datetime.strptime(start_raw, '%Y-%m-%d').date()
                end_date = timezone.datetime.strptime(end_raw, '%Y-%m-%d').date()
            except ValueError:
                start_date, end_date = today - timedelta(days=29), today
        else:
            days = self._safe_int(request.query_params.get('days'), default=30, min_value=1, max_value=365)
            start_date, end_date = today - timedelta(days=days - 1), today

        if start_date > end_date:
            start_date, end_date = end_date, start_date

        if end_date > today:
            end_date = today
        if start_date > today:
            start_date = today

        # Cap the selected window to 365 days to avoid very heavy queries.
        if (end_date - start_date).days > 364:
            start_date = end_date - timedelta(days=364)

        return start_date, end_date

    def _parse_top_limit(self, request):
        return self._safe_int(request.query_params.get('top'), default=10, min_value=3, max_value=50)

    def _safe_int(self, value, default, min_value, max_value):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return default
        return max(min_value, min(max_value, parsed))

    def _build_top_users(self, start_date, end_date, top_limit):
        sessions_by_user = {
            row['user_id']: row
            for row in ExerciseSession.objects.filter(date__range=(start_date, end_date)).values('user_id').annotate(
                sessions=Count('id'),
                completed_exercises=Sum('completed_exercises'),
            )
        }
        challenges_by_user = {
            row['user_id']: row['challenges_completed']
            for row in ChallengeParticipant.objects.filter(
                completed=True,
                completed_at__date__range=(start_date, end_date),
            ).values('user_id').annotate(challenges_completed=Count('id'))
        }
        journal_by_user = {
            row['user_id']: row['journal_entries']
            for row in JournalEntry.objects.filter(created_at__date__range=(start_date, end_date)).values('user_id').annotate(
                journal_entries=Count('id')
            )
        }

        candidate_ids = set(sessions_by_user.keys()) | set(challenges_by_user.keys()) | set(journal_by_user.keys())
        if not candidate_ids:
            return []

        users = User.objects.filter(id__in=candidate_ids)
        by_id = {user.id: user for user in users}

        rows = []
        for user_id in candidate_ids:
            user = by_id.get(user_id)
            if not user:
                continue

            sessions = sessions_by_user.get(user_id, {}).get('sessions', 0)
            completed_exercises = sessions_by_user.get(user_id, {}).get('completed_exercises') or 0
            challenges_completed = challenges_by_user.get(user_id, 0)
            journal_entries = journal_by_user.get(user_id, 0)

            score = (sessions * 4) + completed_exercises + (challenges_completed * 10) + (journal_entries * 2)
            rows.append({
                'user_id': user.id,
                'username': user.username,
                'sessions': sessions,
                'completed_exercises': completed_exercises,
                'challenges_completed': challenges_completed,
                'journal_entries': journal_entries,
                'score': score,
            })

        rows.sort(key=lambda item: item['score'], reverse=True)
        return rows[:top_limit]

    def _build_alerts(
        self,
        users_total,
        users_in_selected_range,
        sessions_in_selected_range,
        profile_completion_rate,
        challenge_completion_rate,
        challenge_participants_in_selected_range,
        reminders_in_selected_range,
        reminders_unread_in_selected_range,
        mood_entries_in_selected_range,
    ):
        alerts = []

        if users_in_selected_range == 0:
            alerts.append({
                'severity': 'warning',
                'type': 'acquisition',
                'message': 'No hubo altas de usuarios en el rango seleccionado.',
            })

        if sessions_in_selected_range == 0:
            alerts.append({
                'severity': 'critical',
                'type': 'engagement',
                'message': 'No se registraron sesiones de ejercicio en el rango seleccionado.',
            })

        if users_total >= 5 and profile_completion_rate < 60:
            alerts.append({
                'severity': 'warning',
                'type': 'onboarding',
                'message': 'El porcentaje de perfiles completados está por debajo del 60%.',
            })

        if challenge_participants_in_selected_range >= 10 and challenge_completion_rate < 25:
            alerts.append({
                'severity': 'warning',
                'type': 'challenge_quality',
                'message': 'La tasa de finalización de challenges está por debajo del 25% en el rango.',
            })

        if reminders_in_selected_range > 0:
            unread_ratio = reminders_unread_in_selected_range / reminders_in_selected_range
            if unread_ratio > 0.5:
                alerts.append({
                    'severity': 'info',
                    'type': 'notifications',
                    'message': 'Más del 50% de los reminders del rango siguen sin leer.',
                })

        if mood_entries_in_selected_range == 0:
            alerts.append({
                'severity': 'info',
                'type': 'mindset',
                'message': 'No hay registros de mood en el rango seleccionado.',
            })

        return alerts

    # ── alert persistence ────────────────────────────────────────────────

    def _persist_alerts(self, alerts):
        """Create DB records for new alerts, deduplicating by open type."""
        open_types = set(
            AdminPanelAlert.objects.filter(status='open').values_list('type', flat=True)
        )
        for alert in alerts:
            if alert['type'] not in open_types:
                AdminPanelAlert.objects.create(
                    type=alert['type'],
                    severity=alert['severity'],
                    message=alert['message'],
                )

    # ── period comparison ────────────────────────────────────────────────

    def _build_comparison(
        self,
        prior_start,
        prior_end,
        users_in_range,
        sessions_in_range,
        journals_in_range,
        moods_in_range,
        completed_in_range,
        challenge_participants_in_range,
        challenge_completed_in_range,
    ):
        prior_users = User.objects.filter(date_joined__date__range=(prior_start, prior_end)).count()
        prior_sessions = ExerciseSession.objects.filter(date__range=(prior_start, prior_end)).count()
        prior_journals = JournalEntry.objects.filter(
            created_at__date__range=(prior_start, prior_end)
        ).count()
        prior_moods = MoodEntry.objects.filter(date__range=(prior_start, prior_end)).count()
        prior_completed = CompletedExercise.objects.filter(
            completed_at__date__range=(prior_start, prior_end)
        ).count()
        prior_challenge_participants = ChallengeParticipant.objects.filter(
            joined_at__date__range=(prior_start, prior_end)
        ).count()
        prior_challenge_completed = ChallengeParticipant.objects.filter(
            completed=True, completed_at__date__range=(prior_start, prior_end)
        ).count()

        def delta(current, previous):
            if previous == 0:
                if current == 0:
                    return 0.0
                return 100.0
            return round((current - previous) / previous * 100, 1)

        return {
            'current': {
                'new_users': users_in_range,
                'sessions': sessions_in_range,
                'journal_entries': journals_in_range,
                'mood_entries': moods_in_range,
                'completed_exercises': completed_in_range,
                'challenge_participants': challenge_participants_in_range,
                'challenges_completed': challenge_completed_in_range,
            },
            'previous': {
                'new_users': prior_users,
                'sessions': prior_sessions,
                'journal_entries': prior_journals,
                'mood_entries': prior_moods,
                'completed_exercises': prior_completed,
                'challenge_participants': prior_challenge_participants,
                'challenges_completed': prior_challenge_completed,
            },
            'delta_pct': {
                'new_users': delta(users_in_range, prior_users),
                'sessions': delta(sessions_in_range, prior_sessions),
                'journal_entries': delta(journals_in_range, prior_journals),
                'mood_entries': delta(moods_in_range, prior_moods),
                'completed_exercises': delta(completed_in_range, prior_completed),
                'challenge_participants': delta(challenge_participants_in_range, prior_challenge_participants),
                'challenges_completed': delta(challenge_completed_in_range, prior_challenge_completed),
            },
        }

    # ── cohort segmentation ──────────────────────────────────────────────

    def _build_cohorts(self, start_date, end_date):
        new_user_ids = set(
            User.objects.filter(date_joined__date__range=(start_date, end_date)).values_list('id', flat=True)
        )
        active_user_ids = (
            set(ExerciseSession.objects.filter(date__range=(start_date, end_date)).values_list('user_id', flat=True))
            | set(JournalEntry.objects.filter(
                created_at__date__range=(start_date, end_date)
            ).values_list('user_id', flat=True))
            | set(MoodEntry.objects.filter(date__range=(start_date, end_date)).values_list('user_id', flat=True))
        )
        returning_user_ids = active_user_ids - new_user_ids

        def cohort_metrics(user_ids):
            if not user_ids:
                return {'count': 0, 'sessions': 0, 'journal_entries': 0, 'mood_entries': 0}
            sessions = ExerciseSession.objects.filter(
                user_id__in=user_ids, date__range=(start_date, end_date)
            ).count()
            journals = JournalEntry.objects.filter(
                user_id__in=user_ids, created_at__date__range=(start_date, end_date)
            ).count()
            moods = MoodEntry.objects.filter(
                user_id__in=user_ids, date__range=(start_date, end_date)
            ).count()
            return {'count': len(user_ids), 'sessions': sessions, 'journal_entries': journals, 'mood_entries': moods}

        def interest_breakdown(user_ids):
            if not user_ids:
                return {k: 0 for k in ('sport', 'food', 'mindset', 'growth', 'challenges')}
            profiles = Profile.objects.filter(user_id__in=user_ids)
            return {
                'sport': profiles.filter(sport=True).count(),
                'food': profiles.filter(food=True).count(),
                'mindset': profiles.filter(mindset=True).count(),
                'growth': profiles.filter(growth=True).count(),
                'challenges': profiles.filter(challenges=True).count(),
            }

        all_active_ids = new_user_ids | returning_user_ids

        return {
            'new': {**cohort_metrics(new_user_ids), 'interests': interest_breakdown(new_user_ids)},
            'returning': {**cohort_metrics(returning_user_ids), 'interests': interest_breakdown(returning_user_ids)},
            'summary': {
                'total_active': len(all_active_ids),
                'new_count': len(new_user_ids),
                'returning_count': len(returning_user_ids),
                'by_interest': interest_breakdown(all_active_ids),
            },
        }

    def _build_daily_series(self, queryset, date_field, days, today):
        values_by_day = {}
        for raw_day in queryset.values_list(date_field, flat=True):
            day = raw_day.date() if hasattr(raw_day, 'date') else raw_day
            values_by_day[day] = values_by_day.get(day, 0) + 1

        series = []
        for offset in range(days - 1, -1, -1):
            day = today - timedelta(days=offset)
            series.append({'day': day.isoformat(), 'value': values_by_day.get(day, 0)})
        return series


class AdminStatsExportCsvView(AdminStatsView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        payload = self._build_stats_payload(request)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="zero_admin_stats.csv"'
        writer = csv.writer(response)

        writer.writerow(['section', 'metric', 'value'])
        for key, value in payload['summary'].items():
            writer.writerow(['summary', key, value])

        for key, value in payload['distributions']['interests'].items():
            writer.writerow(['interests', key, value])

        for row in payload['distributions']['fitness_goals']:
            writer.writerow(['fitness_goals', row['fitness_goal'], row['value']])

        for idx, row in enumerate(payload['top_users'], start=1):
            writer.writerow(['top_users', f'#{idx} {row["username"]}', row['score']])

        for alert in payload['alerts']:
            writer.writerow(['alerts', f"{alert['severity']}:{alert['type']}", alert['message']])

        return response


class AdminAlertListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get('status', '')
        qs = AdminPanelAlert.objects.all()
        if status_filter in ('open', 'resolved'):
            qs = qs.filter(status=status_filter)

        data = [
            {
                'id': a.id,
                'type': a.type,
                'severity': a.severity,
                'message': a.message,
                'status': a.status,
                'created_at': a.created_at.isoformat(),
                'resolved_at': a.resolved_at.isoformat() if a.resolved_at else None,
            }
            for a in qs
        ]
        return success_response({'alerts': data, 'total': len(data)})


class AdminAlertResolveView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        from rest_framework.response import Response
        from rest_framework import status as drf_status

        try:
            alert = AdminPanelAlert.objects.get(pk=pk)
        except AdminPanelAlert.DoesNotExist:
            return Response(
                {'ok': False, 'message': 'Alerta no encontrada.'},
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        if alert.status == 'resolved':
            return success_response({'message': 'La alerta ya estaba resuelta.', 'id': alert.id})

        alert.resolve()
        return success_response({
            'message': 'Alerta marcada como resuelta.',
            'id': alert.id,
            'resolved_at': alert.resolved_at.isoformat(),
        })


class AdminAlertReopenView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        from rest_framework.response import Response
        from rest_framework import status as drf_status

        try:
            alert = AdminPanelAlert.objects.get(pk=pk)
        except AdminPanelAlert.DoesNotExist:
            return Response(
                {'ok': False, 'message': 'Alerta no encontrada.'},
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        if alert.status == 'open':
            return success_response({'message': 'La alerta ya estaba abierta.', 'id': alert.id})

        alert.reopen()
        return success_response({
            'message': 'Alerta reabierta.',
            'id': alert.id,
            'status': alert.status,
            'resolved_at': None,
        })


__all__ = [
    'AdminAccessView',
    'AdminStatsView',
    'AdminStatsExportCsvView',
    'AdminAlertListView',
    'AdminAlertResolveView',
    'AdminAlertReopenView',
]
