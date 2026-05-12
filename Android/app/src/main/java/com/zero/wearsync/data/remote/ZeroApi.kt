package com.zero.wearsync.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

interface ZeroApi {
    @POST("api/login/")
    suspend fun login(@Body request: LoginRequest): ApiEnvelope<LoginData>

    @POST("api/performance/wearables/")
    suspend fun ingestWearables(@Body request: WearableIngestRequest): ApiEnvelope<WearableIngestSummary>
}
