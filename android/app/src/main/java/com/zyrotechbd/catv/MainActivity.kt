package com.zyrotechbd.catv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.zyrotechbd.catv.data.auth.AuthRepository
import com.zyrotechbd.catv.data.auth.AuthTokenStore
import com.zyrotechbd.catv.ui.MainAppShell
import com.zyrotechbd.catv.ui.theme.ZyroTechCATVTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ZyroTechCATVTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppRoot()
                }
            }
        }
    }
}

@Composable
private fun AppRoot() {
    val scope = rememberCoroutineScope()
    var token by remember { mutableStateOf(AuthTokenStore.getToken()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    if (token == null) {
        LoginScreen(
            isLoading = isLoading,
            errorMessage = errorMessage,
            onLogin = { mobile, password ->
                scope.launch {
                    isLoading = true
                    errorMessage = null
                    try {
                        val response = AuthRepository.login(mobile, password)
                        AuthTokenStore.saveToken(response.token)
                        token = response.token
                    } catch (error: Exception) {
                        errorMessage = "Login failed. Check credentials."
                    } finally {
                        isLoading = false
                    }
                }
            }
        )
    } else {
        MainAppShell(
            onLogout = {
                AuthTokenStore.clear()
                token = null
            }
        )
    }
}

@Composable
private fun LoginScreen(
    isLoading: Boolean,
    errorMessage: String?,
    onLogin: (String, String) -> Unit
) {
    var mobile by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "ZyroTech CATV", style = MaterialTheme.typography.headlineSmall)
        Text(text = "API: ${BuildConfig.API_BASE_URL}")
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedTextField(
            value = mobile,
            onValueChange = { mobile = it.trim() },
            label = { Text(text = "Mobile") },
            singleLine = true
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text(text = "Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation()
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { onLogin(mobile, password) },
            enabled = !isLoading && mobile.isNotBlank() && password.isNotBlank()
        ) {
            Text(text = if (isLoading) "Signing in..." else "Sign In")
        }
        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = errorMessage, color = MaterialTheme.colorScheme.error)
        }
    }
}

