package com.zero.wearsync

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.health.connect.client.PermissionController
import com.zero.wearsync.ui.MainScreen
import com.zero.wearsync.ui.MainViewModel

class MainActivity : ComponentActivity() {

  private val viewModel by viewModels<MainViewModel>()

  private val permissionsLauncher = registerForActivityResult(
    PermissionController.createRequestPermissionResultContract()
  ) { granted ->
    viewModel.onPermissionResult(granted)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setContent {
      val state by viewModel.state.collectAsState()

      MaterialTheme {
        Surface {
          MainScreen(
            state = state,

            onBackendUrlChange = viewModel::onBackendUrlChange,
            onUsernameChange = viewModel::onUsernameChange,
            onPasswordChange = viewModel::onPasswordChange,
            onAutoDetectBackend = viewModel::autoDetectBackend,
            onDaysBackChange = viewModel::onDaysBackChange,
            onImportFormatChange = viewModel::onImportFormatChange,
            onImportPayloadChange = viewModel::onImportPayloadChange,
            onFillSampleImport = viewModel::fillSampleImport,
            onImportManualData = viewModel::importManualData,
            onLogin = viewModel::login,
            onLogout = viewModel::logout,

            onRequestPermissions = {
              if (!viewModel.canRequestHealthPermissions()) {
                viewModel.onOpenHealthConnectTriggered()
                try {
                  startActivity(Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"))
                } catch (_: Exception) {
                  startActivity(
                    Intent(
                      Intent.ACTION_VIEW,
                      Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")
                    )
                  )
                }
              } else {
                runCatching {
                  permissionsLauncher.launch(viewModel.requiredPermissions)
                }.onFailure {
                  viewModel.onPermissionRequestLaunchFailed()
                }
              }
            },

            onOpenHealthConnect = {
              try {
                startActivity(
                  Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                )
              } catch (_: Exception) {
                startActivity(
                  Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")
                  )
                )
              }
            },

            onSyncNow = viewModel::syncNow,
            onSchedulePeriodic = viewModel::schedulePeriodicSync,
            onRefreshStatus = viewModel::refreshPermissionsAndPending
          )
        }
      }
    }
  }
}
