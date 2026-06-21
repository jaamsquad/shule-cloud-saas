package com.shulecloud.app

object AppConfig {
    /** The page users start on. The backend redirects to their school subdomain. */
    const val LOGIN_URL = "https://shulecloud.com/login"

    /** Root host. Navigation stays in-app for this host and any subdomain of it. */
    const val ROOT_DOMAIN = "shulecloud.com"

    /** Returns true if a URL belongs to ShuleCloud (root or any *.shulecloud.com). */
    fun isInternalUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        return try {
            val host = android.net.Uri.parse(url).host?.lowercase() ?: return false
            host == ROOT_DOMAIN || host.endsWith(".$ROOT_DOMAIN")
        } catch (_: Exception) {
            false
        }
    }
}
