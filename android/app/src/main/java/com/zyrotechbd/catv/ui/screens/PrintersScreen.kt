package com.zyrotechbd.catv.ui.screens

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.zyrotechbd.catv.core.BluetoothPermissions
import com.zyrotechbd.catv.printing.PrinterManager
import com.zyrotechbd.catv.printing.PrinterSettings
import com.zyrotechbd.catv.printing.PrinterType
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PrintersScreen() {
    val context = LocalContext.current
    val adapter = BluetoothAdapter.getDefaultAdapter()
    val scope = rememberCoroutineScope()
    var billId by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var printerType by remember { mutableStateOf(PrinterSettings.getPrinterType()) }
    var selectedClassicAddress by remember { mutableStateOf(PrinterSettings.getPrinterAddress()) }
    var selectedBleAddress by remember { mutableStateOf(PrinterSettings.getPrinterAddress()) }
    var bleServiceUuid by remember { mutableStateOf(PrinterSettings.getBleServiceUuid()) }
    var bleCharacteristicUuid by remember { mutableStateOf(PrinterSettings.getBleCharacteristicUuid()) }
    var isScanning by remember { mutableStateOf(false) }
    val scanResults = remember { mutableStateListOf<BluetoothDevice>() }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    val scanCallback = remember {
        object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val device = result.device
                if (scanResults.none { it.address == device.address }) {
                    scanResults.add(device)
                }
            }
        }
    }

    LaunchedEffect(isScanning) {
        if (isScanning) {
            delay(10000)
            adapter?.bluetoothLeScanner?.stopScan(scanCallback)
            isScanning = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "Printers", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(12.dp))

        if (adapter == null) {
            Text(text = "Bluetooth not supported")
        } else {
            val missing = BluetoothPermissions.missingPermissions(context)
            if (missing.isNotEmpty()) {
                Text(text = "Bluetooth permissions required")
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = { permissionLauncher.launch(missing.toTypedArray()) }) {
                    Text(text = "Grant permissions")
                }
            } else if (!adapter.isEnabled) {
                Text(text = "Bluetooth is disabled")
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Button(
                        onClick = { printerType = PrinterType.CLASSIC },
                        enabled = printerType != PrinterType.CLASSIC
                    ) {
                        Text(text = "Classic")
                    }
                    Button(
                        onClick = { printerType = PrinterType.BLE },
                        enabled = printerType != PrinterType.BLE
                    ) {
                        Text(text = "BLE")
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                if (printerType == PrinterType.CLASSIC) {
                    val devices = adapter.bondedDevices?.toList().orEmpty()
                    if (devices.isEmpty()) {
                        Text(text = "No paired printers found")
                    } else {
                        Text(text = "Paired devices:")
                        Spacer(modifier = Modifier.height(8.dp))
                        devices.forEach { device ->
                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = device.name ?: "Unknown",
                                    modifier = Modifier.weight(1f)
                                )
                                val isSelected = selectedClassicAddress == device.address
                                TextButton(onClick = {
                                    selectedClassicAddress = device.address
                                    PrinterSettings.setPrinterType(PrinterType.CLASSIC)
                                    PrinterSettings.setPrinterAddress(device.address)
                                }) {
                                    Text(text = if (isSelected) "Selected" else "Select")
                                }
                            }
                        }
                    }
                } else {
                    val scanner = adapter.bluetoothLeScanner
                    if (scanner == null) {
                        Text(text = "BLE not supported")
                    } else {
                    Button(
                        onClick = {
                            if (!isScanning) {
                                scanResults.clear()
                                scanner.startScan(scanCallback)
                                isScanning = true
                            }
                        },
                        enabled = !isScanning
                    ) {
                        Text(text = if (isScanning) "Scanning..." else "Scan BLE")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    scanResults.forEach { device ->
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = device.name ?: device.address,
                                modifier = Modifier.weight(1f)
                            )
                            val isSelected = selectedBleAddress == device.address
                            TextButton(onClick = {
                                selectedBleAddress = device.address
                                PrinterSettings.setPrinterType(PrinterType.BLE)
                                PrinterSettings.setPrinterAddress(device.address)
                                PrinterSettings.setBleUuids(bleServiceUuid, bleCharacteristicUuid)
                            }) {
                                Text(text = if (isSelected) "Selected" else "Select")
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = bleServiceUuid,
                        onValueChange = { bleServiceUuid = it.trim() },
                        label = { Text(text = "BLE Service UUID") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = bleCharacteristicUuid,
                        onValueChange = { bleCharacteristicUuid = it.trim() },
                        label = { Text(text = "BLE Characteristic UUID") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(onClick = {
                        PrinterSettings.setBleUuids(bleServiceUuid, bleCharacteristicUuid)
                    }) {
                        Text(text = "Save UUIDs")
                    }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = billId,
                    onValueChange = { billId = it.trim() },
                    label = { Text(text = "Bill ID") },
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = {
                        scope.launch {
                            if (billId.isBlank()) {
                                status = "Enter Bill ID"
                                return@launch
                            }
                            status = "Printing..."
                            val error = PrinterManager.printInvoice(context, billId)
                            status = error ?: "Printed successfully"
                        }
                    }
                ) {
                    Text(text = "Load & Print Invoice")
                }

                if (status != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = status.orEmpty())
                }
            }
        }
    }
}
