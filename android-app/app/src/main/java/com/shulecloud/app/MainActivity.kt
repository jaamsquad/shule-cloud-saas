package com.shulecloud.app

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.shulecloud.app.databinding.ActivityMainBinding
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val webView get() = binding.webView

    // File chooser state
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    // Pending camera/mic permission request from the web page
    private var pendingPermissionRequest: PermissionRequest? = null

    private var backPressedOnce = false
    private val downloadReceiver = DownloadCompleteReceiver()
    private var currentPopup: WebView? = null

    // ── Activity result launchers ─────────────────────────────────────────────
    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris: Array<Uri>? = when {
                result.resultCode != RESULT_OK -> null
                result.data?.clipData != null -> {
                    val clip = result.data!!.clipData!!
                    Array(clip.itemCount) { clip.getItemAt(it).uri }
                }
                result.data?.dataString != null -> arrayOf(Uri.parse(result.data!!.dataString))
                cameraImageUri != null -> arrayOf(cameraImageUri!!)
                else -> null
            }
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
            cameraImageUri = null
        }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            val req = pendingPermissionRequest
            pendingPermissionRequest = null
            if (req != null) {
                if (grants.values.all { it }) req.grant(req.resources) else req.deny()
            }
        }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op */ }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Keep the splash screen until the first page begins to render.
        val splash = installSplashScreen()
        var keepSplash = true
        splash.setKeepOnScreenCondition { keepSplash }

        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)   // edge-to-edge
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        requestNotificationPermissionIfNeeded()
        setupToolbar()
        configureWebView()
        configureCookies()
        setupClients { keepSplash = false }
        setupDownloads()
        setupBack()
        setupErrorRetry()

        // Priority: a deep link (VIEW intent) → the saved school's home → login.
        val target = intent?.data?.toString()?.takeIf { AppConfig.isInternalUrl(it) }
            ?: AppConfig.launchUrl(this)

        if (savedInstanceState == null) {
            if (NetworkUtil.isOnline(this)) webView.loadUrl(target)
            else { keepSplash = false; showError(ErrorType.NO_INTERNET) }
        } else {
            webView.restoreState(savedInstanceState)
            keepSplash = false
        }
    }

    /**
     * Remembers which school the user is on so the next launch opens it directly.
     * Saves the subdomain when on a school page; clears it when the user is sent
     * back to the login page (i.e. logged out).
     */
    private fun rememberSchoolFromUrl(url: String?) {
        val school = AppConfig.schoolSubdomainOf(url)
        if (school != null) {
            AppConfig.saveSchool(this, school)
        } else if (url != null && url.contains("/login")) {
            AppConfig.clearSchool(this)
        }
    }

    // ── WebView ───────────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() = with(webView.settings) {
        javaScriptEnabled = true
        domStorageEnabled = true                      // DOM / HTML5 / local + session storage
        databaseEnabled = true
        javaScriptCanOpenWindowsAutomatically = true
        setSupportMultipleWindows(true)               // popups / multiple windows
        loadsImagesAutomatically = true
        mediaPlaybackRequiresUserGesture = false      // allow media playback
        builtInZoomControls = true
        displayZoomControls = false
        setGeolocationEnabled(true)
        allowFileAccess = false                       // security: no file:// access
        allowContentAccess = true
        // HTTPS only — never downgrade. (Cleartext also blocked at the manifest level.)
        mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        userAgentString = "$userAgentString ShuleCloudApp/${BuildConfig.VERSION_NAME}"
        cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
    }.also {
        webView.addJavascriptInterface(PrintBridge(), "ShuleCloudPrint")
    }

    // Installs JS bridges on the main page:
    //  1) Intercept blob:/data: downloads (CSV/Excel/PDF built client-side) and
    //     hand them to native, since Android DownloadManager can't fetch blobs.
    //  2) Leave window.print() alone here — print uses a popup window which is
    //     handled in onCreateWindow.
    private fun injectBridges() {
        val js = """
        (function(){
          if(window.__scBridges) return; window.__scBridges=true;
          function send(blob, name){
            var r=new FileReader();
            r.onloadend=function(){ try{ ShuleCloudPrint.saveBlob(r.result, name||'download', blob.type||''); }catch(e){} };
            r.readAsDataURL(blob);
          }
          // Intercept programmatic anchor downloads with blob:/data: hrefs.
          var origClick=HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click=function(){
            try{
              var href=this.href||'';
              if((href.indexOf('blob:')===0||href.indexOf('data:')===0) && this.download){
                var name=this.download;
                if(href.indexOf('data:')===0){ ShuleCloudPrint.saveBlob(href, name, ''); return; }
                fetch(href).then(function(res){return res.blob();}).then(function(b){send(b,name);});
                return;
              }
            }catch(e){}
            return origClick.apply(this, arguments);
          };
        })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    /** JS bridge for the web app's print actions. */
    inner class PrintBridge {
        // A direct document URL print (rare) — open it in the in-app browser.
        @android.webkit.JavascriptInterface
        fun printCurrent(url: String?) {
            runOnUiThread { openInAppBrowser(url ?: webView.url) }
        }

        // The popup-based print (window.open + document.write + window.print).
        // Print the popup WebView via Android's native print service.
        @android.webkit.JavascriptInterface
        fun printPopup(title: String?) {
            runOnUiThread { currentPopup?.let { printWebView(it, title) } }
        }

        // Receives a base64 blob download (CSV/Excel/etc.) that DownloadManager
        // can't fetch, and saves it to the Downloads folder.
        @android.webkit.JavascriptInterface
        fun saveBlob(base64: String?, fileName: String?, mime: String?) {
            if (base64.isNullOrBlank()) return
            runOnUiThread { saveBase64ToDownloads(base64, fileName ?: "download", mime ?: "application/octet-stream") }
        }

        // The popup blob couldn't be read — fall back to native print of the popup.
        @android.webkit.JavascriptInterface
        fun blobFailed() {
            runOnUiThread { currentPopup?.let { printWebView(it, "Document") } }
        }
    }

    /**
     * Decodes a base64 document, saves a copy to public Downloads, AND opens it
     * in the device's viewer (PDF app / gallery / Office app) — the closest thing
     * to the desktop in-page preview, since the WebView itself can't render PDFs.
     */
    private fun saveBase64ToDownloads(base64: String, fileName: String, mime: String) {
        try {
            val pure = base64.substringAfter(",", base64)
            val bytes = android.util.Base64.decode(pure, android.util.Base64.DEFAULT)
            val safeName = fileName.ifBlank { "document" }
            val finalMime = mime.ifBlank { guessMime(safeName) }

            // 1) Save a viewable copy in app cache and open it.
            val cacheDir = File(this.cacheDir, "docs").apply { mkdirs() }
            val cacheFile = File(cacheDir, safeName)
            cacheFile.outputStream().use { it.write(bytes) }
            openSavedFile(cacheFile, finalMime)

            // 2) Also persist to public Downloads so the user keeps it.
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = android.content.ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                        put(MediaStore.Downloads.MIME_TYPE, finalMime)
                        put(MediaStore.Downloads.IS_PENDING, 1)
                    }
                    val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    if (uri != null) {
                        contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                        values.clear(); values.put(MediaStore.Downloads.IS_PENDING, 0)
                        contentResolver.update(uri, values, null, null)
                    }
                } else {
                    val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    File(dir, safeName).outputStream().use { it.write(bytes) }
                }
            } catch (_: Exception) { /* keeping a copy is best-effort */ }
        } catch (e: Exception) {
            Toast.makeText(this, "Couldn't open document", Toast.LENGTH_SHORT).show()
        }
    }

    /** Opens a saved file with whatever app handles its type (PDF/image/Office). */
    private fun openSavedFile(file: File, mime: String) {
        try {
            val uri = FileProvider.getUriForFile(this, "${packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mime)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(Intent.createChooser(intent, "Open with").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            Toast.makeText(this, "Saved to Downloads (no app to open it)", Toast.LENGTH_LONG).show()
        }
    }

    private fun guessMime(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
        "pdf" -> "application/pdf"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        "xls" -> "application/vnd.ms-excel"
        "csv" -> "text/csv"
        "doc" -> "application/msword"
        "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else -> "application/octet-stream"
    }

    // ── Document download (any PDF / image / Excel, anywhere in the app) ───────

    /** Download a real http(s) document URL via DownloadManager (with cookies). */
    private fun downloadDocumentUrl(url: String?) {
        url ?: return
        try {
            val cookie = CookieManager.getInstance().getCookie(url)
            val fileName = URLUtil.guessFileName(url, null, null)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                if (!cookie.isNullOrBlank()) addRequestHeader("cookie", cookie)
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                setTitle(fileName)
                setDescription("Downloading from ShuleCloud")
            }
            (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
            Toast.makeText(this, "Downloading $fileName…", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show()
        }
    }

    /** Read a blob:/data: download fired from the MAIN WebView and save+open it. */
    private fun grabUrlFromMain(url: String, contentDisposition: String?, mime: String?) {
        val suggested = try { URLUtil.guessFileName(url, contentDisposition, mime) } catch (_: Exception) { "document" }
        val js = """
        (function(){
          try{
            var u = "${url.replace("\"", "\\\"")}";
            var name = "$suggested".replace(/[^a-z0-9._-]+/gi,'_');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', u, true);
            xhr.responseType = 'blob';
            xhr.onload = function(){
              try{
                var b = xhr.response; var t = (b && b.type) || '';
                if(!/\.[a-z0-9]{2,5}$/i.test(name)){
                  var ext = t.indexOf('pdf')>=0?'.pdf':t.indexOf('sheet')>=0?'.xlsx':t.indexOf('csv')>=0?'.csv':t.indexOf('png')>=0?'.png':t.indexOf('jpeg')>=0?'.jpg':'';
                  name = name + ext;
                }
                var fr = new FileReader();
                fr.onloadend = function(){ ShuleCloudPrint.saveBlob(fr.result, name, t); };
                fr.readAsDataURL(b);
              }catch(e){}
            };
            xhr.send();
          }catch(e){}
        })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    /** A popup tried to download a document. Handle blob/data via JS, else manager. */
    private fun handlePopupDocument(url: String?, contentDisposition: String?, mime: String?, popup: WebView) {
        url ?: return
        if (url.startsWith("blob:") || url.startsWith("data:")) {
            grabPopupBlob(popup, url)
        } else {
            downloadDocumentUrl(url)
            removePopup(popup)
        }
    }

    /** Read a blob:/data: document from inside the popup into base64 and save it.
     *  Uses XHR(responseType=blob) against the popup's OWN location, so it works
     *  for large PDFs (no giant URL string round-tripped through Kotlin). */
    private fun grabPopupBlob(popup: WebView?, @Suppress("UNUSED_PARAMETER") url: String) {
        popup ?: return
        val js = """
        (function(){
          try{
            var u = document.URL || location.href;
            var name = (document.title||'document').replace(/[^a-z0-9._-]+/gi,'_');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', u, true);
            xhr.responseType = 'blob';
            xhr.onload = function(){
              try{
                var b = xhr.response;
                var t = (b && b.type) || '';
                if(!/\.[a-z0-9]{2,5}$/i.test(name)){
                  var ext = t.indexOf('pdf')>=0?'.pdf':t.indexOf('sheet')>=0?'.xlsx':t.indexOf('excel')>=0?'.xls':t.indexOf('csv')>=0?'.csv':t.indexOf('png')>=0?'.png':t.indexOf('jpeg')>=0?'.jpg':t.indexOf('word')>=0?'.docx':'.pdf';
                  name = name + ext;
                }
                var fr = new FileReader();
                fr.onloadend = function(){ ShuleCloudPrint.saveBlob(fr.result, name, t); };
                fr.onerror = function(){ ShuleCloudPrint.blobFailed(); };
                fr.readAsDataURL(b);
              }catch(e){ ShuleCloudPrint.blobFailed(); }
            };
            xhr.onerror = function(){ ShuleCloudPrint.blobFailed(); };
            xhr.send();
          }catch(e){ ShuleCloudPrint.blobFailed(); }
        })();
        """.trimIndent()
        popup.evaluateJavascript(js, null)
        // Remove the (blank) popup window after the content has been read.
        popup.postDelayed({ removePopup(popup) }, 3000)
    }

    /** Sends a WebView's rendered content to Android's print service (creates a
     *  PDF the user can print or save), then removes the off-screen popup. */
    private fun printWebView(target: WebView, title: String?) {
        try {
            val jobName = (title?.takeIf { it.isNotBlank() } ?: getString(R.string.app_name)) + " Document"
            val printManager = getSystemService(PRINT_SERVICE) as android.print.PrintManager
            val adapter = target.createPrintDocumentAdapter(jobName)
            printManager.print(
                jobName, adapter,
                android.print.PrintAttributes.Builder().build()
            )
        } catch (e: Exception) {
            Toast.makeText(this, "Couldn't start printing", Toast.LENGTH_SHORT).show()
        } finally {
            // Give the print service a moment to capture the adapter before removal.
            target.postDelayed({ removePopup(target) }, 1500)
        }
    }

    private fun removePopup(popup: WebView?) {
        popup ?: return
        try { binding.root.removeView(popup); popup.destroy() } catch (_: Exception) {}
        if (currentPopup === popup) currentPopup = null
    }

    private fun configureCookies() = with(CookieManager.getInstance()) {
        setAcceptCookie(true)
        setAcceptThirdPartyCookies(webView, true)     // subdomain redirects, etc.
        // Cookies persist by default; we only flush, never clear automatically.
        flush()
    }

    private fun setupClients(onFirstPaint: () -> Unit) {
        webView.webViewClient = ShuleWebViewClient(
            onPageStarted = { binding.progressBar.show(); onFirstPaint() },
            onPageFinished = { url ->
                binding.progressBar.hide()
                CookieManager.getInstance().flush()
                rememberSchoolFromUrl(url)
                injectBridges()
            },
            onError = { showError(it) },
            openExternal = ::openInExternalBrowser,
            downloadDoc = ::downloadDocumentUrl
        )

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.progressBar.progress = newProgress
            }

            // File chooser (upload: camera, images, PDFs, docs, multiple)
            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                openFileChooser(params)
                return true
            }

            // Camera / microphone permission requested by the page
            override fun onPermissionRequest(request: PermissionRequest?) {
                request ?: return
                val needed = mutableListOf<String>()
                request.resources.forEach { res ->
                    when (res) {
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                            needed.add(android.Manifest.permission.CAMERA)
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                            needed.add(android.Manifest.permission.RECORD_AUDIO)
                    }
                }
                if (needed.isEmpty()) { request.grant(request.resources); return }
                pendingPermissionRequest = request
                permissionLauncher.launch(needed.toTypedArray())
            }

            // Geolocation permission
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?, callback: GeolocationPermissions.Callback?
            ) { callback?.invoke(origin, true, false) }

            // New windows / target=_blank. Two cases:
            //  (a) A document is opened (PDF/image/Excel via a real url or a blob)
            //      → DOWNLOAD it (the WebView can't render PDFs/Excel anyway).
            //  (b) The web app's print: window.open("","_blank") + document.write +
            //      window.print(). We host it off-screen and route its print() to
            //      Android's native print service (which produces a PDF you can save).
            override fun onCreateWindow(
                view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?
            ): Boolean {
                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                val popup = WebView(this@MainActivity)
                popup.settings.javaScriptEnabled = true
                popup.settings.domStorageEnabled = true
                popup.settings.allowFileAccess = false
                popup.addJavascriptInterface(PrintBridge(), "ShuleCloudPrint")
                binding.root.addView(popup, 0, 0)
                currentPopup = popup

                // If the popup loads a document (incl. blob/data), download it.
                popup.setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
                    handlePopupDocument(url, contentDisposition, mimeType, popup)
                })

                popup.webViewClient = object : android.webkit.WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        v: WebView?, req: android.webkit.WebResourceRequest?
                    ): Boolean {
                        val u = req?.url?.toString()
                        when {
                            // blob:/data: (resource files, PDFs built client-side) →
                            // let the popup load it so onPageFinished can read it.
                            AppConfig.isBlobOrData(u) -> return false
                            // Real http(s) document url → download via DownloadManager.
                            AppConfig.isDocumentUrl(u) -> { downloadDocumentUrl(u); removePopup(popup) }
                            // Other internal pages → continue in the main WebView.
                            AppConfig.isInternalUrl(u) -> { webView.loadUrl(u!!); removePopup(popup) }
                            // External links → system browser.
                            else -> { openInExternalBrowser(u); removePopup(popup) }
                        }
                        return true
                    }

                    override fun onPageFinished(v: WebView?, url: String?) {
                        // The url param can be empty/truncated for large data: PDFs,
                        // so decide by asking the page what it actually is. If the
                        // popup is a document (data:/blob: or a non-HTML content type)
                        // grab + save it; otherwise treat it as a print page.
                        v?.evaluateJavascript(
                            "(function(){try{var u=document.URL||'';var ct=document.contentType||'';" +
                            "if(u.indexOf('blob:')===0||u.indexOf('data:')===0||(ct&&ct.indexOf('text/html')<0))return 'DOC';return 'PAGE';}catch(e){return 'PAGE';}})();"
                        ) { result ->
                            val r = result?.replace("\"", "") ?: "PAGE"
                            if (r == "DOC") grabPopupBlob(v, url ?: "")
                            else v.evaluateJavascript(
                                "window.print=function(){ShuleCloudPrint.printPopup(document.title);};", null
                            )
                        }
                    }
                }
                transport.webView = popup
                resultMsg.sendToTarget()
                return true
            }
        }
    }

    // ── Downloads (DownloadManager) ───────────────────────────────────────────
    private fun setupDownloads() {
        val filter = android.content.IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, filter, RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(downloadReceiver, filter)
        }

        webView.setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            // blob:/data: can't be fetched by DownloadManager — read them from the
            // page via JS instead (the same path the resource viewer uses).
            if (url != null && (url.startsWith("blob:") || url.startsWith("data:"))) {
                grabUrlFromMain(url, contentDisposition, mimeType)
                return@DownloadListener
            }
            try {
                val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimeType)
                    addRequestHeader("cookie", CookieManager.getInstance().getCookie(url))
                    addRequestHeader("User-Agent", userAgent)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    setTitle(fileName)
                    setDescription("Downloading from ShuleCloud")
                }
                (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                Toast.makeText(this, "Download started: $fileName", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show()
            }
        })
        // "Download completed" + tap-to-open is handled by DownloadCompleteReceiver.
    }

    // ── File chooser intent (camera + documents, multi-select) ────────────────
    private fun openFileChooser(params: WebChromeClient.FileChooserParams?) {
        val acceptTypes = params?.acceptTypes?.filter { it.isNotBlank() } ?: emptyList()
        val mime = if (acceptTypes.isNotEmpty()) acceptTypes.joinToString(",") else "*/*"
        val allowMultiple =
            params?.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE

        val contentIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (acceptTypes.size == 1) acceptTypes[0] else "*/*"
            if (acceptTypes.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, acceptTypes.toTypedArray())
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple)
        }

        // Offer the camera when an image is acceptable.
        val cameraIntent = createCameraIntentOrNull(mime)

        val chooser = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, contentIntent)
            putExtra(Intent.EXTRA_TITLE, "Select or capture")
            if (cameraIntent != null) putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
        }
        try {
            fileChooserLauncher.launch(chooser)
        } catch (e: ActivityNotFoundException) {
            filePathCallback?.onReceiveValue(null)
            filePathCallback = null
        }
    }

    private fun createCameraIntentOrNull(mime: String): Intent? {
        if (!mime.contains("image") && mime != "*/*") return null
        return try {
            val photoFile = File.createTempFile("capture_", ".jpg", cacheDir)
            cameraImageUri = FileProvider.getUriForFile(
                this, "${packageName}.fileprovider", photoFile
            )
            Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }.takeIf { it.resolveActivity(packageManager) != null }
        } catch (e: Exception) { null }
    }

    // ── External links ────────────────────────────────────────────────────────
    private fun openInExternalBrowser(url: String?) {
        url ?: return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Cannot open link", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Opens a URL in an in-app browser (Chrome Custom Tab) — used for prints and
     * documents (PDF/Office), which the WebView can't render but Custom Tabs can,
     * while keeping the user inside the app. Falls back to the system browser if
     * no Custom Tabs provider is available.
     */
    private fun openInAppBrowser(url: String?) {
        url ?: return
        try {
            val tab = androidx.browser.customtabs.CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            tab.intent.putExtra(
                "androidx.browser.customtabs.extra.SHARE_STATE",
                2 /* SHARE_STATE_OFF */
            )
            tab.launchUrl(this, Uri.parse(url))
        } catch (e: Exception) {
            openInExternalBrowser(url)   // fallback if no Custom Tabs provider
        }
    }

    // ── Back navigation ───────────────────────────────────────────────────────
    private fun setupBack() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.errorView.root.isShown) { finish(); return }
                if (webView.canGoBack()) { webView.goBack(); return }
                if (backPressedOnce) { finish(); return }
                backPressedOnce = true
                Toast.makeText(this@MainActivity, "Press back again to exit", Toast.LENGTH_SHORT).show()
                webView.postDelayed({ backPressedOnce = false }, 2000)
            }
        })
    }

    private fun setupToolbar() {
        binding.toolbar.setOnMenuItemClickListener { item ->
            if (item.itemId == R.id.action_refresh) {
                if (NetworkUtil.isOnline(this)) webView.reload()
                else showError(ErrorType.NO_INTERNET)
                true
            } else false
        }
    }

    // ── Error page ────────────────────────────────────────────────────────────
    private fun showError(type: ErrorType) {
        webView.visibility = android.view.View.GONE
        binding.progressBar.hide()
        with(binding.errorView) {
            root.visibility = android.view.View.VISIBLE
            errorTitle.text = getString(type.titleRes)
            errorMessage.text = getString(type.messageRes)
        }
    }

    private fun setupErrorRetry() {
        binding.errorView.retryButton.setOnClickListener {
            binding.errorView.root.visibility = android.view.View.GONE
            webView.visibility = android.view.View.VISIBLE
            if (NetworkUtil.isOnline(this)) {
                if (webView.url != null) webView.reload() else webView.loadUrl(AppConfig.launchUrl(this))
            } else showError(ErrorType.NO_INTERNET)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() { super.onPause(); CookieManager.getInstance().flush() }

    override fun onDestroy() {
        try { unregisterReceiver(downloadReceiver) } catch (_: Exception) {}
        super.onDestroy()
    }
}
