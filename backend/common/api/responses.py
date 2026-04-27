from rest_framework.response import Response


def success_response(data=None, *, status_code=200):
    return Response({'ok': True, 'data': data}, status=status_code)


def error_response(message, *, status_code=400, errors=None):
    payload = {
        'ok': False,
        'message': message,
        'status_code': status_code,
    }
    if errors:
        payload['errors'] = errors
    return Response(payload, status=status_code)
