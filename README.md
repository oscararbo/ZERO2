# ZERO — Fitness & Wellness App

Aplicación full-stack para seguimiento de fitness, nutrición y bienestar mental.

Actualizado: mayo 2026.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django 6 + Django REST Framework + SimpleJWT |
| Frontend | Angular 21 (standalone, signals) + TypeScript + SCSS |
| Android | Kotlin + Jetpack (WorkManager, Room, Health Connect) |
| Base de datos | SQLite (desarrollo) |

## Características principales

- **Dashboard** — resumen del progreso semanal y gráfica de evolución
- **Sport** — sesiones de entrenamiento, ejercicios por categoría/localización y seguimiento de sets/reps
- **Food** — objetivos de macros y seguimiento nutricional
- **Mindset** — journal personal, registro de estado de ánimo y meditación guiada
- **Growth** — plantillas de crecimiento personal y templates versionados
- **Challenges** — retos con leaderboard, updates, badges y reminders en-app
- **Performance Hub** — planner semanal, coach inteligente (reglas), recovery score, wearables e importación masiva JSON/CSV
- **Profile** — datos personales, métricas corporales, analytics por área de interés (datos reales del servidor)
- **Admin panel (staff)** — KPIs globales, comparación por rango, cohortes, export CSV, historial de alertas con resolver/reabrir y skeletons durante carga

## Novedades recientes

- Registro en 2 pasos corregido: `/register` -> `/register-step2` sin redirección accidental a login.
- Formularios `register` y `register-step2` con espaciado compacto entre inputs y mensajes de error.
- Mindset (`Daily Inspiration`) y Growth (`Daily Growth Quote`) ahora tienen fallback local + caché diaria + recarga forzada con `New Quote`.
- Panel admin responsive en móvil/tablet (chips, KPIs, controles, tablas y metadatos de alertas).
- Skeletons añadidos para KPIs, comparación y bloques de top usuarios/alertas mientras carga.
- Challenges actualizado: pestañas `Completed` y `Expired`, confirm modal para borrado propio, actualización local al unirse/salir/editar progreso (sin recargar toda la página), y `duration_days` limitado a 30 días.
- Challenges expirados ya no aparecen en `All`; en `My Challenges` siguen visibles con estado de caducado.
- Updates de challenges mejorados: sin botón `Load more updates`, con scroll vertical propio y ajuste de texto largo sin desbordes horizontales.
- Performance Hub refactorizado en subcomponentes (`Weekly Planner`, `Recovery Score`, `Wearables`) y ajuste visual responsive en planner/recovery.

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

Reset total + datos dummy (1 comando):
```bash
python manage.py seed_dummy_data --reset --users 14 --days 45 --seed 123
```

Notas rápidas:
- Crea/actualiza `admin_demo` y usuarios `demo_user_XX`.
- Password por defecto para usuarios dummy: `password123`.
- Puedes cambiarla con `--password "tu_password"`.

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

### Android

```bash
cd Android
# Windows
.\gradlew.bat assembleDebug

# macOS/Linux
./gradlew assembleDebug
```

APK debug generado en:

`Android/app/build/outputs/apk/debug/app-debug.apk`

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
| GET | `/api/meal-recommendations/` | Recomendaciones de comida |
| GET | `/api/progress/` | Stats de progreso para gráfica |

### Mindset (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/journal/` | Entradas del journal |
| GET/PUT/DELETE | `/api/journal/<id>/` | Detalle de entrada |
| GET/POST | `/api/mood/` | Registro de estado de ánimo |
| GET/POST | `/api/templates/` | Plantillas de usuario |
| GET | `/api/templates/<kind>/<key>/` | Historial de versiones |

### Challenges (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/challenges/` | Lista / creación de challenges |
| GET/PUT/DELETE | `/api/challenges/<id>/` | Detalle de challenge |
| POST/DELETE | `/api/challenges/<id>/join/` | Unirse o salir de un challenge |
| POST | `/api/challenges/<id>/progress/` | Actualizar progreso |
| GET | `/api/challenges/<id>/leaderboard/` | Leaderboard paginado |
| GET/POST | `/api/challenges/<id>/updates/` | Updates del challenge |
| GET | `/api/challenges/analytics/` | Analytics del usuario |
| GET | `/api/reminders/` | In-app reminders |
| POST | `/api/reminders/<id>/read/` | Marcar reminder como leído |
| POST | `/api/reminders/read-all/` | Marcar todos como leídos |
| GET | `/api/badges/` | Badges del usuario |

### Performance (autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/performance/planner/` | Plan semanal + toggle de completado |
| GET | `/api/performance/coach/` | Brief diario del coach por reglas |
| GET | `/api/performance/nutrition/` | Plan semanal nutricional + lista de compra |
| GET/POST | `/api/performance/recovery/` | Historial recovery + nuevo registro |
| GET/POST | `/api/performance/wearables/` | Lectura e ingesta de wearables |
| GET | `/api/performance/feature-flags/` | Flags activas de funcionalidades |
| GET/POST | `/api/performance/jobs/` | Listar/crear jobs async |
| POST | `/api/performance/jobs/run-pending/` | Ejecutar cola pendiente (admin) |
| GET | `/api/exercises/<id>/video/` | Video demo de YouTube por ejercicio |
| POST | `/api/performance/exercise-videos/refresh/` | Refrescar videos (admin) |

Nota: todos estos endpoints también están disponibles bajo `/api/v1/`.

## Estructura del proyecto

```
ZERO/
├── Android/
│   ├── app/
│   │   ├── build.gradle.kts
│   │   ├── proguard-rules.pro
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/zero/wearsync/
│   │       │   ├── MainActivity.kt
│   │       │   ├── OnboardingActivity.kt
│   │       │   ├── PermissionsRationaleActivity.kt
│   │       │   ├── data/
│   │       │   ├── domain/
│   │       │   ├── sync/
│   │       │   └── ui/
│   │       └── res/
│   │           ├── values/
│   │           └── xml/
│   ├── build.gradle.kts    # configuración de build raíz
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   └── gradle/wrapper/     # wrapper de Gradle
├── backend/
│   ├── config/             # settings, urls, wsgi/asgi
│   ├── api_compat/         # enrutado externo → /api/...
│   ├── common/             # responses, pagination, exception handler
│   ├── core_domain/        # modelos y serializers por dominio
│   └── apps/
│       ├── account_auth/   # registro, login, check disponibilidad
│       ├── admin_panel/    # KPIs staff, cohortes, alertas y export CSV
│       ├── challenges/     # challenges, leaderboard, badges, reminders
│       ├── performance/    # planner, coach, nutrition, recovery, wearables
│       ├── mindset/        # journal, mood, templates
│       ├── profiles/       # perfil + insights analytics
│       └── workouts/       # ejercicios, sesiones, progreso
└── frontend/
    └── src/app/
        ├── core/           # servicios, guards, interceptores
        └── pages/
            ├── dashboard/
            ├── login/
            ├── profile/
            ├── profile-edit/
            ├── focus/      # sport, food, mindset, growth, performance, challenges
            ├── register/
            ├── register-step2/
            ├── shared/     # componentes reutilizables
            └── admin/
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
| `REDIS_URL` | vacío | Si está definido, activa caché Redis (`django-redis`) |

## Wearables - Importación masiva

Desde la página `/performance`, en el bloque **Wearables Sync (Free)**:

1. Elige proveedor (`samsung_health` o `manual`).
2. Selecciona formato `JSON` o `CSV`.
3. Pega datos o sube archivo `.json` / `.csv`.
4. Pulsa `Import Bulk Entries`.

Formato JSON (ejemplo):

```json
[
    {"date":"2026-05-10","steps":10420,"active_minutes":61,"calories_burned":580,"avg_heart_rate":121},
    {"date":"2026-05-11","steps":8920,"active_minutes":43,"calories_burned":470,"avg_heart_rate":116}
]
```

Formato CSV (ejemplo):

```csv
date,steps,active_minutes,calories_burned,avg_heart_rate
2026-05-10,10420,61,580,121
2026-05-11,8920,43,470,116
```

Campos aceptados: `date`, `steps`, `active_minutes`, `calories_burned`, `avg_heart_rate`.

## Scheduler gratis para jobs async

Opciones incluidas en `backend/scripts/`:

1. Linux/macOS (cron cada 5 min):
```bash
cd backend/scripts
chmod +x install-cron.sh
./install-cron.sh
```

2. Windows (Task Scheduler cada 5 min):
```powershell
cd backend/scripts
powershell -ExecutionPolicy Bypass -File .\register-windows-task.ps1
```

3. Worker en loop simple:
```bash
cd backend
python scripts/job_worker.py --interval 300 --limit 20
```

## Despliegue

1. Configura variables de entorno para producción (`DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`, etc.)
2. Construye el frontend: `npm run build` en `frontend/`
3. Sirve Django con Gunicorn o uWSGI detrás de Nginx
4. Usa PostgreSQL en producción (actualizar `DATABASES` en `settings.py`)

## Despliegue en Vercel (frontend Angular)

Este proyecto queda preparado para desplegar el frontend en Vercel con SPA routing y proxy de API.

Estado actual: frontend desplegado en `https://zero-2-pink.vercel.app/`.

### Archivos ya preparados

- `frontend/vercel.json`
    - Rewrite de `/api/*` al backend externo.
    - Fallback de rutas a `/index.html` para Angular Router.
- `frontend/src/environments/environments.production.ts`
    - `apiUrl` en producción es `''` para usar rutas relativas (`/api/...`).
- `frontend/angular.json`
    - Reemplazo de environment en build de producción.

### 1) Desplegar backend (Render)

Vercel no es la mejor opción para este backend Django completo con estado persistente. Despliega el backend en otro proveedor y usa su dominio HTTPS.

Variables mínimas recomendadas en backend:

- `DJANGO_DEBUG=false`
- `DJANGO_SECRET_KEY=<tu_clave_larga_y_segura>`
- `DJANGO_ALLOWED_HOSTS=zero-mbdv.onrender.com,localhost,127.0.0.1`
- `DJANGO_CORS_ALLOWED_ORIGINS=https://zero-2-pink.vercel.app`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://zero-2-pink.vercel.app`

Importante:

- En producción usa PostgreSQL (no SQLite persistente).
- Ejecuta migraciones en backend antes de abrir el frontend.

### 2) Configurar `frontend/vercel.json`

Configura el rewrite de API apuntando al backend desplegado en Render:

- `https://zero-mbdv.onrender.com`

Estado actual: `frontend/vercel.json` ya apunta a esa URL.

### 3) Crear proyecto en Vercel

1. Entra en Vercel y conecta tu repositorio.
2. En configuración del proyecto usa:
     - Root Directory: `frontend`
     - Framework Preset: `Other` (o Angular si te aparece)
     - Build Command: `npm run build`
     - Output Directory: `dist/ZERO/browser`
3. Deploy.

### 4) Verificación post-deploy

1. Abre `https://zero-2-pink.vercel.app/` y prueba navegación directa en rutas internas (ej: `/login`, `/focus/challenges`) para validar fallback SPA.
2. Prueba login/registro para confirmar que `/api/*` se está reescribiendo al backend.
3. Verifica en backend que `DJANGO_ALLOWED_HOSTS`, CORS y CSRF incluyen tu dominio final.

### 5) Flujo de updates

- Cada push a la rama conectada dispara nuevo deploy en Vercel.
- Si cambias dominio de backend, actualiza `frontend/vercel.json` y vuelve a desplegar.

## Despliegue en Render (backend Django)

Estado actual: backend desplegado en Render en `https://zero-mbdv.onrender.com`.

### Archivos backend preparados

- `backend/Procfile`
    - Arranque con Gunicorn usando el puerto de Render.
- `backend/config/settings.py`
    - Soporte `DATABASE_URL` (PostgreSQL) + fallback SQLite local.
    - Static files listos con WhiteNoise.
    - CORS/CSRF por variables de entorno.
- `backend/requirements.txt`
    - Incluye `gunicorn`, `dj-database-url`, `psycopg[binary]`, `whitenoise`.

### 1) Crear proyecto y servicio en Render

1. Crea un nuevo Web Service en Render.
2. Conecta tu repositorio.
3. Crea un servicio para el backend con:
     - Root Directory: `backend`

### 2) Añadir base de datos PostgreSQL

1. Crea una instancia PostgreSQL en Render.
2. Configura `DATABASE_URL` en el servicio backend usando la URL de esa base de datos.

### 3) Variables de entorno del backend

En el servicio backend configura:

- `DJANGO_DEBUG=false`
- `DJANGO_SECRET_KEY=<tu_clave_segura>`
- `DJANGO_ALLOWED_HOSTS=zero-mbdv.onrender.com`
- `DJANGO_CORS_ALLOWED_ORIGINS=https://zero-2-pink.vercel.app`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://zero-2-pink.vercel.app`

Si añades dominio custom, inclúyelo también en estas variables.

### 4) Build/Start en Render

Render detecta Python automáticamente. Si configuras comandos manuales:

- Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`

### 5) Migraciones y seed

Desde Render (Shell):

```bash
python manage.py migrate
python manage.py seed_dummy_data --reset --users 14 --days 45 --seed 123
```

### 6) Conectar frontend (Vercel) con backend (Render)

1. Usa la URL pública del backend Render:
    - `https://zero-mbdv.onrender.com`
2. Verifica que `frontend/vercel.json` tenga ese dominio en el rewrite de `/api/*`.
3. Redeploy del frontend en Vercel si cambiaste configuración.

### 7) Checklist final

1. `GET https://zero-mbdv.onrender.com/api/health/` responde 200.
2. Login/registro desde frontend funciona sin errores CORS/CSRF.
3. Endpoints autenticados responden con token válido.

### 8) Se hace deploy automático al subir un push al repositorio
1. Url repositorio `https://github.com/oscararbo/ZERO2`

## Contacto

Para preguntas o soporte, por favor abre un issue en este repositorio.
