package com.zyrotechbd.catv.data.network

data class InvoiceResponse(
    val data: InvoiceData
)

data class InvoiceData(
    val bill: InvoiceBill,
    val customer: InvoiceCustomer,
    val payments: List<InvoicePayment>,
    val paidTotal: Double,
    val dueCurrent: Double,
    val advanceAmount: Double,
    val totalDue: Double,
    val lastPayment: InvoicePayment?,
    val allocationMonths: List<InvoiceAllocationMonth>,
    val company: InvoiceCompany
)

data class InvoiceBill(
    val id: String,
    val amount: Double,
    val periodMonth: Int,
    val periodYear: Int,
    val status: String
)

data class InvoiceCustomer(
    val id: String,
    val name: String,
    val customerCode: String,
    val mobile: String?,
    val address: String?,
    val dueBalance: Double?,
    val area: InvoiceArea?
)

data class InvoiceArea(
    val id: String,
    val name: String
)

data class InvoicePayment(
    val id: String,
    val amount: Double,
    val paidAt: String?,
    val method: String?,
    val collectedBy: InvoiceCollector?
)

data class InvoiceCollector(
    val id: String,
    val name: String
)

data class InvoiceAllocationMonth(
    val month: Int,
    val year: Int,
    val label: String
)

data class InvoiceCompany(
    val id: String,
    val name: String,
    val helplineNumber: String?,
    val invoiceNote: String?,
    val slogan: String?,
    val address: String?
)
