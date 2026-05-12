package com.zero.wearsync.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [PendingSyncEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingSyncDao(): PendingSyncDao
}
