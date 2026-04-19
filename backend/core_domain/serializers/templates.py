from rest_framework import serializers

from ..models import UserTemplateVersion


class UserTemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTemplateVersion
        fields = (
            'id',
            'kind',
            'template_key',
            'title',
            'payload',
            'version',
            'is_active',
            'created_at',
        )
        read_only_fields = ('id', 'version', 'created_at')
