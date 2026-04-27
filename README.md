# ZERO — Fitness & Wellness App

Aplicación full-stack para seguimiento de fitness, nutrición y bienestar mental.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django + Django REST Framework + SimpleJWT |
| Frontend | Angular 21 (standalone, signals) + TypeScript + SCSS |
| Base de datos | SQLite (desarrollo) |

## Características principales

- **Dashboard** — resumen del progreso semanal y gráfica de evolución
- **Sport** — sesiones de entrenamiento, ejercicios por categoría/localización y seguimiento de sets/reps
- **Food** — objetivos de macros y seguimiento nutricional
- **Mindset** — journal personal, registro de estado de ánimo y meditación guiada
- **Growth** — plantillas de crecimiento personal y templates versionados
- **Challenges** — retos con leaderboard, updates, badges y reminders en-app
- **Profile** — datos personales, métricas corporales, analytics por área de interés (datos reales del servidor)
- **Admin panel (staff)** — KPIs globales, comparación por rango, cohortes, export CSV, historial de alertas con resolver/reabrir y skeletons durante carga

## Novedades recientes

- Registro en 2 pasos corregido: `/register` -> `/register-step2` sin redirección accidental a login.
- Formularios `register` y `register-step2` con espaciado compacto entre inputs y mensajes de error.
- Mindset (`Daily Inspiration`) y Growth (`Daily Growth Quote`) ahora tienen fallback local + caché diaria + recarga forzada con `New Quote`.
- Panel admin responsive en móvil/tablet (chips, KPIs, controles, tablas y metadatos de alertas).
- Skeletons añadidos para KPIs, comparación y bloques de top usuarios/alertas mientras carga.

## Inicio rápido

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver        # http://127.0.0.1:8000
```

Datos seed de ejercicios:
```bash
python create_exercises.py
python populate_exercises.py
```

### Frontend

```bash
cd frontend
npm install
npm start                         # http://localhost:4200
```

Build de producción:
```bash
npm run build
```

## API — Endpoints principales

Todos los endpoints autenticados requieren header `Authorization: Bearer <access_token>`.

### Auth (público)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/register/` | Registro + creación de perfil |
| POST | `/api/login/` | Login → devuelve access + refresh tokens |
| POST | `/api/token/refresh/` | Refresco de access token |
| GET | `/api/health/` | Healthcheck |
| GET | `/api/check-username/` | Disponibilidad de username |
| GET | `/api/check-email/` | Disponibilidad de email |

### Perfil (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/profile/` | Obtener perfil del usuario |
| PUT | `/api/profile/` | Actualizar perfil (parcial) |
| GET | `/api/profile/insights/` | Analytics reales por área de interés |
| GET | `/api/meta/` | Choices y límites de la API (público) |

### Entrenamientos (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/exercises/` | Catálogo de ejercicios (filtrable) |
| GET | `/api/exercises-by-location/<location>/` | Ejercicios agrupados por categoría |
| GET/POST | `/api/sessions/` | Sesiones de entrenamiento |
| GET | `/api/sessions/<id>/` | Detalle de sesión |
| POST | `/api/completed/` | Registrar ejercicio completado |
| GET | `/api/progress/` | Stats de progreso para gráfica |

### Mindset (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/journal/` | Entradas del journal |
| GET/PUT/DELETE | `/api/journal/<id>/` | Detalle de entrada |
| GET/POST | `/api/mood/` | Registro de estado de ánimo |
| GET/POST | `/api/templates/` | Plantillas de usuario |
| GET | `/api/templates/<kind>/<key>/history/` | Historial de versiones |

### Challenges (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/challenges/` | Lista / creación de challenges |
| GET/PUT/DELETE | `/api/challenges/<id>/` | Detalle de challenge |
| POST | `/api/challenges/<id>/join/` | Unirse a un challenge |
| POST | `/api/challenges/<id>/leave/` | Salir de un challenge |
| POST | `/api/challenges/<id>/progress/` | Actualizar progreso |
| GET | `/api/challenges/<id>/leaderboard/` | Leaderboard paginado |
| GET | `/api/challenges/<id>/updates/` | Updates paginados |
| GET | `/api/challenges/analytics/` | Analytics del usuario |
| GET/PUT | `/api/reminders/` | In-app reminders |
| GET | `/api/badges/` | Badges del usuario |

## Estructura del proyecto

```
ZERO/
├── backend/
│   ├── config/             # settings, urls, wsgi/asgi
│   ├── api_compat/         # enrutado externo → /api/...
│   ├── common/             # responses, pagination, exception handler
│   ├── core_domain/        # modelos y serializers por dominio
│   └── apps/
│       ├── account_auth/   # registro, login, check disponibilidad
│       ├── profiles/       # perfil + insights analytics
│       ├── workouts/       # ejercicios, sesiones, progreso
│       ├── mindset/        # journal, mood, templates
│       └── challenges/     # challenges, leaderboard, badges, reminders
└── frontend/
    └── src/app/
        ├── core/           # servicios, guards, interceptores
        └── pages/
            ├── dashboard/
            ├── profile/
            ├── profile-edit/
            ├── focus/      # sport, food, mindset, growth, challenges
            ├── shared/     # componentes reutilizables
            ├── login/
            ├── register/
            └── register-step2/
```

## Tests

```bash
# Backend (todos los tests)
cd backend
python manage.py test

# Backend (módulo específico)
python manage.py test apps.profiles.tests_api

# Frontend
cd frontend
npm test
```

## Variables de entorno (backend)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | insecure-dev-key | Clave secreta de Django |
| `DJANGO_DEBUG` | `true` | Modo debug |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` | Hosts permitidos |
| `APP_VERSION` | `dev` | Versión reportada en `/api/health/` y `/api/meta/` |

## Despliegue

1. Configura variables de entorno para producción (`DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`, etc.)
2. Construye el frontend: `npm run build` en `frontend/`
3. Sirve Django con Gunicorn o uWSGI detrás de Nginx
4. Usa PostgreSQL en producción (actualizar `DATABASES` en `settings.py`)

## Contacto

Para preguntas o soporte, por favor abre un issue en este repositorio.
