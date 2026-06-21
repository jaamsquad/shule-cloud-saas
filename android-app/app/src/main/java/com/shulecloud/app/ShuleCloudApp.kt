package com.shulecloud.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.webkit.WebView

class ShuleCloudApp : Application() {
    override fun onCreate() {
        super.onCreate()

        // Disable WebView debugging in release builds; allow it in debug only.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                getString(R.string.default_notification_channel_id),
                "ShuleCloud Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "School announcements, results and alerts" }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }
}
