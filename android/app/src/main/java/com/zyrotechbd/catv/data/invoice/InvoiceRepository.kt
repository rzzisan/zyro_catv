package com.zyrotechbd.catv.data.invoice

import com.zyrotechbd.catv.data.network.ApiClient
import com.zyrotechbd.catv.data.network.InvoiceData

object InvoiceRepository {
    suspend fun getInvoice(billId: String): InvoiceData {
        return ApiClient.service.getInvoice(billId).data
    }
}
