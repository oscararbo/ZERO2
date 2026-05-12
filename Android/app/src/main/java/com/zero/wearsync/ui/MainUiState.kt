package com.zero.wearsync.ui

data class MainUiState(
    val backendUrl: String = "",
    val username: String = "",
    val password: String = "",
    val daysBack: Int = 3,
    val loggedIn: Boolean = false,
    val permissionsGranted: Boolean = false,
    val pendingRows: Int = 0,
    val working: Boolean = false,
    val status: String = "Ready"
)
