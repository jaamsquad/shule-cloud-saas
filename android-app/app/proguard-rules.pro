# Keep WebView JavaScript interfaces (none currently, but future-proof).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase Messaging
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep our FCM service + receivers referenced from the manifest.
-keep class com.shulecloud.app.fcm.** { *; }
-keep class com.shulecloud.app.DownloadCompleteReceiver { *; }
