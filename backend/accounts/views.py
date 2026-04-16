from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count, Q

from .models import (
    Profile,
    Exercise,
    ExerciseSession,
    CompletedExercise,
    JournalEntry,
    Challenge,
    ChallengeParticipant,
    ChallengeUpdate,
    UserBadge,
    InAppReminder,
)
from .serializers import (
    ProfileSerializer,
    ExerciseSerializer,
    ExerciseSessionSerializer,
    ExerciseSessionDetailSerializer,
    CompletedExerciseSerializer,
    JournalEntrySerializer,
    ChallengeSerializer,
    ChallengeParticipantSerializer,
    ChallengeUpdateSerializer,
    UserBadgeSerializer,
    InAppReminderSerializer,
)


def parse_pagination(request, default_page_size=20, max_page_size=50):
    try:
        page = int(request.query_params.get('page', 1))
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get('page_size', default_page_size))
    except (TypeError, ValueError):
        page_size = default_page_size

    page = max(1, page)
    page_size = max(1, min(page_size, max_page_size))
    offset = (page - 1) * page_size
    return page, page_size, offset


def paginated_response(queryset, serializer_cls, page, page_size, offset, serializer_kwargs=None, extra=None):
    total = queryset.count()
    items_qs = queryset[offset: offset + page_size]
    kwargs = serializer_kwargs or {}
    serializer = serializer_cls(items_qs, many=True, **kwargs)
    payload = {
        'items': serializer.data,
        'page': page,
        'page_size': page_size,
        'total': total,
        'has_next': (offset + page_size) < total,
    }
    if extra:
        payload.update(extra)
    return payload


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


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'detail': 'El usuario y la contraseña son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'detail': 'El usuario ya existe.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        Profile.objects.create(user=user, full_name=username)

        return Response({'id': user.id, 'username': user.username}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'detail': 'Usuario o contraseña inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh)},
            status=status.HTTP_200_OK
        )


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        s = ProfileSerializer(profile, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        s.save()
        return Response(s.data, status=status.HTTP_200_OK)

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        s = ProfileSerializer(profile, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        s.save()
        return Response(s.data, status=status.HTTP_200_OK)


class ExerciseView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        location = request.query_params.get('location', None)
        category = request.query_params.get('category', None)

        exercises = Exercise.objects.all()

        if location:
            exercises = exercises.filter(location=location)
        if category:
            exercises = exercises.filter(category=category)

        serializer = ExerciseSerializer(exercises, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExerciseSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        location = request.query_params.get('location', None)

        sessions = ExerciseSession.objects.filter(user=request.user)

        if location:
            sessions = sessions.filter(location=location)

        sessions = sessions[:7]

        serializer = ExerciseSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        location = request.data.get('location')
        exercises = request.data.get('exercises', [])

        if not location:
            return Response({'detail': 'La ubicación (location) es requerida.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        session, created = ExerciseSession.objects.get_or_create(
            user=request.user,
            date=today,
            location=location,
        )

        for exercise_data in exercises:
            exercise_id = exercise_data.get('exercise_id')
            sets_completed = exercise_data.get('sets_completed', 0)
            reps_per_set = exercise_data.get('reps_per_set', 0)
            notes = exercise_data.get('notes', '')

            try:
                exercise = Exercise.objects.get(id=exercise_id)
                CompletedExercise.objects.update_or_create(
                    session=session,
                    exercise=exercise,
                    defaults={
                        'sets_completed': sets_completed,
                        'reps_per_set': reps_per_set,
                        'notes': notes,
                    }
                )
            except Exercise.DoesNotExist:
                pass

        session.completed_exercises = session.exercises.count()
        session.save()

        serializer = ExerciseSessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExerciseSessionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
            serializer = ExerciseSessionDetailSerializer(session)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ExerciseSession.DoesNotExist:
            return Response({'detail': 'La sesión no fue encontrada.'}, status=status.HTTP_404_NOT_FOUND)


class CompletedExerciseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        exercise_id = request.data.get('exercise_id')
        sets_completed = request.data.get('sets_completed', 0)
        reps_per_set = request.data.get('reps_per_set', 0)

        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
            exercise = Exercise.objects.get(id=exercise_id)

            completed, created = CompletedExercise.objects.update_or_create(
                session=session,
                exercise=exercise,
                defaults={
                    'sets_completed': sets_completed,
                    'reps_per_set': reps_per_set,
                }
            )

            session.completed_exercises = session.exercises.count()
            session.save()

            serializer = CompletedExerciseSerializer(completed)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except (ExerciseSession.DoesNotExist, Exercise.DoesNotExist):
            return Response({'detail': 'La sesión o el ejercicio no fueron encontrados.'}, status=status.HTTP_404_NOT_FOUND)


class MainMenuExerciseView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, location):
        categories = [
            {'key': 'back', 'label': 'Back'},
            {'key': 'chest', 'label': 'Chest'},
            {'key': 'legs', 'label': 'Legs'},
            {'key': 'arms', 'label': 'Arms'},
            {'key': 'shoulders', 'label': 'Shoulders'},
            {'key': 'accessories', 'label': 'Accessories'},
        ]

        goal = request.query_params.get('goal', None)

        result = {}
        for cat_info in categories:
            exercises_query = Exercise.objects.filter(
                location=location,
                category=cat_info['key']
            )

            if goal:
                exercises_query = exercises_query.filter(goal__in=[goal, 'both'])

            result[cat_info['key']] = {
                'label': cat_info['label'],
                'exercises': ExerciseSerializer(exercises_query, many=True).data
            }

        return Response(result, status=status.HTTP_200_OK)


class ProgressStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location = request.query_params.get('location', None)
        days_back = 7

        dates = []
        counts = []

        for i in range(days_back):
            date = timezone.now().date() - timedelta(days=(days_back - 1 - i))
            dates.append(date.strftime('%a'))

            sessions = ExerciseSession.objects.filter(
                user=request.user,
                date=date
            )

            if location:
                sessions = sessions.filter(location=location)

            count = sum(s.completed_exercises for s in sessions)
            counts.append(count)

        return Response({
            'labels': dates,
            'values': counts
        }, status=status.HTTP_200_OK)


class JournalEntryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get all journal entries for the authenticated user."""
        entries = JournalEntry.objects.filter(user=request.user)
        serializer = JournalEntrySerializer(entries, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new journal entry for the authenticated user."""
        serializer = JournalEntrySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JournalEntryDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, entry_id, user):
        """Get journal entry by ID for the authenticated user."""
        try:
            return JournalEntry.objects.get(id=entry_id, user=user)
        except JournalEntry.DoesNotExist:
            return None

    def get(self, request, entry_id):
        """Get a specific journal entry."""
        entry = self.get_object(entry_id, request.user)
        if not entry:
            return Response({'detail': 'Journal entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = JournalEntrySerializer(entry)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, entry_id):
        """Update a specific journal entry."""
        entry = self.get_object(entry_id, request.user)
        if not entry:
            return Response({'detail': 'Journal entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = JournalEntrySerializer(entry, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, entry_id):
        """Delete a specific journal entry."""
        entry = self.get_object(entry_id, request.user)
        if not entry:
            return Response({'detail': 'Journal entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        entry.delete()
        return Response({'detail': 'Journal entry deleted.'}, status=status.HTTP_204_NO_CONTENT)


class ChallengeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        create_progress_reminders_for_user(request.user)
        category = request.query_params.get('category', None)
        mine = request.query_params.get('mine', None)

        challenges = Challenge.objects.select_related('creator').annotate(
            participant_count_annotated=Count('participants', distinct=True),
            completed_count_annotated=Count('participants', filter=Q(participants__completed=True), distinct=True),
        )
        if category:
            challenges = challenges.filter(category=category)
        if mine == 'true':
            challenges = challenges.filter(creator=request.user)

        my_participation = ChallengeParticipant.objects.filter(
            user=request.user,
            challenge__in=challenges,
        ).select_related('user')
        my_participation_by_challenge = {
            row.challenge_id: ChallengeParticipantSerializer(row).data for row in my_participation
        }

        serializer = ChallengeSerializer(
            challenges,
            many=True,
            context={
                'request': request,
                'my_participation_by_challenge': my_participation_by_challenge,
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ChallengeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(creator=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChallengeDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, challenge_id):
        try:
            return Challenge.objects.select_related('creator').get(id=challenge_id)
        except Challenge.DoesNotExist:
            return None

    def get(self, request, challenge_id):
        challenge = self.get_object(challenge_id)
        if not challenge:
            return Response({'detail': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)
        my_participation = ChallengeParticipant.objects.filter(
            challenge_id=challenge_id,
            user=request.user,
        ).select_related('user').first()
        my_participation_by_challenge = {}
        if my_participation:
            my_participation_by_challenge[challenge_id] = ChallengeParticipantSerializer(my_participation).data

        serializer = ChallengeSerializer(
            challenge,
            context={'request': request, 'my_participation_by_challenge': my_participation_by_challenge},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, challenge_id):
        challenge = self.get_object(challenge_id)
        if not challenge:
            return Response({'detail': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)
        if challenge.creator != request.user:
            return Response({'detail': 'Only the creator can delete this challenge.'}, status=status.HTTP_403_FORBIDDEN)
        challenge.delete()
        return Response({'detail': 'Challenge deleted.'}, status=status.HTTP_204_NO_CONTENT)


class ChallengeJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)

        if challenge.creator == request.user:
            return Response({'detail': 'You cannot join your own challenge.'}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = ChallengeParticipant.objects.get_or_create(
            challenge=challenge,
            user=request.user,
        )
        award_badges_for_user(request.user)
        serializer = ChallengeParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, challenge_id):
        try:
            participant = ChallengeParticipant.objects.get(challenge_id=challenge_id, user=request.user)
            participant.delete()
            return Response({'detail': 'Left challenge.'}, status=status.HTTP_204_NO_CONTENT)
        except ChallengeParticipant.DoesNotExist:
            return Response({'detail': 'Not participating in this challenge.'}, status=status.HTTP_404_NOT_FOUND)


class ChallengeProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, challenge_id):
        try:
            participant = ChallengeParticipant.objects.get(challenge_id=challenge_id, user=request.user)
        except ChallengeParticipant.DoesNotExist:
            return Response({'detail': 'You are not participating in this challenge.'}, status=status.HTTP_404_NOT_FOUND)

        progress = request.data.get('progress')
        notes = request.data.get('notes', participant.notes)

        if progress is not None:
            progress = max(0, min(100, int(progress)))
            participant.progress = progress
            if progress >= 100 and not participant.completed:
                participant.completed = True
                participant.completed_at = timezone.now()

        participant.notes = notes
        participant.save()
        award_badges_for_user(request.user)

        serializer = ChallengeParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChallengeLeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, challenge_id):
        page, page_size, offset = parse_pagination(request, default_page_size=10, max_page_size=40)
        participants = ChallengeParticipant.objects.filter(challenge_id=challenge_id).select_related('user').order_by(
            '-completed',
            '-progress',
            'completed_at',
            'joined_at',
        )
        payload = paginated_response(participants, ChallengeParticipantSerializer, page, page_size, offset)
        return Response(payload, status=status.HTTP_200_OK)


class ChallengeUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, challenge_id):
        page, page_size, offset = parse_pagination(request, default_page_size=8, max_page_size=25)
        updates = ChallengeUpdate.objects.filter(challenge_id=challenge_id).select_related('user')
        payload = paginated_response(updates, ChallengeUpdateSerializer, page, page_size, offset)
        return Response(payload, status=status.HTTP_200_OK)

    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_creator = challenge.creator_id == request.user.id
        is_participant = ChallengeParticipant.objects.filter(challenge=challenge, user=request.user).exists()
        if not is_creator and not is_participant:
            return Response({'detail': 'Join this challenge before posting updates.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ChallengeUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        update = serializer.save(user=request.user, challenge=challenge)

        target_user_ids = ChallengeParticipant.objects.filter(challenge=challenge).exclude(user=request.user).values_list('user_id', flat=True)
        for user_id in target_user_ids:
            InAppReminder.objects.create(
                user_id=user_id,
                challenge=challenge,
                type='update',
                message=f"New update in '{challenge.title}' from {request.user.username}.",
                metadata={'challenge_id': challenge.id, 'update_id': update.id},
            )

        response_serializer = ChallengeUpdateSerializer(update)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ReminderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_only = request.query_params.get('unread') == 'true'
        page, page_size, offset = parse_pagination(request, default_page_size=12, max_page_size=30)
        reminders = InAppReminder.objects.filter(user=request.user).select_related('challenge')
        if unread_only:
            reminders = reminders.filter(read_at__isnull=True)
        unread_count = InAppReminder.objects.filter(user=request.user, read_at__isnull=True).count()
        payload = paginated_response(
            reminders,
            InAppReminderSerializer,
            page,
            page_size,
            offset,
            extra={'unread_count': unread_count},
        )
        return Response(payload, status=status.HTTP_200_OK)


class ReminderReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reminder_id):
        try:
            reminder = InAppReminder.objects.get(id=reminder_id, user=request.user)
        except InAppReminder.DoesNotExist:
            return Response({'detail': 'Reminder not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reminder.read_at is None:
            reminder.read_at = timezone.now()
            reminder.save(update_fields=['read_at'])
        serializer = InAppReminderSerializer(reminder)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReminderReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        InAppReminder.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({'detail': 'All reminders marked as read.'}, status=status.HTTP_200_OK)


class BadgeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        award_badges_for_user(request.user)
        badges = UserBadge.objects.filter(user=request.user)
        serializer = UserBadgeSerializer(badges, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChallengeAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        participations = ChallengeParticipant.objects.filter(user=request.user)

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
            by_category.append({
                'category': category,
                'joined': joined,
                'completed': done,
                'completion_rate': completion_rate,
            })

        return Response({
            'total_joined': total,
            'total_completed': completed,
            'completion_rate': round((completed / total) * 100, 1) if total else 0,
            'average_progress': avg_progress,
            'by_category': by_category,
        }, status=status.HTTP_200_OK)

