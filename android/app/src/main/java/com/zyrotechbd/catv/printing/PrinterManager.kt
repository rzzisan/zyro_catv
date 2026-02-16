package com.zyrotechbd.catv.printing

import android.bluetooth.BluetoothAdapter
import android.content.Context
import com.zyrotechbd.catv.bluetooth.BlePrinter
import com.zyrotechbd.catv.bluetooth.ClassicBluetoothPrinter
import com.zyrotechbd.catv.data.invoice.InvoiceRepository
import java.util.UUID

object PrinterManager {
    private const val PRINT_WIDTH_PX = 384

    suspend fun printInvoice(context: Context, billId: String): String? {
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: return "Bluetooth not supported"
        val address = PrinterSettings.getPrinterAddress()
            ?: return "No default printer selected"
        if (!adapter.isEnabled) return "Bluetooth is disabled"

        val invoice = InvoiceRepository.getInvoice(billId)
        val text = InvoiceFormatter.format(invoice)
        val bitmap = InvoiceBitmapRenderer.renderText(context, text, PRINT_WIDTH_PX)
        val payload = EscPosEncoder.bitmapToEscPos(bitmap)

        return when (PrinterSettings.getPrinterType()) {
            PrinterType.CLASSIC -> {
                val device = adapter.getRemoteDevice(address)
                val printer = ClassicBluetoothPrinter()
                val socket = printer.connect(device) ?: return "Printer connection failed"
                printer.print(socket, payload)
                printer.disconnect(socket)
                null
            }
            PrinterType.BLE -> {
                val device = adapter.getRemoteDevice(address)
                val serviceUuid = runCatching { UUID.fromString(PrinterSettings.getBleServiceUuid()) }
                    .getOrElse { return "Invalid BLE service UUID" }
                val characteristicUuid = runCatching { UUID.fromString(PrinterSettings.getBleCharacteristicUuid()) }
                    .getOrElse { return "Invalid BLE characteristic UUID" }
                val printer = BlePrinter()
                val result = printer.print(context, device, serviceUuid, characteristicUuid, payload)
                if (result) null else "BLE print failed"
            }
        }
    }
}
