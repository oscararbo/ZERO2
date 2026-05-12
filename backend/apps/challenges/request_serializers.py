from rest_framework import serializers


class ChallengeProgressUpdateRequestSerializer(serializers.Serializer):
    progress = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=100,
        error_messages={'invalid': 'progress debe ser un numero entero entre 0 y 100.'},
    )
    delta = serializers.IntegerField(
        required=False,
        min_value=-100,
        max_value=100,
        error_messages={'invalid': 'delta debe ser un numero entero entre -100 y 100.'},
    )
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if 'progress' not in attrs and 'delta' not in attrs and 'notes' not in attrs:
            raise serializers.ValidationError('Debes enviar al menos progress, delta o notes.')
        return attrs
