package com.zero.wearsync

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class PermissionsRationaleActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setContent {
      MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
          Column(
            modifier = Modifier
              .fillMaxSize()
              .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
          ) {
            Text("ZERO Wear Sync", style = MaterialTheme.typography.headlineSmall)
            Text(
              "Necesitamos permisos de Health Connect para leer pasos, ejercicio y frecuencia cardiaca y sincronizarlos con tu cuenta de ZERO."
            )
            Text(
              "Los datos se usan solo para sincronizacion y analitica de rendimiento dentro de la app."
            )
            Button(onClick = {
              val intent = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://zero-2-pink.vercel.app/")
              )
              startActivity(intent)
            }) {
              Text("Abrir politica de privacidad")
            }
            Button(onClick = { finish() }) {
              Text("Volver")
            }
          }
        }
      }
    }
  }
}
