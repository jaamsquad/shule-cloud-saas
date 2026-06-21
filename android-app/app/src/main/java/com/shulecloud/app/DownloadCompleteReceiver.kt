package com.shulecloud.app

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/**
 * Fires when a DownloadManager download finishes. Shows a toast and offers to
 * open the file with the user's chosen app.
 */
class DownloadCompleteReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
        val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
        if (id == -1L) return

        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val query = DownloadManager.Query().setFilterById(id)
        dm.query(query).use { cursor ->
            if (!cursor.moveToFirst()) return
            val statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
            if (cursor.getInt(statusIdx) != DownloadManager.STATUS_SUCCESSFUL) {
                Toast.makeText(context, "Download failed", Toast.LENGTH_SHORT).show()
                return
            }
            Toast.makeText(context, "Download completed — tap the notification to open", Toast.LENGTH_LONG).show()
        }
    }
}
