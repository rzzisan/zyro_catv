package com.zyrotechbd.catv.data.billing

import com.zyrotechbd.catv.data.network.ApiClient
import com.zyrotechbd.catv.data.network.BillingCollectRequest
import com.zyrotechbd.catv.data.network.BillingCollectResponse
import com.zyrotechbd.catv.data.network.BillingListResponse

object BillingRepository {
    suspend fun fetchBilling(
        query: String?,
        month: Int?,
        year: Int?,
        page: Int = 1,
        limit: Int = 50
    ): BillingListResponse {
        return ApiClient.service.getBilling(
            query = query,
            month = month,
            year = year,
            page = page,
            limit = limit
        )
    }

    suspend fun collect(request: BillingCollectRequest): BillingCollectResponse {
        return ApiClient.service.collectPayment(request)
    }
}
