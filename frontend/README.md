# Frontend — ZERO

SPA cliente de ZERO construida con Angular 21 standalone, Signals, OnPush y SCSS.

Actualizado: mayo 2026.

## Responsabilidades

- Renderizar la UI de todas las páginas
- Gestionar navegación y estado local con signals/computed
- Consumir la API del backend (`/api/...`) a través de servicios tipados
- Aplicar reglas de acceso (`authGuard`) y autenticación JWT (interceptor con renovación automática)

## Stack

- Angular 21.2 (standalone components, signals)
- TypeScript 5.9
- RxJS
- Angular CDK (scroll virtual en listas pesadas)
- Bootstrap 5 (clases utilitarias de layout y espaciado)
- SCSS
- Chart.js (gráfica de progreso)

## Cambios recientes

- Flujo de registro en 2 pasos validado: `/register` almacena step1 localmente y navega a `/register-step2` sin requerir sesión previa.
- Ajuste visual en formularios de registro: menos separación entre campos y errores.
- Mindset y Growth: citas diarias robustas con fallback local cuando falla el servicio externo.
- Botón `New Quote` en Mindset/Growth con recarga forzada (no bloqueado por caché del día).
- Admin: skeletons adicionales (comparación, top usuarios, alertas), alertas reabribles y layout más responsive.

## Inicio rápido

```bash
cd frontend
npm install
npm start        # http://localhost:4200
npm run build    # build de producción → dist/
npm test         # tests unitarios (Angular unit-test builder)
```

## Estructura

```text
frontend/src/app/
├── app.config.ts           # providers globales: router, http, interceptores
├── app.routes.ts           # rutas con lazy loading, authGuard y adminGuard
├── core/
│   ├── admin.service.ts    # acceso a /api/admin/access y /api/admin/stats
│   ├── admin.guard.ts      # restringe la ruta /admin a usuarios staff
│   ├── auth.service.ts     # tokens JWT, login/logout/refresh, persistencia
│   ├── auth.guard.ts       # redirige a /login si no hay sesión
│   ├── auth.interceptor.ts # añade Bearer token; renueva con refresh ante 401
│   ├── api-envelope.interceptor.ts  # desenvuelve { ok, data } de todas las respuestas
│   ├── api-envelope.ts     # normaliza errores de API
│   ├── challenge.service.ts
│   ├── exercise.service.ts # caché con TTL de 60 s para catálogo y sesiones
│   ├── mindset.service.ts  # journal, mood, templates
│   ├── nutrition.service.ts
│   ├── profile.service.ts  # perfil local con frescura controlada (TTL 10 min) + insights
│   ├── progress.service.ts
│   └── template.service.ts
└── pages/
    ├── dashboard/
    ├── home/
    ├── login/
    ├── admin/              # panel staff con KPIs globales y tendencias
    ├── not-found/
    ├── register/
    ├── register-step2/
    ├── profile/            # analytics reales por área de interés (bloquea si no hay intereses)
    ├── profile-edit/
    ├── focus/
    │   ├── challenges/     # scroll virtual, paginación, leaderboard, badges
    │   ├── food/
    │   ├── growth/
    │   ├── mindset/        # journal, mood, meditación, cita diaria
    │   └── sport/
    └── shared/
        ├── progress-chart/         # Chart.js line chart (templateUrl + styleUrl)
        └── components/
            ├── ui-select/          # dropdown CVA reutilizable (ControlValueAccessor)
            ├── back-button/        # botón circular con history.back() o [link]
            ├── focus-header/       # header sticky base (título + back + slot de acciones)
            ├── focus-page-header/  # header de páginas focus (usa focus-header)
            ├── page-top-header/    # header de perfil/profile-edit (usa focus-header)
            ├── toast/
            └── load-more-button/
```

## Arquitectura de componentes

- **Standalone components** — sin NgModules
- **`ChangeDetectionStrategy.OnPush`** en todos los componentes de página y shared
- **Estado local con `signal` / `computed`** — sin BehaviorSubject ni stores externos
- **Cada componente tiene 3 archivos** — `.ts` + `.html` + `.scss` (sin `template:` ni `styles:` inline)
- **Lazy loading** por ruta — cada página es un chunk separado
- **`trackBy`** en todas las listas relevantes

## Servicios destacados

### `AuthService`
- Guarda `access` + `refresh` tokens en `localStorage`
- `token` getter verifica expiración antes de devolver el token
- `canRefreshToken()` comprueba si el refresh sigue vigente
- `refreshAccessToken()` llama a `/api/token/refresh/` y actualiza el access

### `AuthInterceptor`
- Añade `Authorization: Bearer <token>` a todas las peticiones protegidas
- Ante un 401, intenta renovar con refresh antes de hacer logout defensivo
- Redirige a `/login` si el refresh también falla

### `ApiEnvelopeInterceptor`
- Desenvuelve `{ ok: true, data: ... }` de todas las respuestas exitosas
- Normaliza errores `{ ok: false, message, errors }` a instancias manejables

### `AdminService`
- `hasAccess()` valida permisos staff contra `/api/admin/access/`
- `getStats(filters)` consume `/api/admin/stats/` con filtros por `days` o `start/end`
- `exportStatsCsv(filters)` descarga CSV desde `/api/admin/stats/export/`

### `ProfileService`
- `getLocal(maxAgeMs)` — devuelve perfil cacheado si no supera el TTL (10 min por defecto)
- `getProfileInsights()` — llama a `/api/profile/insights/` con datos reales por área de interés

### `ExerciseService`
- Caché en memoria con TTL de 60 s por URL+params
- La caché se invalida automáticamente ante mutaciones

### `UiSelectComponent`
- Implementa `ControlValueAccessor` — compatible con `formControlName` y `ngModel`
- Cierra el dropdown al hacer clic fuera (via `@HostListener('document:click')`)

## Patrones de estado en páginas

```ts
// Señal de datos
data = signal<MyType | null>(null);

// Derivado declarativo
label = computed(() => this.data()?.name ?? 'Sin nombre');

// Carga en ngOnInit
ngOnInit() {
  this.service.getData().subscribe({
    next: (res) => this.data.set(res),
    error: () => { /* manejo */ },
  });
}
```

## Rutas

| Ruta | Componente | Guard |
|------|-----------|-------|
| `/` | `HomeComponent` | — |
| `/login` | `LoginComponent` | — |
| `/register` | `RegisterComponent` | — |
| `/register-step2` | `RegisterStep2Component` | `nonAdminGuard` |
| `/dashboard` | `DashboardComponent` | `authGuard + nonAdminGuard` |
| `/admin` | `AdminComponent` | `authGuard + adminGuard` |
|  |  | Incluye: filtros rápidos/personalizados, export CSV, tabla top usuarios, alertas automáticas |
| `/profile` | `ProfileComponent` | `authGuard + nonAdminGuard` |
| `/profile/edit` | `ProfileEditComponent` | `authGuard + nonAdminGuard` |
| `/sport` | `SportComponent` | `authGuard + nonAdminGuard` |
| `/food` | `FoodComponent` | `authGuard + nonAdminGuard` |
| `/mindset` | `MindsetComponent` | `authGuard + nonAdminGuard` |
| `/growth` | `GrowthComponent` | `authGuard + nonAdminGuard` |
| `/challenges` | `ChallengesComponent` | `authGuard + nonAdminGuard` |
| `**` | `NotFoundComponent` | — |

## Prácticas de desarrollo

- Sin lógica compleja en templates — usar `computed` para derivados
- Sin `subscribe` anidados — usar `switchMap` / `forkJoin`
- DTOs y tipos definidos en el servicio de dominio correspondiente
- Errores de API manejados vía `catchError` o bloque `error:` en subscribe
- Mensajes de error al usuario siempre como `string` en un `signal<string>('')`

## Troubleshooting

```bash
# VS Code muestra errores TS que no aparecen en build
# Añadir en .vscode/settings.json:
# "typescript.tsdk": "frontend/node_modules/typescript/lib"

# Verificar que la URL del backend es correcta
cat src/environments/environments.ts

# Limpiar caché de build
rm -rf .angular/cache
npm start
```

