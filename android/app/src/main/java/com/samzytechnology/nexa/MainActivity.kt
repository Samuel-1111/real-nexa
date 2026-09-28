package com.samzytechnology.nexa

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var alarmManager: AlarmManager

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportZoom(false)
            userAgentString = userAgentString + " NEXA-Android/1.1"
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(webView.settings, WebSettingsCompat.FORCE_DARK_OFF)
        }

        webView.addJavascriptInterface(NexaNativeBridge(this, alarmManager), "NexaNative")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (request.resources.any { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE || it == PermissionRequest.RESOURCE_VIDEO_CAPTURE }) {
                        request.grant(request.resources)
                    }
                }
            }
        }

        requestPermissionsIfNeeded()
        webView.loadUrl("https://real-nexa.vercel.app/welcome")
        handleWakeIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleWakeIntent(intent)
    }

    private fun handleWakeIntent(intent: Intent?) {
        val query = intent?.getStringExtra(NexaVoiceService.EXTRA_QUERY)?.trim() ?: return
        if (query.isEmpty()) return
        webView.postDelayed({
            val safe = org.json.JSONObject.quote(query)
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('nexa-native-voice',{detail:{query:$safe}}));",
                null
            )
        }, 1200)
        intent?.removeExtra(NexaVoiceService.EXTRA_QUERY)
    }

    private fun requestPermissionsIfNeeded() {
        val needed = mutableListOf<String>()
        listOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA).forEach {
            if (ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED) needed.add(it)
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (needed.isNotEmpty()) ActivityCompat.requestPermissions(this, needed.toTypedArray(), 1001)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}

class NexaNativeBridge(private val context: Context, private val alarmManager: AlarmManager) {
    @JavascriptInterface
    fun scheduleReminder(title: String, triggerAtMillis: Long): Boolean {
        if (triggerAtMillis <= System.currentTimeMillis()) return false
        val intent = Intent(context, ReminderAlarmReceiver::class.java).apply { putExtra("title", title.take(180)) }
        val requestCode = (triggerAtMillis xor title.hashCode().toLong()).toInt()
        val pending = android.app.PendingIntent.getBroadcast(context, requestCode, intent, android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending)
        return true
    }

    @JavascriptInterface
    fun cancelReminder(triggerAtMillis: Long, title: String): Boolean {
        val intent = Intent(context, ReminderAlarmReceiver::class.java)
        val requestCode = (triggerAtMillis xor title.hashCode().toLong()).toInt()
        val pending = android.app.PendingIntent.getBroadcast(context, requestCode, intent, android.app.PendingIntent.FLAG_NO_CREATE or android.app.PendingIntent.FLAG_IMMUTABLE) ?: return true
        alarmManager.cancel(pending)
        pending.cancel()
        return true
    }

    @JavascriptInterface
    fun startVoiceService(): Boolean {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return false
        return try {
            val intent = Intent(context, NexaVoiceService::class.java)
            ContextCompat.startForegroundService(context, intent)
            true
        } catch (_: Exception) { false }
    }

    @JavascriptInterface
    fun stopVoiceService(): Boolean {
        return context.stopService(Intent(context, NexaVoiceService::class.java))
    }

    @JavascriptInterface
    fun setFlashlight(enabled: Boolean): Boolean {
        return try {
            val camera = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val id = camera.cameraIdList.firstOrNull { camera.getCameraCharacteristics(it).get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE) == true } ?: return false
            camera.setTorchMode(id, enabled)
            true
        } catch (_: Exception) { false }
    }

    @JavascriptInterface
    fun openApp(packageName: String): Boolean {
        val allowed = setOf("com.whatsapp", "com.google.android.youtube", "com.android.camera", "com.google.android.GoogleCamera", context.packageName)
        if (packageName !in allowed) return false
        val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return true
    }
}
