package com.zyrotechbd.catv.printing

import android.graphics.Bitmap

object EscPosEncoder {
    fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        val bytesPerRow = (width + 7) / 8
        val imageBytes = ByteArray(bytesPerRow * height)

        var offset = 0
        for (y in 0 until height) {
            var byte = 0
            var bit = 0
            for (x in 0 until width) {
                val pixel = bitmap.getPixel(x, y)
                val luminance = (android.graphics.Color.red(pixel) * 0.299 +
                    android.graphics.Color.green(pixel) * 0.587 +
                    android.graphics.Color.blue(pixel) * 0.114)
                val isBlack = luminance < 160
                if (isBlack) {
                    byte = byte or (1 shl (7 - bit))
                }
                bit++
                if (bit == 8) {
                    imageBytes[offset++] = byte.toByte()
                    byte = 0
                    bit = 0
                }
            }
            if (bit != 0) {
                imageBytes[offset++] = byte.toByte()
            }
        }

        val xL = (bytesPerRow and 0xFF).toByte()
        val xH = ((bytesPerRow shr 8) and 0xFF).toByte()
        val yL = (height and 0xFF).toByte()
        val yH = ((height shr 8) and 0xFF).toByte()

        val header = byteArrayOf(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH)
        val init = byteArrayOf(0x1B, 0x40)
        val feed = byteArrayOf(0x0A, 0x0A, 0x0A)
        val cut = byteArrayOf(0x1D, 0x56, 0x01)

        return init + header + imageBytes + feed + cut
    }
}
