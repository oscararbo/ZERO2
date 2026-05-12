package com.zero.wearsync.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "pending_sync",
    indices = [Index(value = ["provider", "date"], unique = true)]
)
data class PendingSyncEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val provider: String = "samsung_health",
    val date: String,
    val steps: Int?,
    val activeMinutes: Int?,
    val caloriesBurned: Int?,
    val avgHeartRate: Int?,
    val source: String = "android-health-connect",
    val attempts: Int = 0,
    val createdAtMillis: Long = System.currentTimeMillis()
)
