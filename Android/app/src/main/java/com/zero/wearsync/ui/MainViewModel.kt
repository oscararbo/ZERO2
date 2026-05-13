package com.zero.wearsync.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.zero.wearsync.domain.ServiceLocator
import com.zero.wearsync.sync.BackendDiscovery
import com.zero.wearsync.sync.HealthConnectReader
import com.zero.wearsync.sync.SyncWorker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MainViewModel(app: Application) : AndroidViewModel(app) {

  private companion object {
    const val DEFAULT_CLOUD_BACKEND = "https://zero-mbdv.onrender.com/"
  }

  private val locator = ServiceLocator.get(app)
  private val reader = HealthConnectReader(app)
  private val discovery = BackendDiscovery(app)

  private val _state = MutableStateFlow(
    MainUiState(
      backendUrl = locator.repository.currentBackendUrl().ifBlank { DEFAULT_CLOUD_BACKEND },
      username = locator.repository.currentUsername(),
      loggedIn = locator.repository.hasSession(),
      healthConnectAvailable = reader.isSdkAvailable()
    )
  )

  val state: StateFlow<MainUiState> = _state.asStateFlow()

  val requiredPermissions: Set<String> = HealthConnectReader.requiredPermissions

  init {
    refreshPermissionsAndPending()
    if (locator.repository.currentBackendUrl().isBlank()) {
      autoDetectBackend()
    }
  }

  fun onBackendUrlChange(v: String) {
    _state.value = _state.value.copy(backendUrl = v)
  }

  fun onUsernameChange(v: String) {
    _state.value = _state.value.copy(username = v)
  }

  fun onPasswordChange(v: String) {
    _state.value = _state.value.copy(password = v)
  }

  fun onDaysBackChange(v: String) {
    val parsed = v.toIntOrNull()?.coerceIn(1, 14) ?: 3
    _state.value = _state.value.copy(daysBack = parsed)
  }

  fun onPermissionResult(granted: Set<String>) {
    val ok = granted.containsAll(requiredPermissions)
    _state.value = _state.value.copy(
      permissionsGranted = ok,
      status = if (ok) "Permisos de Health Connect concedidos" else "Faltan permisos de Health Connect"
    )
  }

  fun canRequestHealthPermissions(): Boolean {
    val available = reader.isSdkAvailable()
    _state.value = _state.value.copy(healthConnectAvailable = available)
    if (!available) {
      _state.value = _state.value.copy(
        status = "Health Connect no disponible o sin actualizar. Abre Health Connect desde el boton de la app."
      )
    }
    return available
  }

  fun onPermissionRequestLaunchFailed() {
    _state.value = _state.value.copy(
      status = "No se pudo abrir el dialogo de permisos. Abre Health Connect manualmente."
    )
  }

  fun onOpenHealthConnectTriggered() {
    _state.value = _state.value.copy(
      status = "En Health Connect: App permissions > ZERO Wear Sync > permitir todo."
    )
  }

  fun login() = viewModelScope.launch {
    val s = _state.value
    if (s.backendUrl.isBlank()) {
      _state.value = s.copy(status = "Backend URL obligatoria")
      return@launch
    }

    _state.value = _state.value.copy(working = true, status = "Iniciando sesion...")
    val result = locator.repository.login(s.backendUrl, s.username, s.password)

    _state.value = _state.value.copy(
      working = false,
      loggedIn = result.isSuccess,
      status = result.fold(
        onSuccess = { "Login correcto" },
        onFailure = { "Login failed: ${it.message}" }
      )
    )
  }

  fun logout() {
    locator.repository.logout()
    _state.value = _state.value.copy(loggedIn = false, status = "Sesion cerrada")
  }

  fun autoDetectBackend() = viewModelScope.launch {
    _state.value = _state.value.copy(working = true, status = "Detectando backend...")
    val detected = discovery.discoverBaseUrl()

    if (detected != null) {
      _state.value = _state.value.copy(
        backendUrl = detected,
        working = false,
        status = "Backend detectado: $detected"
      )
    } else {
      _state.value = _state.value.copy(
        working = false,
        status = "No se pudo detectar backend automaticamente"
      )
    }
  }

  fun syncNow() = viewModelScope.launch {
    _state.value = _state.value.copy(working = true, status = "Leyendo Health Connect...")

    try {
      if (!_state.value.loggedIn) {
        _state.value = _state.value.copy(working = false, status = "Haz login primero")
        return@launch
      }

      if (!reader.isSdkAvailable()) {
        _state.value = _state.value.copy(working = false, status = "Health Connect no disponible")
        return@launch
      }

      if (!reader.hasAllPermissions()) {
        _state.value = _state.value.copy(working = false, status = "Concede permisos de Health Connect")
        return@launch
      }

      val metrics = reader.readDailyMetrics(_state.value.daysBack)
      locator.repository.enqueueMetrics(metrics)
      val syncResult = locator.repository.syncPending()
      val pending = locator.repository.pendingCount()

      _state.value = _state.value.copy(
        working = false,
        pendingRows = pending,
        status = syncResult.fold(
          onSuccess = { it },
          onFailure = { "Sync failed: ${it.message}" }
        )
      )
    } catch (e: Exception) {
      _state.value = _state.value.copy(
        working = false,
        status = "Sync error: ${e.message}"
      )
    }
  }

  fun schedulePeriodicSync() {
    if (!_state.value.loggedIn) {
      _state.value = _state.value.copy(status = "Haz login primero")
      return
    }
    if (!reader.isSdkAvailable()) {
      _state.value = _state.value.copy(status = "Health Connect no disponible")
      return
    }
    if (!_state.value.permissionsGranted) {
      _state.value = _state.value.copy(status = "Concede permisos de Health Connect")
      return
    }

    val request = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
      .setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build()
      )
      .build()

    WorkManager.getInstance(getApplication()).enqueueUniquePeriodicWork(
      "zero-periodic-health-sync",
      ExistingPeriodicWorkPolicy.UPDATE,
      request
    )

    _state.value = _state.value.copy(status = "Sync periodica activada (cada 6h)")
  }

  fun refreshPermissionsAndPending() = viewModelScope.launch {
    val hcAvailable = reader.isSdkAvailable()
    val perms = runCatching { reader.hasAllPermissions() }.getOrDefault(false)
    val pending = runCatching { locator.repository.pendingCount() }.getOrDefault(0)

    _state.value = _state.value.copy(
      healthConnectAvailable = hcAvailable,
      permissionsGranted = perms,
      pendingRows = pending,
      status = if (!hcAvailable) "Health Connect no disponible o sin actualizar" else _state.value.status
    )
  }
}
