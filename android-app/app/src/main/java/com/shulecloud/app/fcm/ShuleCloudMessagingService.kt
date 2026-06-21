package com.shulecloud.app.fcm

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.shulecloud.app.AppConfig
import com.shulecloud.app.MainActivity
import com.shulecloud.app.R

/**
 * Receives FCM pushes and shows a notification. Tapping it opens MainActivity at
 * the URL carried in the message data ("url" or "link"), so the School MIS can
 * deep-link a user to a specific page (results, fees, …).
 */
class ShuleCloudMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // The web app can register this device token for the school by reading it
        // from a future JS bridge / API call. Persist for later retrieval.
        getSharedPreferences("fcm", Context.MODE_PRIVATE).edit()
            .putString("token", token).apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: "ShuleCloud"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val url = message.data["url"] ?: message.data["link"]

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (AppConfig.isInternalUrl(url)) data = Uri.parse(url)
        }
        val pending = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(
            this, getString(R.string.default_notification_channel_id)
        )
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pending)
            .build()

        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .notify(System.currentTimeMillis().toInt(), notification)
    }
}
