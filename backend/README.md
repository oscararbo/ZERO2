# Backend - ZERO

## Que contiene esta carpeta
API REST del proyecto ZERO, implementada con Django + Django REST Framework.

El backend es responsable de:
- Autenticacion y autorizacion.
- Perfil de usuario y preferencias.
- Catalogo de ejercicios y sesiones.
- Tracking de progreso.
- Journal personal.
- Sistema de challenges, leaderboard, updates, badges y reminders.

## Stack tecnico
- Python
- Django
- Django REST Framework
- JWT para auth
- SQLite en desarrollo local

## Estructura del backend

```text
backend/
|- manage.py
|- pyproject.toml
|- db.sqlite3
|- create_exercises.py
|- populate_exercises.py
|- config/
|  |- settings.py
|  |- urls.py
|  |- asgi.py
|  `- wsgi.py
`- accounts/
   |- admin.py
   |- apps.py
   |- models.py
   |- serializers.py
   |- urls.py
   |- views.py
   |- tests.py
   |- test_api.py
   `- migrations/
```

## Capas y responsabilidades

### 1) Configuracion global
- `config/settings.py`: apps, middlewares, DB, auth, CORS, etc.
- `config/urls.py`: enrutado raiz y prefijo API.
- `asgi.py` / `wsgi.py`: entrypoints para runtime.

### 2) Dominio `accounts`
- `models.py`: entidades persistentes.
- `serializers.py`: validacion y transformacion DTO <-> modelo.
- `views.py`: endpoints y reglas de negocio.
- `urls.py`: rutas de la app.

### 3) Datos seed
- `create_exercises.py`, `populate_exercises.py`: carga inicial de ejercicios.

## Flujo de una request
1. Frontend llama `/api/accounts/...`.
2. DRF aplica autenticacion/permisos.
3. Vista procesa input y usa modelos.
4. Serializer devuelve respuesta JSON.

## Modulos funcionales principales
- Auth: register/login y sesiones JWT.
- Profile: datos base del usuario y objetivo fitness.
- Exercises/Sessions: plan y ejecucion de entrenamientos.
- Progress: agregados para dashboard.
- Journal: entradas personales.
- Challenges: alta/baja, progreso, updates, leaderboard, analytics.
- Rewards: badges y in-app reminders.

## Comandos utiles

```bash
cd backend
python manage.py migrate
python manage.py runserver
python manage.py test
python manage.py test accounts.test_api
```

## Practicas recomendadas
- Mantener logica de validacion en serializers cuando aplique.
- Mantener consultas optimizadas en vistas (select_related/prefetch/annotate).
- Cubrir endpoints criticos con tests de API.
- Evitar romper contratos JSON usados por frontend.

## Entorno y configuracion
- Desarrollo local: SQLite.
- Produccion: usar DB gestionada + variables de entorno para secretos.
- No commitear `.env` ni bases locales.

## Troubleshooting rapido

### Error de migraciones
```bash
python manage.py makemigrations
python manage.py migrate
```

### Frontend falla por CORS/auth
Revisar `settings.py` (CORS + auth classes) y cabecera JWT en requests.

### Datos iniciales vacios
Ejecutar scripts de poblado (`create_exercises.py` / `populate_exercises.py`) segun el flujo del proyecto.
