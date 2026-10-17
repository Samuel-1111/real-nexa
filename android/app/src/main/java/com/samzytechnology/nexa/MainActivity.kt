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
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var alarmManager: AlarmManager
    private var pendingSpeechRequest = false
    private var textToSpeech: TextToSpeech? = null
    @Volatile private var textToSpeechReady = false

    companion object {
        private const val SPEECH_REQUEST_CODE = 4107
        private const val MICROPHONE_PERMISSION_REQUEST_CODE = 4108
    }

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
            mediaPlaybackRequiresUserGesture = true
            allowFileAccess = false
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportZoom(false)
            userAgentString = userAgentString + " NEXA-Android/2.0"
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(webView.settings, WebSettingsCompat.FORCE_DARK_OFF)
        }
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.let { engine ->
                    val nigeria = Locale("en", "NG")
                    engine.language = if (engine.isLanguageAvailable(nigeria) >= TextToSpeech.LANG_AVAILABLE) nigeria else Locale.US
                    engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(utteranceId: String?) = Unit
                        override fun onDone(utteranceId: String?) {
                            webView.post { webView.evaluateJavascript("window.onNexaSpeechFinished && window.onNexaSpeechFinished()", null) }
                        }
                        override fun onError(utteranceId: String?) {
                            webView.post { webView.evaluateJavascript("window.onNexaSpeechFinished && window.onNexaSpeechFinished()", null) }
                        }
                    })
                    textToSpeechReady = true
                }
            }
        }
        webView.addJavascriptInterface(NexaNativeBridge(this, this, alarmManager), "NexaNative")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    // Native speech recognition uses the Android runtime permission below.
                    request.grant(request.resources)
                }
            }
        }
        // No background "Hey NEXA" listener and no foreground microphone service.
        webView.loadUrl("https://real-nexa.vercel.app/welcome")
    }

    fun speakNative(text: String): Boolean {
        val engine = textToSpeech
        if (!textToSpeechReady || engine == null || text.isBlank()) return false
        runOnUiThread {
            if (textToSpeechReady) {
                engine.speak(text.take(4000), TextToSpeech.QUEUE_FLUSH, null, "nexa-${System.currentTimeMillis()}")
            }
        }
        return true
    }

    fun startNativeSpeechRecognition() {
        runOnUiThread {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                pendingSpeechRequest = true
                requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), MICROPHONE_PERMISSION_REQUEST_CODE)
                return@runOnUiThread
            }
            launchSpeechRecognizer()
        }
    }

    private fun launchSpeechRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            sendSpeechError("Speech recognition is unavailable on this device. Install or enable a speech recognition service and try again.")
            return
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-NG")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "en-NG")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to NEXA")
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        try {
            startActivityForResult(intent, SPEECH_REQUEST_CODE)
        } catch (_: Exception) {
            sendSpeechError("NEXA could not open the device speech recognizer. Check that a speech service is enabled.")
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != MICROPHONE_PERMISSION_REQUEST_CODE) return
        val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
        if (granted && pendingSpeechRequest) {
            pendingSpeechRequest = false
            launchSpeechRecognizer()
        } else {
            pendingSpeechRequest = false
            sendSpeechError("Microphone permission was denied. Allow microphone access in Android settings to use voice input.")
        }
    }

    @Deprecated("Deprecated in Android, retained for compatibility with the current Activity implementation")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != SPEECH_REQUEST_CODE) return
        if (resultCode == RESULT_OK) {
            val transcript = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.trim()
            if (!transcript.isNullOrEmpty()) {
                webView.post {
                    webView.evaluateJavascript("window.onNexaSpeechResult && window.onNexaSpeechResult(${JSONObject.quote(transcript)})", null)
                }
            } else {
                sendSpeechError("NEXA did not hear any words. Please try speaking again.")
            }
        } else {
            sendSpeechError("Voice input stopped. Please try again.")
        }
    }

    private fun sendSpeechError(message: String) {
        if (!::webView.isInitialized) return
        webView.post {
            webView.evaluateJavascript("window.onNexaSpeechError && window.onNexaSpeechError(${JSONObject.quote(message)})", null)
        }
    }

    override fun onDestroy() {
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        super.onDestroy()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}

class NexaNativeBridge(
    private val context: Context,
    private val activity: MainActivity,
    private val alarmManager: AlarmManager
) {
    @JavascriptInterface
    fun speakText(text: String): Boolean = activity.speakNative(text)

    @JavascriptInterface
    fun startSpeechRecognition() {
        activity.startNativeSpeechRecognition()
    }

    @JavascriptInterface
    fun scheduleReminder(title: String, triggerAtMillis: Long): Boolean {
        if (triggerAtMillis <= System.currentTimeMillis()) return false
        val intent = Intent(context, ReminderAlarmReceiver::class.java).apply {
            putExtra("title", title.take(180))
        }
        val requestCode = (triggerAtMillis xor title.hashCode().toLong()).toInt()
        val pending = android.app.PendingIntent.getBroadcast(
            context, requestCode, intent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending)
        return true
    }

    @JavascriptInterface
    fun cancelReminder(triggerAtMillis: Long, title: String): Boolean {
        val intent = Intent(context, ReminderAlarmReceiver::class.java)
        val requestCode = (triggerAtMillis xor title.hashCode().toLong()).toInt()
        val pending = android.app.PendingIntent.getBroadcast(
            context, requestCode, intent,
            android.app.PendingIntent.FLAG_NO_CREATE or android.app.PendingIntent.FLAG_IMMUTABLE
        ) ?: return true
        alarmManager.cancel(pending)
        pending.cancel()
        return true
    }

    @JavascriptInterface
    fun setFlashlight(enabled: Boolean): Boolean = try {
        val camera = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val id = camera.cameraIdList.firstOrNull {
            camera.getCameraCharacteristics(it)
                .get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        } ?: return false
        camera.setTorchMode(id, enabled)
        true
    } catch (_: Exception) { false }

    @JavascriptInterface
    fun openApp(packageName: String): Boolean {
        val allowed = setOf(
            "com.whatsapp", "com.google.android.youtube", "com.android.camera",
            "com.google.android.GoogleCamera", context.packageName
        )
        if (packageName !in allowed) return false
        val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return true
    }
}
