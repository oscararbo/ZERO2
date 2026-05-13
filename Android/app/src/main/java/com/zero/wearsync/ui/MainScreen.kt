package com.zero.wearsync.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun MainScreen(
    state: MainUiState,
    onBackendUrlChange: (String) -> Unit,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onAutoDetectBackend: () -> Unit,
    onDaysBackChange: (String) -> Unit,
    onImportFormatChange: (String) -> Unit,
    onImportPayloadChange: (String) -> Unit,
    onFillSampleImport: () -> Unit,
    onImportManualData: () -> Unit,
    onLogin: () -> Unit,
    onLogout: () -> Unit,
    onRequestPermissions: () -> Unit,
    onOpenHealthConnect: () -> Unit,
    onSyncNow: () -> Unit,
    onSchedulePeriodic: () -> Unit,
    onRefreshStatus: () -> Unit
) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("ZERO Wear Sync", style = MaterialTheme.typography.headlineSmall)
            Text("Sincroniza Samsung Health (Health Connect) con tu backend Django.")

            OutlinedTextField(
                value = state.backendUrl,
                onValueChange = onBackendUrlChange,
                label = { Text("Backend URL") },
                placeholder = { Text("https://zero-mbdv.onrender.com/") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Button(onClick = onAutoDetectBackend, enabled = !state.working) {
                Text("Auto detect backend")
            }

            OutlinedTextField(
                value = state.username,
                onValueChange = onUsernameChange,
                label = { Text("Username") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = state.password,
                onValueChange = onPasswordChange,
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onLogin, enabled = !state.working) { Text("Login") }
                Button(onClick = onLogout, enabled = !state.working) { Text("Logout") }
            }

            OutlinedTextField(
                value = state.daysBack.toString(),
                onValueChange = onDaysBackChange,
                label = { Text("Days back (1-14)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Text("Import data (recommended: JSON for Health Connect-like payloads)")

            OutlinedTextField(
                value = state.importFormat,
                onValueChange = onImportFormatChange,
                label = { Text("Import format: json or csv") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = state.importPayload,
                onValueChange = onImportPayloadChange,
                label = { Text("JSON/CSV payload") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 6
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onFillSampleImport, enabled = !state.working) { Text("Load sample") }
                Button(onClick = onImportManualData, enabled = !state.working) { Text("Import data") }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onRequestPermissions, enabled = !state.working) {
                    Text("Permissions")
                }
                Button(onClick = onOpenHealthConnect, enabled = !state.working) {
                    Text("Open Health Connect")
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSyncNow, enabled = !state.working && state.loggedIn) { Text("Sync now") }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSchedulePeriodic, enabled = !state.working && state.loggedIn) { Text("Enable periodic") }
                Button(onClick = onRefreshStatus, enabled = !state.working) { Text("Refresh status") }
            }

            Text("Logged in: ${state.loggedIn}")
            Text("Health Connect available: ${state.healthConnectAvailable}")
            Text("Permissions granted: ${state.permissionsGranted}")
            Text("Pending queue rows: ${state.pendingRows}")
            Text("Status: ${state.status}")
        }
    }
}
