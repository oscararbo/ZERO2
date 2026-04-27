from rest_framework import serializers

from ..models import Challenge, ChallengeParticipant, ChallengeUpdate, InAppReminder, UserBadge


class ChallengeParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ChallengeParticipant
        fields = (
            'id',
            'username',
            'joined_at',
            'progress',
            'completed',
            'completed_at',
            'notes',
        )
        read_only_fields = ('id', 'username', 'joined_at', 'completed_at')


class ChallengeUpdateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ChallengeUpdate
        fields = (
            'id',
            'username',
            'content',
            'created_at',
        )
        read_only_fields = ('id', 'username', 'created_at')


class UserBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserBadge
        fields = (
            'id',
            'code',
            'title',
            'description',
            'awarded_at',
        )
        read_only_fields = ('id', 'code', 'title', 'description', 'awarded_at')


class InAppReminderSerializer(serializers.ModelSerializer):
    is_read = serializers.ReadOnlyField()
    challenge_title = serializers.CharField(source='challenge.title', read_only=True)

    class Meta:
        model = InAppReminder
        fields = (
            'id',
            'type',
            'message',
            'metadata',
            'challenge',
            'challenge_title',
            'created_at',
            'read_at',
            'is_read',
        )
        read_only_fields = ('id', 'created_at', 'read_at', 'is_read', 'challenge_title')


class ChallengeSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    participant_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    deadline_at = serializers.ReadOnlyField()
    days_left = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    my_participation = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            'id',
            'title',
            'description',
            'category',
            'duration_days',
            'target_count',
            'creator_username',
            'participant_count',
            'completed_count',
            'deadline_at',
            'days_left',
            'is_expired',
            'created_at',
            'my_participation',
        )
        read_only_fields = (
            'id',
            'creator_username',
            'participant_count',
            'completed_count',
            'deadline_at',
            'days_left',
            'is_expired',
            'created_at',
        )

    def get_my_participation(self, obj):
        participation_by_challenge = self.context.get('my_participation_by_challenge')
        if participation_by_challenge is not None:
            return participation_by_challenge.get(obj.id)

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        participation = obj.participants.filter(user=request.user).first()
        if participation:
            return ChallengeParticipantSerializer(participation).data
        return None

    def get_participant_count(self, obj):
        if hasattr(obj, 'participant_count_annotated'):
            return obj.participant_count_annotated
        return obj.participant_count

    def get_completed_count(self, obj):
        if hasattr(obj, 'completed_count_annotated'):
            return obj.completed_count_annotated
        return obj.completed_count
