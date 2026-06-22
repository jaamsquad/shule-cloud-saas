package com.shulecloud.app

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

/**
 * Fires when a DownloadManager download finishes. Opens the file in the device's
 * viewer (PDF app / gallery / Office) so the user sees it immediately, the same
 * way the desktop modal previews it.
 */
class DownloadCompleteReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
        val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
        if (id == -1L) return

        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        dm.query(DownloadManager.Query().setFilterById(id)).use { cursor ->
            if (!cursor.moveToFirst()) return
            val statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
            if (cursor.getInt(statusIdx) != DownloadManager.STATUS_SUCCESSFUL) {
                Toast.makeText(context, "Download failed", Toast.LENGTH_SHORT).show()
                return
            }
            val uriIdx = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
            val mimeIdx = cursor.getColumnIndex(DownloadManager.COLUMN_MEDIA_TYPE)
            val localUri = cursor.getString(uriIdx)
            val mime = cursor.getString(mimeIdx) ?: "*/*"
            if (localUri.isNullOrBlank()) return

            // DownloadManager exposes a content:// URI we can hand to a viewer.
            val viewUri = dm.getUriForDownloadedFile(id) ?: Uri.parse(localUri)
            try {
                val view = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(viewUri, mime)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(Intent.createChooser(view, "Open with").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) {
                Toast.makeText(context, "Saved to Downloads — open from the notification", Toast.LENGTH_LONG).show()
            }
        }
    }
}
