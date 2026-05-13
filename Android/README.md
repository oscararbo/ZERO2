# ZERO Android Wear Sync (Samsung Health)

Proyecto Android robusto para sincronizar datos desde Health Connect (Samsung Health) al backend ZERO.

## Qué incluye

- Login contra `POST /api/login/` con JWT.
- Refresh automático de access token con `POST /api/token/refresh/`.
- Auto-detección del backend en la red local (`/api/health/`) para no buscar IP manualmente.
- Lectura de pasos, sesiones (minutos activos), calorías y FC desde Health Connect.
- Cola local en Room (`pending_sync`) para tolerancia offline.
- Sincronización manual y periódica con WorkManager (cada 6 horas).
- Ingesta al endpoint `POST /api/performance/wearables/` con provider `samsung_health`.

## Requisitos

- Android Studio (Koala o más reciente).
- JDK 17.
- Android SDK 35.
- App Health Connect instalada en el móvil.

## Abrir el proyecto

1. Abre Android Studio.
2. `Open` y selecciona la carpeta `Android`.
3. Espera a que termine `Gradle Sync`.
4. Si Android Studio pide actualizar plugins/dependencias, acepta las recomendaciones estables.

Compatibilidad incluida: el proyecto está fijado para funcionar con Gradle 8.5 (AGP 8.3.2).

## Si sale error `org.gradle.api.internal.HasConvention`

1. Cierra Android Studio.
2. Borra cachés locales del proyecto: carpeta `Android/.gradle/`.
3. Abre Android Studio de nuevo y ejecuta `Sync Project with Gradle Files`.
4. Si persiste, usa `File > Invalidate Caches / Restart`.
5. En `Settings > Build, Execution, Deployment > Build Tools > Gradle`:
  - `Gradle JDK`: selecciona Java 17 (por ejemplo `Android Studio jbr`).
  - `Gradle distribution`: `Use gradle wrapper`.

Nota: este proyecto ya usa `kapt` para Room (sin KSP) para evitar ese conflicto con ciertas combinaciones de caché/daemon.

## Probar en móvil

1. Activa `Opciones de desarrollador` y `Depuración USB`.
2. Conecta el móvil por USB.
3. En Android Studio, selecciona tu dispositivo.
4. Ejecuta `Run 'app'`.
5. En la app:
  - Pulsa `Auto detect backend` para detectar tu servidor automáticamente.
  - Si no detecta (redes restringidas), pon manualmente `http://<IP_DE_TU_PC>:8000/`.
   - Username/password de tu usuario en ZERO.
   - Pulsa `Login`.
   - Pulsa `Permissions` y acepta Health Connect.
   - Pulsa `Sync now`.

## Generar APK (debug) para instalar manualmente

Opción Android Studio:

1. Menú `Build`.
2. `Build Bundle(s) / APK(s)`.
3. `Build APK(s)`.
4. Cuando termine, pulsa `locate`.

Ruta típica:

- `Android/app/build/outputs/apk/debug/app-debug.apk`

Instalar APK en móvil:

1. Copia el archivo `app-debug.apk` al móvil.
2. Ábrelo y permite instalar apps desconocidas para el gestor de archivos.
3. Instala.

## Generar APK desde terminal (si tienes gradle wrapper)

Desde carpeta `Android`:

```bash
./gradlew assembleDebug
```

En Windows PowerShell:

```powershell
.\gradlew.bat assembleDebug
```

Salida:

- `app/build/outputs/apk/debug/app-debug.apk`

## APK release firmado (para distribución)

1. Android Studio -> `Build` -> `Generate Signed Bundle / APK`.
2. Elige `APK`.
3. Crea o selecciona un `keystore`.
4. Selecciona variante `release`.
5. Compila y usa el APK firmado generado.

## Notas de backend

Tu backend ya está preparado para:

- `POST /api/login/`
- `POST /api/token/refresh/`
- `POST /api/performance/wearables/`

Payload enviado por la app:

```json
{
  "provider": "samsung_health",
  "source": "android-health-connect",
  "entries": [
    {
      "date": "2026-05-13",
      "steps": 10234,
      "active_minutes": 47,
      "calories_burned": 612,
      "avg_heart_rate": 119
    }
  ]
}
```
