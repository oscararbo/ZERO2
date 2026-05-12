package com.zero.wearsync.sync

data class DailyMetric(
    val date: String,
    val steps: Int? = null,
    val activeMinutes: Int? = null,
    val caloriesBurned: Int? = null,
    val avgHeartRate: Int? = null
)
