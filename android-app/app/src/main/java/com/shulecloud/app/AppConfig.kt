package com.shulecloud.app

import android.content.Context

object AppConfig {
    /** The page users start on. The backend redirects to their school subdomain. */
    const val LOGIN_URL = "https://shulecloud.com/login"

    /** Root host. Navigation stays in-app for this host and any subdomain of it. */
    const val ROOT_DOMAIN = "shulecloud.com"

    private const val PREFS = "shulecloud"
    private const val KEY_SCHOOL = "school_subdomain"

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

    /** Where to load on launch: the saved school's home if known, else login. */
    fun launchUrl(ctx: Context): String {
        val school = savedSchool(ctx) ?: return LOGIN_URL
        return "https://$school.$ROOT_DOMAIN/"
    }
}
