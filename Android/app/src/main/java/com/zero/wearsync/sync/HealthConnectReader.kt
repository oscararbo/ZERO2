package com.zero.wearsync.sync

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.math.roundToInt

class HealthConnectReader(private val context: Context) {
    private val client by lazy { HealthConnectClient.getOrCreate(context) }
    private val zone: ZoneId = ZoneId.systemDefault()

    suspend fun hasAllPermissions(): Boolean {
        val granted = client.permissionController.getGrantedPermissions()
        return granted.containsAll(requiredPermissions)
    }

    suspend fun readDailyMetrics(daysBack: Int): List<DailyMetric> {
        val now = ZonedDateTime.now(zone)
        val from = now.minusDays(daysBack.toLong()).toLocalDate().atStartOfDay(zone).toInstant()
        val to = Instant.now()
        val range = TimeRangeFilter.between(from, to)

        data class MutableMetric(
            var steps: Int = 0,
            var activeMinutes: Int = 0,
            var calories: Double = 0.0,
            var hrSum: Int = 0,
            var hrSamples: Int = 0
        )

        val map = linkedMapOf<String, MutableMetric>()

        fun forDate(date: String): MutableMetric = map.getOrPut(date) { MutableMetric() }

        val stepRows = client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records
        for (row in stepRows) {
            val date = row.startTime.atZone(zone).toLocalDate().toString()
            forDate(date).steps += row.count.toInt()
        }

        val exerciseRows = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records
        for (row in exerciseRows) {
            val date = row.startTime.atZone(zone).toLocalDate().toString()
            val minutes = java.time.Duration.between(row.startTime, row.endTime).toMinutes().toInt().coerceAtLeast(0)
            forDate(date).activeMinutes += minutes
        }

        val calorieRows = client.readRecords(ReadRecordsRequest(TotalCaloriesBurnedRecord::class, range)).records
        for (row in calorieRows) {
            val date = row.startTime.atZone(zone).toLocalDate().toString()
            forDate(date).calories += row.energy.inKilocalories
        }

        val heartRows = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records
        for (row in heartRows) {
            val date = row.startTime.atZone(zone).toLocalDate().toString()
            val bucket = forDate(date)
            row.samples.forEach { sample ->
                bucket.hrSum += sample.beatsPerMinute.toInt()
                bucket.hrSamples += 1
            }
        }

        return map.entries.map { (date, v) ->
            DailyMetric(
                date = date,
                steps = if (v.steps > 0) v.steps else null,
                activeMinutes = if (v.activeMinutes > 0) v.activeMinutes else null,
                caloriesBurned = if (v.calories > 0) v.calories.roundToInt() else null,
                avgHeartRate = if (v.hrSamples > 0) (v.hrSum.toDouble() / v.hrSamples).roundToInt() else null
            )
        }
    }

    companion object {
        val requiredPermissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class)
        )
    }
}
