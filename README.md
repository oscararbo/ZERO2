# Z-RO: Fitness & Wellness Tracker

A full-stack web application for tracking fitness goals, exercises, nutrition, and personal growth. Built with Angular (frontend) and Django REST Framework (backend).

## Project Structure

```
.
├── frontend/          # Angular standalone components app
│   └── src/app/       # Angular app with routes, services, pages
└── backend/           # Django + Django REST Framework API
    └── accounts/      # User profiles, exercises, sessions
```

## Key Changes & Unified Architecture

### Backend: DRF ViewSets + Router Pattern
- Converted all API endpoints to **Django REST Framework ViewSets** for consistency
- Used `DefaultRouter` to auto-generate URLs for CRUD operations
- Endpoints unified:
  - `GET /api/accounts/exercises/` – List all exercises (with filtering by location/category)
  - `POST /api/accounts/sessions/` – Create exercise sessions
  - `GET /api/accounts/profile/` & `POST /api/accounts/profile/` – User profile
  - `POST /api/accounts/register/` – Register new user
  - `POST /api/accounts/login/` – Login and get JWT tokens

### Frontend: Constructor Injection + Signals
- Unified injection pattern: services injected via constructor
- Used Angular **`signal()`** API for reactive UI state (menuOpen, loading, form data)
- Fixed class field initialization issues → moved form definitions into constructors

### Code Quality
- Simplified code for **2ºDAW** students: removed advanced patterns, unified style
- Applied formatters: `black`, `isort` (backend); `prettier` (frontend)
- Linting: `ruff` (backend), `ng lint` (frontend) – all checks passing
- Security hardened: environment-aware settings in `config/settings.py`

## Setup & Run

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment** (if not already done):
```bash
python -m venv .venv
```

3. **Activate virtual environment:**
```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

5. **Run migrations:**
```bash
python manage.py migrate
```

6. **Load sample exercises** (optional):
```bash
python populate_exercises.py
```

7. **Start development server:**
```bash
python manage.py runserver
```

The backend API will be available at `http://localhost:8000/api/accounts/`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser.

## Testing

### Backend Tests
```bash
cd backend
python manage.py test accounts -v 2
```

All 3 API integration tests pass (register, login, profile, exercises, sessions).

### Frontend Build
```bash
cd frontend
npm run build
```

Production-ready bundle created in `dist/ZERO/`.

## API Endpoints Reference

### Authentication
- `POST /api/accounts/register/` – Create new user
- `POST /api/accounts/login/` – Login, receive JWT tokens

### Profile
- `GET /api/accounts/profile/` – Get user profile
- `POST /api/accounts/profile/` – Update user profile

### Exercises
- `GET /api/accounts/exercises/` – List exercises (filters: `?location=home&category=chest`)
- `GET /api/accounts/exercises/by-location/{location}/` – Get exercises by location with categories

### Exercise Sessions
- `GET /api/accounts/sessions/` – List user's recent sessions
- `POST /api/accounts/sessions/` – Create new session with exercises

### Progress
- `GET /api/accounts/progress/` – Get 7-day exercise progress (labels + counts)

## Environment Variables

### Backend (`backend/.env` or system environment)
- `DJANGO_SECRET_KEY` – Django secret key (auto-generated if not set)
- `DJANGO_DEBUG` – Enable debug mode (default: `False`)
- `DJANGO_ALLOWED_HOSTS` – Comma-separated hosts (default: `localhost,127.0.0.1`)
- Security settings (all default to `True`):
  - `SECURE_SSL_REDIRECT`
  - `SESSION_COOKIE_SECURE`
  - `CSRF_COOKIE_SECURE`
  - `SECURE_HSTS_INCLUDE_SUBDOMAINS`
  - `SECURE_HSTS_PRELOAD`

For development, disable SSL redirect:
```bash
set DJANGO_SECURE_SSL_REDIRECT=False
```

## File Organization

### Backend
- `accounts/models.py` – User Profile, Exercise, ExerciseSession, CompletedExercise
- `accounts/views.py` – ViewSets for all endpoints
- `accounts/serializers.py` – DRF serializers for model validation/response
- `accounts/urls.py` – URL router configuration
- `config/settings.py` – Django settings with environment support
- `test_api.py` – API integration tests

### Frontend
- `src/app/app.routes.ts` – Standalone route definitions
- `src/app/core/` – Services (auth, profile, exercise, nutrition, progress)
- `src/app/pages/` – Page components (login, register, profile, dashboard, focus)
- `src/app/pages/shared/` – Reusable components (progress-chart)

## Development Notes

- **API Authentication:** All user-dependent endpoints require JWT Bearer token in `Authorization` header
- **Reactive Forms:** Angular Reactive Forms used with proper validation rules
- **Standalone Components:** Angular 18+ standalone API (no module files)
- **SQLite Database:** Suitable for development; switch to PostgreSQL for production

## License

Developed for **2ºDAW (Segundo Año de Desarrollo de Aplicaciones Web)** students.
