package com.zyrotechbd.catv.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import com.zyrotechbd.catv.data.network.BillingRow
import com.zyrotechbd.catv.printing.PrinterManager
import kotlinx.coroutines.launch
import java.util.Calendar

@Composable
fun InvoicesScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val now = remember { Calendar.getInstance() }

    var query by remember { mutableStateOf("") }
    var month by remember { mutableStateOf((now.get(Calendar.MONTH) + 1).toString()) }
    var year by remember { mutableStateOf(now.get(Calendar.YEAR).toString()) }
    var status by remember { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<BillingRow>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Top
    ) {
        Text(text = "Invoices", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text(text = "Search (name/mobile/code)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = month,
            onValueChange = { month = it.filter { char -> char.isDigit() } },
            label = { Text(text = "Month") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = year,
            onValueChange = { year = it.filter { char -> char.isDigit() } },
            label = { Text(text = "Year") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    isLoading = true
                    status = null
                    try {
                        val monthValue = month.toIntOrNull()
                        val yearValue = year.toIntOrNull()
                        val response = BillingRepository.fetchBilling(
                            query = query.ifBlank { null },
                            month = monthValue,
                            year = yearValue
                        )
                        items = response.data
                        status = if (items.isEmpty()) "No invoices found" else null
                    } catch (error: Exception) {
                        status = "Load failed: ${error.message ?: "Unknown"}"
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = !isLoading
        ) {
            Text(text = if (isLoading) "Loading..." else "Search")
        }

        if (status != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = status.orEmpty())
        }

        Spacer(modifier = Modifier.height(12.dp))
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(items) { row ->
                InvoiceRow(
                    row = row,
                    onPrint = {
                        scope.launch {
                            status = "Printing..."
                            val error = PrinterManager.printInvoice(context, row.billId)
                            status = error ?: "Printed successfully"
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun InvoiceRow(row: BillingRow, onPrint: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(text = row.name, style = MaterialTheme.typography.titleMedium)
            Text(text = "ID: ${row.customerCode} | Bill: ${row.billId.take(8)}")
            Text(text = "Area: ${row.area?.name ?: "-"}")
            Text(text = "Due: ${row.totalDue} | Status: ${row.status}")
            Button(onClick = onPrint) {
                Text(text = "Print")
            }
        }
    }
}
