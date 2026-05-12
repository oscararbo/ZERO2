import re

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from common.api.responses import error_response, success_response
from core_domain.models import Profile

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
_USERNAME_RE = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
PASSWORD_MIN = 8


def _validate_password(password):
    if len(password) < PASSWORD_MIN:
        return f'La contraseña debe tener al menos {PASSWORD_MIN} caracteres.'
    return None


class CheckUsernameView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return error_response('Username requerido.', status_code=status.HTTP_400_BAD_REQUEST)
        if not _USERNAME_RE.match(username):
            return success_response({'available': False, 'reason': 'Solo letras, numeros y guion bajo (3-30 caracteres).'})
        exists = User.objects.filter(username__iexact=username).exists()
        return success_response({'available': not exists})


class CheckEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def get(self, request):
        email = request.query_params.get('email', '').strip()
        if not email:
            return error_response('Email requerido.', status_code=status.HTTP_400_BAD_REQUEST)
        if not _EMAIL_RE.match(email):
            return success_response({'available': False, 'reason': 'Formato de email no valido.'})
        exists = User.objects.filter(email__iexact=email).exists()
        return success_response({'available': not exists})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password or not email:
            return error_response('Usuario, email y contrasena son requeridos.', status_code=status.HTTP_400_BAD_REQUEST)

        if not _USERNAME_RE.match(username):
            return error_response('El usuario solo puede tener letras, numeros y guion bajo (3-30 caracteres).', status_code=status.HTTP_400_BAD_REQUEST)

        if not _EMAIL_RE.match(email):
            return error_response('Formato de email no valido.', status_code=status.HTTP_400_BAD_REQUEST)

        pw_error = _validate_password(password)
        if pw_error:
            return error_response(pw_error, status_code=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return error_response('El usuario ya existe.', status_code=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return error_response('El correo ya esta en uso.', status_code=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)

        full_name = request.data.get('full_name', '').strip() or username
        try:
            weekly_goal = int(request.data.get('weekly_goal', 3))
            weekly_goal = max(1, min(14, weekly_goal))
        except (ValueError, TypeError):
            weekly_goal = 3

        fitness_goal = request.data.get('fitness_goal', 'bulk')
        if fitness_goal not in {'bulk', 'cut', 'maintain'}:
            fitness_goal = 'bulk'

        def _float(key, default=0.0):
            try:
                return float(request.data.get(key, default))
            except (ValueError, TypeError):
                return default

        def _bool(key):
            val = request.data.get(key)
            if isinstance(val, bool):
                return val
            return str(val).lower() in ('true', '1', 'yes')

        Profile.objects.create(
            user=user,
            full_name=full_name,
            weekly_goal=weekly_goal,
            fitness_goal=fitness_goal,
            weight=_float('weight'),
            height=_float('height'),
            macro_calories_target=_float('macro_calories_target'),
            macro_protein_target=_float('macro_protein_target'),
            macro_carbs_target=_float('macro_carbs_target'),
            macro_fat_target=_float('macro_fat_target'),
            sport=_bool('sport'),
            food=_bool('food'),
            mindset=_bool('mindset'),
            growth=_bool('growth'),
            challenges=_bool('challenges'),
        )

        refresh = RefreshToken.for_user(user)
        return success_response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'username': user.username,
            },
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        user = authenticate(username=username, password=password)
        if not user:
            return error_response('Usuario o contrasena invalidos.', status_code=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return success_response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'is_staff': user.is_staff,
        })


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = {
            'status': 'ok',
            'service': 'zero-backend',
            'version': getattr(settings, 'APP_VERSION', 'dev'),
            'time': timezone.now().isoformat(),
        }
        return success_response(payload)

__all__ = ['RegisterView', 'LoginView', 'HealthView', 'CheckUsernameView', 'CheckEmailView']
