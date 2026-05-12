package com.zero.wearsync.domain

import android.content.Context
import androidx.room.Room
import com.zero.wearsync.data.local.AppDatabase
import com.zero.wearsync.data.remote.RetrofitProvider

class ServiceLocator private constructor(context: Context) {
    private val appContext = context.applicationContext

    val sessionManager: SessionManager by lazy { SessionManager(appContext) }

    val database: AppDatabase by lazy {
        Room.databaseBuilder(appContext, AppDatabase::class.java, "zero-wear-sync.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    val retrofitProvider: RetrofitProvider by lazy { RetrofitProvider(sessionManager) }

    val repository: WearableRepository by lazy {
        WearableRepository(
            sessionManager = sessionManager,
            apiProvider = retrofitProvider,
            pendingSyncDao = database.pendingSyncDao()
        )
    }

    companion object {
        @Volatile
        private var INSTANCE: ServiceLocator? = null

        fun get(context: Context): ServiceLocator {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ServiceLocator(context).also { INSTANCE = it }
            }
        }
    }
}
