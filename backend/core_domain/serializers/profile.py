from rest_framework import serializers

from ..models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the Profile model.
    Converts between Profile model instances and JSON representation.
    """

    class Meta:
        model = Profile
        fields = (
            'full_name',
            'weekly_goal',
            'fitness_goal',
            'weight',
            'height',
            'macro_calories_target',
            'macro_protein_target',
            'macro_carbs_target',
            'macro_fat_target',
            'sport',
            'food',
            'mindset',
            'growth',
            'challenges',
        )
