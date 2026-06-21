package com.shulecloud.app

import android.graphics.Bitmap
import android.net.http.SslError
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Keeps navigation inside ShuleCloud (root + any *.shulecloud.com subdomain),
 * opens external links in the system browser, surfaces error pages, and handles
 * SSL errors safely (never blindly proceeding).
 */
class ShuleWebViewClient(
    private val onPageStarted: () -> Unit,
    private val onPageFinished: () -> Unit,
    private val onError: (ErrorType) -> Unit,
    private val openExternal: (String?) -> Unit,
) : WebViewClient() {

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val url = request?.url?.toString() ?: return false
        // Allow ShuleCloud (login + school subdomains) to load in-app; the
        // backend's redirect to subdomain.shulecloud.com passes through here.
        if (AppConfig.isInternalUrl(url)) return false
        // Anything else (YouTube, external sites) → device browser.
        openExternal(url)
        return true
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        onPageStarted()
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        onPageFinished()
    }

    override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
        super.onReceivedError(view, request, error)
        // Only act on main-frame failures (ignore sub-resource hiccups).
        if (request?.isForMainFrame != true) return
        if (!NetworkUtil.isOnline(view?.context ?: return)) onError(ErrorType.NO_INTERNET)
        else onError(ErrorType.SERVER_UNAVAILABLE)
    }

    override fun onReceivedHttpError(
        view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?
    ) {
        super.onReceivedHttpError(view, request, errorResponse)
        if (request?.isForMainFrame != true) return
        when (errorResponse?.statusCode) {
            404 -> onError(ErrorType.NOT_FOUND)
            in 500..599 -> onError(ErrorType.SERVER_ERROR)
            else -> { /* non-fatal */ }
        }
    }

    override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
        // Never proceed on an SSL error — cancel and show a clear message.
        handler?.cancel()
        onError(ErrorType.SSL_ERROR)
    }
}
