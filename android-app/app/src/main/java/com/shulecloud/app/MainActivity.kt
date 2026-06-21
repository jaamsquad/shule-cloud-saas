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
        configureWebView()
        configureCookies()
        setupClients { keepSplash = false }
        setupDownloads()
        setupBack()
        setupErrorRetry()
        setupPullToRefresh()

        // Deep link (VIEW intent) or normal launch.
        val target = intent?.data?.toString()?.takeIf { AppConfig.isInternalUrl(it) }
            ?: AppConfig.LOGIN_URL

        if (savedInstanceState == null) {
            if (NetworkUtil.isOnline(this)) webView.loadUrl(target)
            else { keepSplash = false; showError(ErrorType.NO_INTERNET) }
        } else {
            webView.restoreState(savedInstanceState)
            keepSplash = false
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
            onPageFinished = {
                binding.progressBar.hide()
                binding.swipeRefresh.isRefreshing = false
                CookieManager.getInstance().flush()
            },
            onError = { showError(it) },
            openExternal = ::openInExternalBrowser
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

            // New windows / target=_blank → load in the same WebView (no Chrome)
            override fun onCreateWindow(
                view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?
            ): Boolean {
                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                val popup = WebView(this@MainActivity)
                popup.webViewClient = object : android.webkit.WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        v: WebView?, req: android.webkit.WebResourceRequest?
                    ): Boolean {
                        val u = req?.url?.toString()
                        if (AppConfig.isInternalUrl(u)) webView.loadUrl(u!!) else openInExternalBrowser(u)
                        return true
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

    private fun setupPullToRefresh() {
        binding.swipeRefresh.setOnRefreshListener {
            if (NetworkUtil.isOnline(this)) webView.reload()
            else { binding.swipeRefresh.isRefreshing = false; showError(ErrorType.NO_INTERNET) }
        }
        // Only allow the pull-to-refresh gesture when the page is scrolled to the
        // very top. Otherwise scrolling inner areas (e.g. the school sidebar) or
        // dragging mid-page would trigger an unwanted refresh.
        binding.swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            webView.scrollY > 0
        }
    }

    // ── Error page ────────────────────────────────────────────────────────────
    private fun showError(type: ErrorType) {
        binding.swipeRefresh.visibility = android.view.View.GONE
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
            binding.swipeRefresh.visibility = android.view.View.VISIBLE
            if (NetworkUtil.isOnline(this)) {
                if (webView.url != null) webView.reload() else webView.loadUrl(AppConfig.LOGIN_URL)
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
