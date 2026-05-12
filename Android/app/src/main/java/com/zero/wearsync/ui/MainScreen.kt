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
    onDaysBackChange: (String) -> Unit,
    onLogin: () -> Unit,
    onLogout: () -> Unit,
    onRequestPermissions: () -> Unit,
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
                placeholder = { Text("http://10.0.2.2:8000/") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

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

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onRequestPermissions, enabled = !state.working) { Text("Permissions") }
                Button(onClick = onSyncNow, enabled = !state.working && state.loggedIn) { Text("Sync now") }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSchedulePeriodic, enabled = !state.working && state.loggedIn) { Text("Enable periodic") }
                Button(onClick = onRefreshStatus, enabled = !state.working) { Text("Refresh status") }
            }

            Text("Logged in: ${state.loggedIn}")
            Text("Permissions granted: ${state.permissionsGranted}")
            Text("Pending queue rows: ${state.pendingRows}")
            Text("Status: ${state.status}")
        }
    }
}
