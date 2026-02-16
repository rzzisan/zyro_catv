package com.zyrotechbd.catv.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.zyrotechbd.catv.data.billing.BillingRepository
import com.zyrotechbd.catv.data.network.BillingCollectRequest
import com.zyrotechbd.catv.printing.PrinterManager
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun BillingScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var billId by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var method by remember { mutableStateOf("CASH") }
    var status by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "Billing", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = billId,
            onValueChange = { billId = it.trim() },
            label = { Text(text = "Bill ID") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = amount,
            onValueChange = { amount = it.filter { char -> char.isDigit() || char == '.' } },
            label = { Text(text = "Amount") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = method,
            onValueChange = { method = it.trim().uppercase(Locale.getDefault()) },
            label = { Text(text = "Method") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    if (billId.isBlank() || amount.isBlank()) {
                        status = "Bill ID এবং Amount দিন"
                        return@launch
                    }
                    isLoading = true
                    status = "Collecting payment..."
                    try {
                        val paidAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                            .format(Date())
                        BillingRepository.collect(
                            BillingCollectRequest(
                                billId = billId,
                                amount = amount.toDouble(),
                                paidAt = paidAt,
                                method = method
                            )
                        )
                        status = "Payment success. Printing..."
                        val printError = PrinterManager.printInvoice(context, billId)
                        status = printError ?: "Printed successfully"
                    } catch (error: Exception) {
                        status = "Failed: ${error.message ?: "Unknown"}"
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = !isLoading
        ) {
            Text(text = if (isLoading) "Processing..." else "Collect & Print")
        }
        if (status != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = status.orEmpty())
        }
    }
}
