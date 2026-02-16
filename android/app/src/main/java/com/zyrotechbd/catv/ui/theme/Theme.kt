package com.zyrotechbd.catv.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = BluePrimary,
    onPrimary = Sand,
    secondary = BlueDark,
    onSecondary = Sand,
    background = Sand,
    onBackground = Ink,
    surface = Sand,
    onSurface = Ink
)

private val DarkColors = darkColorScheme(
    primary = BluePrimary,
    onPrimary = Sand,
    secondary = BlueDark,
    onSecondary = Sand,
    background = Ink,
    onBackground = Sand,
    surface = Ink,
    onSurface = Sand
)

@Composable
fun ZyroTechCATVTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = Typography,
        content = content
    )
}
