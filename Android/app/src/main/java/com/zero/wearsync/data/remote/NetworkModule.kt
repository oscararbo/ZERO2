package com.zero.wearsync.data.remote

import com.google.gson.Gson
import com.zero.wearsync.domain.SessionManager
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class RetrofitProvider(
    private val sessionManager: SessionManager
) {
    private val gson = Gson()

    private val authInterceptor = Interceptor { chain ->
        val token = sessionManager.accessToken
        val request = if (token.isNotBlank()) {
            chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            chain.request()
        }
        chain.proceed(request)
    }

    private val authAuthenticator = Authenticator { _: Route?, response: Response ->
        if (response.request.url.encodedPath.contains("/api/token/refresh/")) {
            return@Authenticator null
        }

        val refresh = sessionManager.refreshToken
        val base = sessionManager.backendUrl
        if (refresh.isBlank() || base.isBlank()) return@Authenticator null

        val newToken = refreshToken(base, refresh) ?: return@Authenticator null
        sessionManager.accessToken = newToken

        response.request.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .build()
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .authenticator(authAuthenticator)
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .build()

    private fun refreshToken(baseUrl: String, refresh: String): String? {
        val json = gson.toJson(RefreshRequest(refresh))
        val request = Request.Builder()
            .url("${baseUrl}api/token/refresh/")
            .post(json.toRequestBody("application/json".toMediaType()))
            .build()

        return client.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) return@use null
            val body = resp.body?.string().orEmpty()
            val parsed = gson.fromJson(body, RefreshResponse::class.java)
            parsed?.access
        }
    }

    fun api(): ZeroApi {
        val baseUrl = sessionManager.backendUrl.ifBlank { "https://zero-mbdv.onrender.com/" }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(ZeroApi::class.java)
    }
}
