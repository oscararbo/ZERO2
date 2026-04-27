from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api.responses import error_response, success_response
from core_domain.models import JournalEntry, UserTemplateVersion
from core_domain.serializers import JournalEntrySerializer, MoodEntrySerializer, UserTemplateVersionSerializer

from .request_serializers import (
    MoodEntryCreateRequestSerializer,
    MoodListQuerySerializer,
    TemplateCreateRequestSerializer,
    TemplateListQuerySerializer,
)
from .services import create_template_version, get_latest_template_versions, get_mood_entries, upsert_mood_entry


class JournalEntryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user).order_by('-created_at')
        serializer = JournalEntrySerializer(entries, many=True)
        return success_response(serializer.data)

    def post(self, request):
        serializer = JournalEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return success_response(serializer.data, status_code=status.HTTP_201_CREATED)


class JournalEntryDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, entry_id, user):
        try:
            return JournalEntry.objects.get(id=entry_id, user=user)
        except JournalEntry.DoesNotExist:
            return None

    def get(self, request, entry_id):
        entry = self.get_object(entry_id, request.user)
        if not entry:
            return error_response('Journal entry not found.', status_code=status.HTTP_404_NOT_FOUND)

        serializer = JournalEntrySerializer(entry)
        return success_response(serializer.data)

    def put(self, request, entry_id):
        entry = self.get_object(entry_id, request.user)
        if not entry:
            return error_response('Journal entry not found.', status_code=status.HTTP_404_NOT_FOUND)

        serializer = JournalEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data)

    def delete(self, request, entry_id):
        entry = self.get_object(entry_id, request.user)
        if not entry:
            return error_response('Journal entry not found.', status_code=status.HTTP_404_NOT_FOUND)

        entry.delete()
        return success_response({'detail': 'Journal entry deleted.'})


class MoodEntryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        request_serializer = MoodListQuerySerializer(data=request.query_params)
        request_serializer.is_valid(raise_exception=True)

        days = request_serializer.validated_data['days']

        entries = get_mood_entries(request.user, days=days)
        serializer = MoodEntrySerializer(entries, many=True)
        return success_response(serializer.data)

    def post(self, request):
        request_serializer = MoodEntryCreateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        result = upsert_mood_entry(
            request.user,
            request_serializer.validated_data['value'],
            date_text=request_serializer.validated_data.get('date'),
        )
        if not result.ok:
            return error_response(result.error, status_code=result.code)

        serializer = MoodEntrySerializer(result.data)
        return success_response(serializer.data, status_code=result.code)


class UserTemplateListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        request_serializer = TemplateListQuerySerializer(data=request.query_params)
        request_serializer.is_valid(raise_exception=True)

        kind = request_serializer.validated_data['kind']

        serializer = UserTemplateVersionSerializer(get_latest_template_versions(request.user, kind), many=True)
        return success_response(serializer.data)

    def post(self, request):
        request_serializer = TemplateCreateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        kind = request_serializer.validated_data['kind']
        title = request_serializer.validated_data['title'].strip()
        payload = request_serializer.validated_data['payload']
        template_key = request_serializer.validated_data.get('template_key', '').strip()

        result = create_template_version(
            user=request.user,
            kind=kind,
            title=title,
            payload=payload,
            template_key=template_key,
        )
        if not result.ok:
            return error_response(result.error, status_code=result.code)

        serializer = UserTemplateVersionSerializer(result.data)
        return success_response(serializer.data, status_code=result.code)


class UserTemplateHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, kind, template_key):
        if kind not in {'challenge', 'growth'}:
            return error_response('kind must be challenge or growth.', status_code=status.HTTP_400_BAD_REQUEST)

        versions = UserTemplateVersion.objects.filter(
            user=request.user,
            kind=kind,
            template_key=template_key,
        ).order_by('-version')
        serializer = UserTemplateVersionSerializer(versions, many=True)
        return success_response(serializer.data)

__all__ = [
    'JournalEntryView',
    'JournalEntryDetailView',
    'MoodEntryView',
    'UserTemplateListView',
    'UserTemplateHistoryView',
]
