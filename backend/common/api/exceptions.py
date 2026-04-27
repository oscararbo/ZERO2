from rest_framework.views import exception_handler


DEFAULT_MESSAGES = {
    400: 'La solicitud contiene datos no validos.',
    401: 'No estas autenticado o tu sesion expiro.',
    403: 'No tienes permisos para realizar esta accion.',
    404: 'El recurso solicitado no existe.',
    405: 'Metodo HTTP no permitido para este endpoint.',
    429: 'Demasiadas solicitudes. Intentalo de nuevo en un momento.',
    500: 'Ocurrio un error interno en el servidor.',
}


def _normalize_errors(data):
    if isinstance(data, dict):
        normalized = {}
        for key, value in data.items():
            if key == 'detail':
                continue
            normalized[key] = _normalize_errors(value)
        return normalized or None

    if isinstance(data, list):
        return [_normalize_errors(item) for item in data]

    return str(data)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    message = None
    if isinstance(response.data, dict):
        detail = response.data.get('detail')
        if detail is not None:
            message = str(detail)

    if not message:
        message = DEFAULT_MESSAGES.get(response.status_code, 'La solicitud no pudo procesarse.')

    payload = {
        'ok': False,
        'message': message,
        'status_code': response.status_code,
    }

    errors = _normalize_errors(response.data)
    if errors:
        payload['errors'] = errors

    response.data = payload
    return response
