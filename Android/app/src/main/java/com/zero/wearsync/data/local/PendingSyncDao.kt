package com.zero.wearsync.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PendingSyncDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(items: List<PendingSyncEntity>)

    @Query("SELECT * FROM pending_sync ORDER BY createdAtMillis ASC LIMIT :limit")
    suspend fun getPending(limit: Int = 100): List<PendingSyncEntity>

    @Query("DELETE FROM pending_sync WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<Long>)

    @Query("UPDATE pending_sync SET attempts = attempts + 1 WHERE id IN (:ids)")
    suspend fun incrementAttempts(ids: List<Long>)
}
