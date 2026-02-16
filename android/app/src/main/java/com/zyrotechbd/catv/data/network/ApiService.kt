package com.zyrotechbd.catv.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("invoices/{billId}")
    suspend fun getInvoice(@Path("billId") billId: String): InvoiceResponse

    @GET("billing")
    suspend fun getBilling(
        @Query("q") query: String?,
        @Query("month") month: Int?,
        @Query("year") year: Int?,
        @Query("page") page: Int?,
        @Query("limit") limit: Int?
    ): BillingListResponse

    @POST("billing/collect")
    suspend fun collectPayment(@Body request: BillingCollectRequest): BillingCollectResponse
}
