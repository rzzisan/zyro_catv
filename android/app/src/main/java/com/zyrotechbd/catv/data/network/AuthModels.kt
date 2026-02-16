package com.zyrotechbd.catv.data.network

data class LoginRequest(
    val mobile: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: UserDto
)

data class UserDto(
    val id: String,
    val name: String,
    val mobile: String,
    val role: String,
    val companyId: String
)
