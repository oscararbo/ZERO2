# Frontend - ZERO

## Que contiene esta carpeta
Aplicacion cliente SPA de ZERO construida con Angular standalone, Signals, OnPush y SCSS.

Su responsabilidad es:
- Renderizar UI.
- Gestionar navegacion y estado de pantalla.
- Consumir API del backend (`/api/accounts/...`).
- Aplicar reglas de acceso (guard) y autenticacion (interceptor JWT).

## Stack tecnico
- Angular 21
- TypeScript 5.9
- RxJS
- Angular CDK (scroll virtual en listas pesadas)
- SCSS

## Estructura del frontend

```text
frontend/
|- angular.json
|- package.json
|- tsconfig.json
|- tsconfig.app.json
|- tsconfig.spec.json
|- public/
|- src/
|  |- index.html
|  |- main.ts
|  |- styles.css
|  |- environments/
|  `- app/
|     |- app.ts
|     |- app.config.ts
|     |- app.routes.ts
|     |- core/
|     |  |- auth.service.ts
|     |  |- auth.guard.ts
|     |  |- auth.interceptor.ts
|     |  |- challenge.service.ts
|     |  |- exercise.service.ts
|     |  |- mindset.service.ts
|     |  |- nutrition.service.ts
|     |  |- profile.service.ts
|     |  `- progress.service.ts
|     `- pages/
|        |- dashboard/
|        |- home/
|        |- login/
|        |- register/
|        |- register-step2/
|        |- profile/
|        |- profile-edit/
|        |- focus/
|        |  |- challenges/
|        |  |- food/
|        |  |- growth/
|        |  |- mindset/
|        |  `- sport/
|        `- shared/
|           |- progress-chart/
|           `- components/
|              |- toast/
|              |- focus-header/
|              `- load-more-button/
|- .angular/
|- node_modules/
`- dist/
```

## Capas y responsabilidades

### 1) Bootstrap y configuracion
- `main.ts`: arranque de Angular.
- `app.config.ts`: providers globales (http, router, interceptores).
- `app.routes.ts`: enrutado, guard y lazy loading por pantalla.

### 2) Core (servicios)
- Capa de comunicacion con backend.
- Centraliza URLs, DTOs y llamadas HTTP.
- No renderiza UI.

### 3) Pages (features)
- Pantallas de negocio.
- Orquestan estado de UI con signals/computed.
- Delegan peticiones a `core/*service.ts`.

### 4) Shared
- Componentes reutilizables de presentacion.
- Sin logica de negocio acoplada a una feature.

## Patrones de arquitectura usados
- Standalone components.
- `ChangeDetectionStrategy.OnPush` por defecto en componentes de pagina/shared.
- Estado local con `signal` y `computed`.
- Plantillas orientadas a datos derivados (menos metodos utilitarios en HTML).
- `trackBy` en listas relevantes.
- Carga diferida de rutas y chunks pesados.

## Flujo tipico de una feature
1. Usuario interactua con un componente en `pages/*`.
2. El componente actualiza signals locales.
3. Si hace falta datos remotos, llama a `core/*service.ts`.
4. Se normaliza respuesta y se actualiza estado.
5. La vista se refresca por `computed` + OnPush.

## Scripts de trabajo

```bash
cd frontend
npm install
npm start
npm run build
```

Opcional:

```bash
npm test
```

## Convenciones recomendadas
- Evitar logica compleja en template.
- Preferir `computed` para derivados de estado.
- Evitar `subscribe` anidados.
- Mantener DTOs y tipos cerca del servicio de dominio.
- Reusar componentes en `pages/shared/components`.

## Problemas comunes

### VS Code muestra errores TS que no aparecen en build
Usar TypeScript del workspace en `.vscode/settings.json`.

### El backend no responde
Revisar `src/environments/environments.ts` y que el server Django este levantado.

### Cambios de UI no aplican en listas largas
Verificar `trackBy` y que las mutaciones respeten inmutabilidad.

## Que NO subir al repo
No subir:
- `node_modules/`
- `.angular/`
- `dist/`
- `.env`

Esto ya esta contemplado en `.gitignore` del proyecto.
