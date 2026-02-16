package com.zyrotechbd.catv.data.auth

import com.zyrotechbd.catv.data.network.ApiClient
import com.zyrotechbd.catv.data.network.LoginRequest
import com.zyrotechbd.catv.data.network.LoginResponse

object AuthRepository {
    suspend fun login(mobile: String, password: String): LoginResponse {
        return ApiClient.service.login(LoginRequest(mobile = mobile, password = password))
    }
}
