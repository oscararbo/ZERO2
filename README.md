# Z-RO: Fitness & Wellness App

Una aplicación full-stack para seguimiento de fitness, nutrición y bienestar mental, construida con Django REST Framework (backend) y Angular (frontend).

## Características

- **Dashboard**: Vista general del progreso
- **Páginas Focus**:
  - **Challenges**: Desafíos y motivación
  - **Food**: Seguimiento nutricional
  - **Growth**: Metas de crecimiento personal y diario
  - **Mindset**: Meditación, citas y diario mental
  - **Sport**: Actividades deportivas
- **Autenticación**: Registro, login y gestión de usuarios
- **Base de datos**: SQLite para desarrollo

## Tecnologías

- **Backend**: Django 4.x, Django REST Framework, SimpleJWT
- **Frontend**: Angular 21+, TypeScript, SCSS
- **Base de datos**: SQLite

## Instalación y Configuración

### Prerrequisitos

- Python 3.8+
- Node.js 18+
- npm o yarn

### Backend (Django)

1. Navega al directorio backend:
   ```bash
   cd backend
   ```

2. Crea y activa un entorno virtual:
   ```bash
   python -m venv .venv
   # En Windows:
   .venv\Scripts\activate
   # En macOS/Linux:
   source .venv/bin/activate
   ```

3. Instala dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Ejecuta migraciones:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. (Opcional) Crea un superusuario:
   ```bash
   python manage.py createsuperuser
   ```

6. Inicia el servidor:
   ```bash
   python manage.py runserver
   ```

El backend estará disponible en `http://127.0.0.1:8000/`.

### Frontend (Angular)

1. Navega al directorio frontend:
   ```bash
   cd frontend
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm start
   # o
   ng serve
   ```

El frontend estará disponible en `http://localhost:4200/`.

### Build de Producción

Para construir el frontend para producción:

```bash
cd frontend
npm run build
```

Los archivos construidos estarán en `frontend/dist/`.

## API Endpoints

### Autenticación
- `POST /api/accounts/register/` - Registro de usuario
- `POST /api/accounts/login/` - Login
- `POST /api/accounts/logout/` - Logout

### Diario (Journal)
- `GET /api/accounts/journal/` - Obtener entradas del diario
- `POST /api/accounts/journal/` - Crear nueva entrada
- `GET /api/accounts/journal/{id}/` - Obtener entrada específica
- `PUT /api/accounts/journal/{id}/` - Actualizar entrada
- `DELETE /api/accounts/journal/{id}/` - Eliminar entrada

## Estructura del Proyecto

```
Z-RO/
├── backend/                 # Django backend
│   ├── accounts/           # App de cuentas de usuario
│   ├── config/             # Configuración principal
│   ├── db.sqlite3          # Base de datos SQLite
│   ├── manage.py
│   └── requirements.txt
└── frontend/                # Angular frontend
    ├── src/
    │   ├── app/
    │   │   ├── core/       # Servicios, guards, interceptores
    │   │   └── pages/      # Páginas de la app
    │   └── environments/
    ├── angular.json
    ├── package.json
    └── tsconfig.json
```

## Desarrollo

### Ejecutar Tests

Backend:
```bash
cd backend
python manage.py test
```

Frontend:
```bash
cd frontend
npm test
```

### Linting

Frontend:
```bash
cd frontend
npm run lint
```

### Notas de compatibilidad TypeScript 6+

Para evitar errores deprecados reportados por TypeScript en dependencias (por ejemplo `rxjs`) sin romper el build de Angular, se aplicaron estos ajustes:

- En `.vscode/settings.json`:
   - `"typescript.tsdk": "frontend/node_modules/typescript/lib"`
   - `"typescript.enablePromptUseWorkspaceTsdk": false`
- En `frontend/tsconfig.spec.json`:
   - `"compilerOptions.rootDir": "./src"`

Con esto se corrigen los diagnósticos de editor de TS 6 en `node_modules/rxjs/tsconfig.json` y se mantiene compatibilidad de compilación con el TypeScript del proyecto (`5.9.x`).

También se elimina el aviso de:


## Despliegue

1. Construye el frontend:
   ```bash
   cd frontend
   npm run build --prod
   ```

2. Copia los archivos de `frontend/dist/` al directorio estático de Django.

3. Configura variables de entorno para producción.

4. Usa un servidor WSGI como Gunicorn para Django.

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

Para preguntas o soporte, por favor abre un issue en este repositorio.
