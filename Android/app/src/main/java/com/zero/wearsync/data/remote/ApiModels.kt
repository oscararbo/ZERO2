package com.zero.wearsync.data.remote

import com.google.gson.annotations.SerializedName

data class ApiEnvelope<T>(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("data") val data: T? = null,
    @SerializedName("message") val message: String? = null
)

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginData(
    val access: String,
    val refresh: String,
    @SerializedName("is_staff") val isStaff: Boolean = false
)

data class RefreshRequest(
    val refresh: String
)

data class RefreshResponse(
    val access: String
)

data class WearableEntryDto(
    val date: String,
    val steps: Int? = null,
    @SerializedName("active_minutes") val activeMinutes: Int? = null,
    @SerializedName("calories_burned") val caloriesBurned: Int? = null,
    @SerializedName("avg_heart_rate") val avgHeartRate: Int? = null
)

data class WearableIngestRequest(
    val provider: String = "samsung_health",
    val source: String = "android-health-connect",
    val entries: List<WearableEntryDto>
)

data class WearableIngestSummary(
    val processed: Int,
    val created: Int,
    val updated: Int
)
