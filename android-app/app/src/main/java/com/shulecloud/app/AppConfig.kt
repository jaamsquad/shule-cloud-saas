package com.shulecloud.app

import android.content.Context

object AppConfig {
    /** The page users start on. The backend redirects to their school subdomain. */
    const val LOGIN_URL = "https://shulecloud.com/login"

    /** Root host. Navigation stays in-app for this host and any subdomain of it. */
    const val ROOT_DOMAIN = "shulecloud.com"

    private const val PREFS = "shulecloud"
    private const val KEY_SCHOOL = "school_subdomain"

    // Document / printable types that the in-app WebView can't render natively —
    // these are opened in the external browser (which can preview + print them).
    private val DOC_EXTENSIONS = setOf(
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "zip", "rtf", "odt", "ods"
    )

    /** True for blob:/data: URLs — files built in the browser (resource files,
     *  exports). The WebView can't render these, so we always save+open them. */
    fun isBlobOrData(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val u = url.lowercase()
        return u.startsWith("blob:") || u.startsWith("data:")
    }

    /** True if the URL points at a document/printable file we should handle natively. */
    fun isDocumentUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        if (isBlobOrData(url)) return true
        return try {
            val uri = android.net.Uri.parse(url)
            val path = uri.path?.lowercase() ?: return false
            val ext = path.substringAfterLast('.', "")
            if (ext in DOC_EXTENSIONS) return true
            // Common print/export query patterns (?print=1, ?format=pdf, /print, …)
            val full = url.lowercase()
            full.contains("format=pdf") || full.contains("export=pdf") ||
                full.contains("/print") || full.contains("print=1") || full.contains("output=pdf")
        } catch (_: Exception) { false }
    }

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

    /** The school subdomain in a URL (e.g. "greenwood" for greenwood.shulecloud.com),
     *  or null for the bare root / login host or any non-ShuleCloud URL. */
    fun schoolSubdomainOf(url: String?): String? {
        if (url.isNullOrBlank()) return null
        return try {
            val host = android.net.Uri.parse(url).host?.lowercase() ?: return null
            if (!host.endsWith(".$ROOT_DOMAIN")) return null
            val sub = host.removeSuffix(".$ROOT_DOMAIN")
            // Ignore non-tenant hosts (www, api, the portal prefixes resolve a tenant
            // server-side but the saved value should be the school label itself).
            if (sub.isBlank() || sub in setOf("www", "api", "app")) null else sub
        } catch (_: Exception) { null }
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun savedSchool(ctx: Context): String? = prefs(ctx).getString(KEY_SCHOOL, null)

    fun saveSchool(ctx: Context, subdomain: String) {
        if (savedSchool(ctx) != subdomain) prefs(ctx).edit().putString(KEY_SCHOOL, subdomain).apply()
    }

    fun clearSchool(ctx: Context) = prefs(ctx).edit().remove(KEY_SCHOOL).apply()

    /** Where to load on launch: the saved school's login page if known, else the
     *  root login. The backend keeps an authenticated session, so the school's
     *  /login redirects straight into the dashboard when already signed in. */
    fun launchUrl(ctx: Context): String {
        val school = savedSchool(ctx) ?: return LOGIN_URL
        return "https://$school.$ROOT_DOMAIN/login"
    }
}
