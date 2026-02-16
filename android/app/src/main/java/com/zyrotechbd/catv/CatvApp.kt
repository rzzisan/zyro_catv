package com.zyrotechbd.catv

import android.app.Application
import com.zyrotechbd.catv.core.AppContext

class CatvApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppContext.init(this)
    }
}
