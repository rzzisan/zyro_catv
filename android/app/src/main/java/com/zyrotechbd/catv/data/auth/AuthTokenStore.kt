package com.zyrotechbd.catv.data.auth

import com.zyrotechbd.catv.core.AppContext

object AuthTokenStore {
    private val storage by lazy { AuthStorage(AppContext.app) }

    fun getToken(): String? = storage.getToken()

    fun saveToken(token: String) {
        storage.saveToken(token)
    }

    fun clear() {
        storage.clear()
    }
}
