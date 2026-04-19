from rest_framework import serializers


class MoodListQuerySerializer(serializers.Serializer):
    days = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=90,
        default=14,
        error_messages={'invalid': 'days debe ser un numero entero entre 1 y 90.'},
    )


class MoodEntryCreateRequestSerializer(serializers.Serializer):
    value = serializers.IntegerField(
        min_value=1,
        max_value=5,
        error_messages={'required': 'value es obligatorio.', 'invalid': 'value debe ser un numero entero entre 1 y 5.'},
    )
    date = serializers.DateField(required=False)


class TemplateListQuerySerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=['challenge', 'growth'],
        error_messages={'required': 'kind es obligatorio.', 'invalid_choice': 'kind debe ser challenge o growth.'},
    )


class TemplateCreateRequestSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=['challenge', 'growth'],
        error_messages={'required': 'kind es obligatorio.', 'invalid_choice': 'kind debe ser challenge o growth.'},
    )
    title = serializers.CharField(
        max_length=255,
        error_messages={'required': 'title es obligatorio.', 'blank': 'title no puede estar vacio.'},
    )
    payload = serializers.DictField(error_messages={'invalid': 'payload debe ser un objeto JSON valido.'})
    template_key = serializers.CharField(required=False, allow_blank=True, max_length=80)
