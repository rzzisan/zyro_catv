package com.zyrotechbd.catv.data.network

data class BillingListResponse(
    val data: List<BillingRow>,
    val summary: BillingSummary,
    val period: BillingPeriod,
    val meta: BillingMeta
)

data class BillingRow(
    val billId: String,
    val customerId: String,
    val customerCode: String,
    val name: String,
    val mobile: String?,
    val area: BillingArea?,
    val customerType: BillingCustomerType?,
    val monthlyFee: Double,
    val dueBalance: Double,
    val amount: Double,
    val paidTotal: Double,
    val status: String,
    val dueCurrent: Double,
    val advanceAmount: Double,
    val totalDue: Double,
    val lastPayment: BillingPayment?
)

data class BillingArea(
    val id: String,
    val name: String
)

data class BillingCustomerType(
    val id: String,
    val name: String
)

data class BillingPayment(
    val id: String,
    val amount: Double,
    val paidAt: String?,
    val method: String?,
    val collectedBy: BillingCollector?
)

data class BillingCollector(
    val id: String,
    val name: String
)

data class BillingSummary(
    val totalCustomers: Int,
    val totalDue: Double,
    val totalPaid: Double,
    val totalAdvance: Double,
    val monthAmount: Double
)

data class BillingPeriod(
    val month: Int,
    val year: Int
)

data class BillingMeta(
    val total: Int,
    val page: Int,
    val perPage: Int,
    val totalPages: Int
)

data class BillingCollectRequest(
    val billId: String,
    val amount: Double,
    val paidAt: String?,
    val method: String?
)

data class BillingCollectResponse(
    val data: BillingCollectData
)

data class BillingCollectData(
    val billId: String
)
