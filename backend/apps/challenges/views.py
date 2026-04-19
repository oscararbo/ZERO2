from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api.responses import error_response, success_response
from core_domain.models import Challenge, ChallengeParticipant, ChallengeUpdate, InAppReminder, UserBadge
from core_domain.serializers import (
    ChallengeParticipantSerializer,
    ChallengeSerializer,
    ChallengeUpdateSerializer,
    InAppReminderSerializer,
    UserBadgeSerializer,
)
from common.api.pagination import paginated_response, parse_pagination

from .request_serializers import ChallengeProgressUpdateRequestSerializer
from .services import award_badges_for_user, build_challenge_analytics, create_progress_reminders_for_user


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
        return success_response(serializer.data)

    def post(self, request):
        serializer = ChallengeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(creator=request.user)
        return success_response(serializer.data, status_code=status.HTTP_201_CREATED)


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
            return error_response('Challenge not found.', status_code=status.HTTP_404_NOT_FOUND)

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
        return success_response(serializer.data)

    def delete(self, request, challenge_id):
        challenge = self.get_object(challenge_id)
        if not challenge:
            return error_response('Challenge not found.', status_code=status.HTTP_404_NOT_FOUND)
        if challenge.creator != request.user:
            return error_response('Only the creator can delete this challenge.', status_code=status.HTTP_403_FORBIDDEN)

        challenge.delete()
        return success_response({'detail': 'Challenge deleted.'})


class ChallengeJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            return error_response('Challenge not found.', status_code=status.HTTP_404_NOT_FOUND)

        if challenge.creator == request.user:
            return error_response('You cannot join your own challenge.', status_code=status.HTTP_400_BAD_REQUEST)

        participant, created = ChallengeParticipant.objects.get_or_create(
            challenge=challenge,
            user=request.user,
        )
        award_badges_for_user(request.user)
        serializer = ChallengeParticipantSerializer(participant)
        return success_response(serializer.data, status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, challenge_id):
        try:
            participant = ChallengeParticipant.objects.get(challenge_id=challenge_id, user=request.user)
        except ChallengeParticipant.DoesNotExist:
            return error_response('Not participating in this challenge.', status_code=status.HTTP_404_NOT_FOUND)

        participant.delete()
        return success_response({'detail': 'Left challenge.'})


class ChallengeProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, challenge_id):
        try:
            participant = ChallengeParticipant.objects.get(challenge_id=challenge_id, user=request.user)
        except ChallengeParticipant.DoesNotExist:
            return error_response('You are not participating in this challenge.', status_code=status.HTTP_404_NOT_FOUND)

        request_serializer = ChallengeProgressUpdateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        progress = request_serializer.validated_data.get('progress')
        notes = request_serializer.validated_data.get('notes', participant.notes)

        if progress is not None:
            participant.progress = progress
            if progress >= 100 and not participant.completed:
                participant.completed = True
                participant.completed_at = timezone.now()

        participant.notes = notes
        participant.save()
        award_badges_for_user(request.user)

        serializer = ChallengeParticipantSerializer(participant)
        return success_response(serializer.data)


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
        return success_response(payload)


class ChallengeUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, challenge_id):
        page, page_size, offset = parse_pagination(request, default_page_size=8, max_page_size=25)
        updates = ChallengeUpdate.objects.filter(challenge_id=challenge_id).select_related('user')
        payload = paginated_response(updates, ChallengeUpdateSerializer, page, page_size, offset)
        return success_response(payload)

    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            return error_response('Challenge not found.', status_code=status.HTTP_404_NOT_FOUND)

        is_creator = challenge.creator_id == request.user.id
        is_participant = ChallengeParticipant.objects.filter(challenge=challenge, user=request.user).exists()
        if not is_creator and not is_participant:
            return error_response('Join this challenge before posting updates.', status_code=status.HTTP_403_FORBIDDEN)

        serializer = ChallengeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

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
        return success_response(response_serializer.data, status_code=status.HTTP_201_CREATED)


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
        return success_response(payload)


class ReminderReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reminder_id):
        try:
            reminder = InAppReminder.objects.get(id=reminder_id, user=request.user)
        except InAppReminder.DoesNotExist:
            return error_response('Reminder not found.', status_code=status.HTTP_404_NOT_FOUND)

        if reminder.read_at is None:
            reminder.read_at = timezone.now()
            reminder.save(update_fields=['read_at'])

        serializer = InAppReminderSerializer(reminder)
        return success_response(serializer.data)


class ReminderReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        InAppReminder.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return success_response({'detail': 'All reminders marked as read.'})


class BadgeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        award_badges_for_user(request.user)
        badges = UserBadge.objects.filter(user=request.user)
        serializer = UserBadgeSerializer(badges, many=True)
        return success_response(serializer.data)


class ChallengeAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = build_challenge_analytics(request.user)
        return success_response(payload)

__all__ = [
    'ChallengeListView',
    'ChallengeDetailView',
    'ChallengeJoinView',
    'ChallengeProgressView',
    'ChallengeLeaderboardView',
    'ChallengeUpdateView',
    'ChallengeAnalyticsView',
    'ReminderListView',
    'ReminderReadView',
    'ReminderReadAllView',
    'BadgeListView',
]
