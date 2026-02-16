package com.zyrotechbd.catv.printing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface

object InvoiceBitmapRenderer {
    fun renderText(context: Context, text: String, widthPx: Int): Bitmap {
        val typeface = loadKalpurush(context)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 24f
            this.typeface = typeface
        }

        val lines = text.split("\n").flatMap { wrapLine(it, paint, widthPx) }
        val lineHeight = (paint.fontMetrics.bottom - paint.fontMetrics.top).toInt()
        val heightPx = (lines.size * lineHeight).coerceAtLeast(lineHeight)
        val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        var y = -paint.fontMetrics.top
        for (line in lines) {
            canvas.drawText(line, 0f, y, paint)
            y += lineHeight
        }

        return bitmap
    }

    private fun wrapLine(line: String, paint: Paint, widthPx: Int): List<String> {
        if (line.isEmpty()) return listOf("")
        val words = line.split(" ")
        val lines = mutableListOf<String>()
        var current = ""
        for (word in words) {
            val candidate = if (current.isEmpty()) word else "$current $word"
            if (paint.measureText(candidate) <= widthPx) {
                current = candidate
            } else {
                if (current.isNotEmpty()) {
                    lines.add(current)
                }
                if (paint.measureText(word) <= widthPx) {
                    current = word
                } else {
                    val chunks = splitWord(word, paint, widthPx)
                    lines.addAll(chunks.dropLast(1))
                    current = chunks.lastOrNull().orEmpty()
                }
            }
        }
        if (current.isNotEmpty()) lines.add(current)
        return lines
    }

    private fun splitWord(word: String, paint: Paint, widthPx: Int): List<String> {
        val chunks = mutableListOf<String>()
        var current = ""
        for (char in word) {
            val candidate = "$current$char"
            if (paint.measureText(candidate) <= widthPx) {
                current = candidate
            } else {
                if (current.isNotEmpty()) chunks.add(current)
                current = char.toString()
            }
        }
        if (current.isNotEmpty()) chunks.add(current)
        return chunks
    }

    private fun loadKalpurush(context: Context): Typeface {
        return try {
            Typeface.createFromAsset(context.assets, "fonts/Kalpurush.ttf")
        } catch (_: Exception) {
            Typeface.DEFAULT
        }
    }
}
