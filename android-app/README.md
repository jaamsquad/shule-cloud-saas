# ShuleCloud — Android WebView app

A native Kotlin Android app that wraps the ShuleCloud School MIS in a secure
WebView. It loads `https://shulecloud.com/login`, follows the backend's redirect
to each school's subdomain, and keeps the session across launches.

- **Package:** `com.shulecloud.app`
- **Min SDK:** 26 (Android 8.0) · **Target/Compile SDK:** 34
- **Kotlin · AndroidX · Material 3 · edge-to-edge · dark mode · phone + tablet**

## Features
- Splash screen (AndroidX SplashScreen) with the ShuleCloud logo.
- Connectivity check on launch; a custom **offline** page with **Retry**.
- Loads `shulecloud.com/login`; allows the redirect to `*.shulecloud.com`.
- **Session persistence:** cookies (incl. third-party for subdomains), DOM /
  local / session storage are kept; nothing is cleared automatically. Cookies
  are flushed on pause/page-finish. Logging out is driven by the web app.
- WebView: JavaScript, DOM/HTML5 storage, file upload, downloads, zoom,
  geolocation, media playback, hardware acceleration, popups / multiple windows.
- **File upload** via the native picker — camera capture, images, PDFs, docs,
  multi-select. Camera/mic permissions requested on demand.
- **Downloads** via `DownloadManager` (PDF/Excel/image/ZIP/Word) with
  "started"/"completed" toasts; open from the system notification.
- **FCM** push notifications; tapping one deep-links to the carried URL.
- **URL handling:** stays in-app for `shulecloud.com` and any subdomain; opens
  everything else (YouTube, external sites) in the device browser. Never Chrome
  Custom Tabs for internal pages.
- **Back navigation:** goes back in history, else "Press back again to exit".
- **Security:** HTTPS only (`usesCleartextTraffic=false`, mixed content never
  allowed), `allowFileAccess=false`, WebView debugging off in release, SSL
  errors cancelled (never bypassed).
- **Custom error pages** for No Internet / Server Unavailable / 404 / 500 / SSL,
  each with Retry. Material loading indicator while pages load.
- **Deep links:** `https://<school>.shulecloud.com/...` open directly to the page.

## Build
1. Open `android-app/` in Android Studio (Giraffe+), or use the CLI.
2. **Firebase:** replace `app/google-services.json` with the real file from your
   Firebase project (same package `com.shulecloud.app`). The committed file is a
   placeholder so the project compiles; FCM won't deliver until you swap it.
3. Build:
   ```bash
   ./gradlew :app:assembleDebug      # debug APK
   ./gradlew :app:assembleRelease    # release (configure signing first)
   ```
   APK: `app/build/outputs/apk/`.

## Wiring FCM tokens to a school (optional, later)
`ShuleCloudMessagingService` saves the device token in SharedPreferences
(`fcm` → `token`). To target a device from the MIS, expose that token to the web
app (e.g. a small `@JavascriptInterface`) and register it against the logged-in
user server-side. Notifications may include `data.url` / `data.link` to deep-link.

## Notes / limitations
- The app trusts the system trust store for TLS (no cert pinning). Add pinning in
  `ShuleWebViewClient` if you want it.
- Geolocation is auto-granted to ShuleCloud origins; tighten in
  `onGeolocationPermissionsShowPrompt` if you'd rather prompt.
- Android restricts background work; FCM handles push while the app is closed.
