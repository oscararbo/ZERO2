package com.zero.wearsync.domain

import com.zero.wearsync.data.local.PendingSyncDao
import com.zero.wearsync.data.local.PendingSyncEntity
import com.zero.wearsync.data.remote.LoginRequest
import com.zero.wearsync.data.remote.RetrofitProvider
import com.zero.wearsync.data.remote.WearableEntryDto
import com.zero.wearsync.data.remote.WearableIngestRequest
import com.zero.wearsync.sync.DailyMetric
import kotlinx.coroutines.delay
import retrofit2.HttpException

class WearableRepository(
    private val sessionManager: SessionManager,
    private val apiProvider: RetrofitProvider,
    private val pendingSyncDao: PendingSyncDao
) {
    private fun enforceSecureBaseUrl(baseUrl: String): String {
        val trimmed = baseUrl.trim()
        if (trimmed.isBlank()) return trimmed

        val isLocalHttp = trimmed.startsWith("http://10.0.2.2") ||
            trimmed.startsWith("http://127.0.0.1") ||
            trimmed.startsWith("http://localhost")

        if (trimmed.startsWith("http://") && !isLocalHttp) {
            return "https://${trimmed.removePrefix("http://")}".trimEnd('/') + "/"
        }

        return trimmed
    }

    suspend fun login(baseUrl: String, username: String, password: String): Result<Unit> {
        return runCatching {
            val normalizedBase = enforceSecureBaseUrl(baseUrl.ifBlank { sessionManager.backendUrl })
            if (normalizedBase.isBlank()) {
                throw IllegalStateException("Backend URL is empty. Auto detect first or set it manually.")
            }

            if (normalizedBase.startsWith("http://") && !normalizedBase.contains("10.0.2.2") && !normalizedBase.contains("127.0.0.1") && !normalizedBase.contains("localhost")) {
                throw IllegalStateException("Use HTTPS backend URL. Cleartext HTTP is blocked by Android security policy.")
            }

            sessionManager.backendUrl = normalizedBase
            val response = apiProvider.api().login(LoginRequest(username.trim(), password))
            if (!response.ok || response.data == null) {
                throw IllegalStateException(response.message ?: "Login failed")
            }
            sessionManager.accessToken = response.data.access
            sessionManager.refreshToken = response.data.refresh
            sessionManager.username = username.trim()
        }
    }

    suspend fun enqueueMetrics(metrics: List<DailyMetric>) {
        val entities = metrics.map {
            PendingSyncEntity(
                provider = "samsung_health",
                date = it.date,
                steps = it.steps,
                activeMinutes = it.activeMinutes,
                caloriesBurned = it.caloriesBurned,
                avgHeartRate = it.avgHeartRate
            )
        }
        if (entities.isNotEmpty()) {
            pendingSyncDao.upsert(entities)
        }
    }

    suspend fun syncPending(limit: Int = 50): Result<String> {
        return runCatching {
            val pending = pendingSyncDao.getPending(limit)
            if (pending.isEmpty()) return@runCatching "No pending rows"

            val response = retryOnServiceUnavailable {
                apiProvider.api().ingestWearables(
                    WearableIngestRequest(
                        entries = pending.map {
                            WearableEntryDto(
                                date = it.date,
                                steps = it.steps,
                                activeMinutes = it.activeMinutes,
                                caloriesBurned = it.caloriesBurned,
                                avgHeartRate = it.avgHeartRate
                            )
                        }
                    )
                )
            }

            if (response == null) {
                return@runCatching "Backend temporarily unavailable (503). ${pending.size} row(s) remain queued."
            }

            if (!response.ok || response.data == null) {
                pendingSyncDao.incrementAttempts(pending.map { it.id })
                throw IllegalStateException(response.message ?: "Sync rejected by backend")
            }

            pendingSyncDao.deleteByIds(pending.map { it.id })
            "Synced ${response.data.processed} rows (created=${response.data.created}, updated=${response.data.updated})"
        }
    }

    suspend fun pendingCount(): Int = pendingSyncDao.getPending(1000).size

    private suspend fun <T> retryOnServiceUnavailable(block: suspend () -> T): T? {
        var lastError: HttpException? = null

        repeat(3) { attempt ->
            try {
                return block()
            } catch (e: HttpException) {
                if (e.code() != 503) throw e
                lastError = e
                if (attempt < 2) {
                    delay((attempt + 1) * 1000L)
                }
            }
        }

        return null
    }

    fun currentBackendUrl(): String = sessionManager.backendUrl

    fun currentUsername(): String = sessionManager.username

    fun hasSession(): Boolean = sessionManager.accessToken.isNotBlank() && sessionManager.refreshToken.isNotBlank()

    fun logout() = sessionManager.clearSession()
}
