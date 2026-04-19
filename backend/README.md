# Backend — ZERO

API REST del proyecto ZERO, implementada con Django + Django REST Framework.

## Responsabilidades

- Autenticación y autorización JWT con refresh automático
- Perfil de usuario, métricas corporales y analytics por área de interés
- Catálogo de ejercicios, sesiones y tracking de progreso
- Journal personal y registro de estado de ánimo
- Plantillas versionadas de usuario
- Sistema de challenges: leaderboard, updates, badges y in-app reminders

## Stack

- Python 3.10+
- Django (latest)
- Django REST Framework
- djangorestframework-simplejwt
- django-cors-headers
- SQLite (desarrollo) → PostgreSQL (producción recomendado)

## Inicio rápido

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Carga inicial de ejercicios:
```bash
python create_exercises.py
python populate_exercises.py
```

## Estructura

```text
backend/
├── manage.py
├── pyproject.toml
├── requirements.txt
├── config/                  # settings, urls, wsgi/asgi
├── api_compat/              # módulo de borde: enruta todo bajo /api/
├── common/
│   └── api/
│       ├── responses.py     # success_response / error_response
│       ├── pagination.py    # parse_pagination / paginated_response
│       └── exceptions.py    # custom_exception_handler → formato { ok, message, errors }
├── core_domain/             # modelos y serializers centralizados
│   ├── models/              # profile, exercise, journal, templates, challenges
│   └── serializers/
└── apps/
    ├── account_auth/        # register, login, check-username/email, health
    ├── profiles/            # perfil + insights analytics por área
    ├── workouts/            # ejercicios, sesiones, progreso
    ├── mindset/             # journal, mood, templates de usuario
    └── challenges/          # challenges, leaderboard, badges, reminders
```

## Formato de respuesta

Todas las respuestas siguen el mismo envelope:

```json
// Éxito
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "message": "...", "status_code": 400, "errors": { ... } }
```

## Seguridad implementada

- `IsAuthenticated` por defecto; endpoints públicos declaran `AllowAny` explícitamente
- JWT con refresh endpoint (`/api/token/refresh/`)
- Throttling por scope `auth` en register/login/check
- Validaciones de registro: email único, username único (case-insensitive), longitud mínima de contraseña
- Soporte de configuración por variables de entorno (`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`)
- Cabeceras de seguridad: `X_FRAME_OPTIONS`, `SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_REFERRER_POLICY`

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | insecure-dev-key | Clave secreta |
| `DJANGO_DEBUG` | `true` | Modo debug |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` | Hosts permitidos (CSV) |
| `APP_VERSION` | `dev` | Versión reportada en `/api/health/` y `/api/meta/` |

## Tests

```bash
python manage.py test                          # todos
python manage.py test apps.profiles.tests_api  # módulo específico
```

## Prácticas de desarrollo

- La lógica de negocio no trivial vive en `apps/*/services/` o `apps/*/services.py`, no en las vistas
- Las vistas solo coordinan request → service → response
- Los endpoints retornan `success_response(data)` o `error_response(message)`
- Las consultas usan `select_related` / `prefetch_related` / `annotate` donde aplica
- Nuevas entidades deben agregarse en `core_domain/models/` y `core_domain/serializers/`

## Troubleshooting

```bash
# Migraciones pendientes
python manage.py makemigrations && python manage.py migrate

# Verificar configuración
python manage.py check

# Shell interactivo
python manage.py shell
```

