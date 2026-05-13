package com.zero.wearsync.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import java.util.concurrent.TimeUnit

class BackendDiscovery(private val context: Context) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(250, TimeUnit.MILLISECONDS)
        .readTimeout(250, TimeUnit.MILLISECONDS)
        .build()

    suspend fun discoverBaseUrl(): String? = withContext(Dispatchers.IO) {
        val quickCandidates = listOf(
            "https://zero-mbdv.onrender.com/",
        )

        quickCandidates.firstOrNull { probe(it) }?.let { return@withContext it }

        val subnetPrefix = localSubnetPrefix() ?: return@withContext null
        scanSubnet(subnetPrefix)
    }

    private suspend fun scanSubnet(prefix: String): String? = coroutineScope {
        val batches = (1..254).chunked(32)
        for (batch in batches) {
            val results = batch.map { host ->
                async {
                    val base = "http://$prefix.$host:8000/"
                    if (probe(base)) base else null
                }
            }.awaitAll()
            val found = results.firstOrNull { it != null }
            if (found != null) return@coroutineScope found
        }
        null
    }

    private fun probe(baseUrl: String): Boolean {
        val req = Request.Builder()
            .url("${baseUrl}api/health/")
            .get()
            .build()

        return runCatching {
            client.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@use false
                val body = response.body?.string().orEmpty().lowercase()
                val okMatch = Regex("\"ok\"\\s*:\\s*true").containsMatchIn(body)
                okMatch && body.contains("zero-backend")
            }
        }.getOrDefault(false)
    }

    private fun localSubnetPrefix(): String? {
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivity.activeNetwork ?: return null
        val capabilities = connectivity.getNetworkCapabilities(network) ?: return null
        if (!capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return null

        val all = NetworkInterface.getNetworkInterfaces()?.let { Collections.list(it) }.orEmpty()
        for (iface in all) {
            if (!iface.isUp || iface.isLoopback) continue
            val addresses = Collections.list(iface.inetAddresses)
            val addr = addresses.firstOrNull { it is Inet4Address && !it.isLoopbackAddress } ?: continue
            val host = addr.hostAddress ?: continue
            val parts = host.split('.')
            if (parts.size == 4) {
                return "${parts[0]}.${parts[1]}.${parts[2]}"
            }
        }
        return null
    }
}
