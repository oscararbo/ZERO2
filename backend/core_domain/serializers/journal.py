from rest_framework import serializers

from ..models import JournalEntry, MoodEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for the JournalEntry model.
    Handles journal entries for user mindset tracking.
    """

    class Meta:
        model = JournalEntry
        fields = (
            'id',
            'content',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class MoodEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodEntry
        fields = (
            'id',
            'date',
            'value',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
