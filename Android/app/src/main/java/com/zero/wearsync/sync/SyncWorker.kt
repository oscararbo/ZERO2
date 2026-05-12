package com.zero.wearsync.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.zero.wearsync.domain.ServiceLocator

class SyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val locator = ServiceLocator.get(applicationContext)
        val reader = HealthConnectReader(applicationContext)

        return try {
            if (!reader.hasAllPermissions()) {
                Result.failure(workDataOf("error" to "Health Connect permissions missing"))
            } else {
                val metrics = reader.readDailyMetrics(daysBack = 3)
                locator.repository.enqueueMetrics(metrics)
                val syncResult = locator.repository.syncPending()

                if (syncResult.isSuccess) {
                    Result.success(workDataOf("message" to syncResult.getOrNull().orEmpty()))
                } else {
                    Result.retry()
                }
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
