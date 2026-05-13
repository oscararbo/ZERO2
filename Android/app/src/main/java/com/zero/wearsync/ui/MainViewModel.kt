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
    private val locator = ServiceLocator.get(app)
    private val reader = HealthConnectReader(app)
    private val discovery = BackendDiscovery(app)
    private val _state = MutableStateFlow(
        MainUiState(
            backendUrl = locator.repository.currentBackendUrl(),
            username = locator.repository.currentUsername(),
            loggedIn = locator.repository.hasSession()
        )
    )
    val state: StateFlow<MainUiState> = _state.asStateFlow()

    val requiredPermissions: Set<String> = HealthConnectReader.requiredPermissions

    init {
        refreshPermissionsAndPending()
        if (_state.value.backendUrl.isBlank()) {
            autoDetectBackend()
        }
    }

    fun onBackendUrlChange(value: String) {
        _state.value = _state.value.copy(backendUrl = value)
    }

    fun onUsernameChange(value: String) {
        _state.value = _state.value.copy(username = value)
    }

    fun onPasswordChange(value: String) {
        _state.value = _state.value.copy(password = value)
    }

    fun onDaysBackChange(value: String) {
        val parsed = value.toIntOrNull()?.coerceIn(1, 14) ?: 3
        _state.value = _state.value.copy(daysBack = parsed)
    }

    fun onPermissionResult(granted: Set<String>) {
        val ok = granted.containsAll(requiredPermissions)
        _state.value = _state.value.copy(permissionsGranted = ok)
    }

    fun login() {
        viewModelScope.launch {
            _state.value = _state.value.copy(working = true, status = "Logging in...")
            val s = _state.value
            val result = locator.repository.login(s.backendUrl, s.username, s.password)
            _state.value = _state.value.copy(
                working = false,
                loggedIn = result.isSuccess,
                status = result.fold(
                    onSuccess = { "Login successful" },
                    onFailure = { "Login failed: ${it.message}" }
                )
            )
        }
    }

    fun autoDetectBackend() {
        viewModelScope.launch {
            _state.value = _state.value.copy(working = true, status = "Detecting backend URL...")
            val detected = discovery.discoverBaseUrl()
            if (detected != null) {
                _state.value = _state.value.copy(
                    working = false,
                    backendUrl = detected,
                    status = "Detected backend: $detected"
                )
            } else {
                _state.value = _state.value.copy(
                    working = false,
                    status = "Auto detect failed. Enter backend URL manually."
                )
            }
        }
    }

    fun logout() {
        locator.repository.logout()
        _state.value = _state.value.copy(loggedIn = false, status = "Session cleared")
    }

    fun syncNow() {
        viewModelScope.launch {
            _state.value = _state.value.copy(working = true, status = "Reading Health Connect...")
            try {
                if (!reader.hasAllPermissions()) {
                    _state.value = _state.value.copy(working = false, status = "Grant Health Connect permissions first")
                    return@launch
                }

                val metrics = reader.readDailyMetrics(_state.value.daysBack)
                locator.repository.enqueueMetrics(metrics)
                val sync = locator.repository.syncPending()
                val pending = locator.repository.pendingCount()

                _state.value = _state.value.copy(
                    working = false,
                    pendingRows = pending,
                    status = sync.fold(
                        onSuccess = { it },
                        onFailure = { "Sync failed: ${it.message}" }
                    )
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(working = false, status = "Sync error: ${e.message}")
            }
        }
    }

    fun schedulePeriodicSync() {
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

        _state.value = _state.value.copy(status = "Periodic sync enabled (every 6h)")
    }

    fun refreshPermissionsAndPending() {
        viewModelScope.launch {
            val perms = runCatching { reader.hasAllPermissions() }.getOrDefault(false)
            val pending = runCatching { locator.repository.pendingCount() }.getOrDefault(0)
            _state.value = _state.value.copy(permissionsGranted = perms, pendingRows = pending)
        }
    }
}
