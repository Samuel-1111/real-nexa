package com.samzytechnology.nexa

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Native Android foreground voice service for NEXA.
 *
 * It keeps microphone access alive while the user explicitly enables
 * NEXA voice mode and uses Android speech recognition to detect a
 * wake phrase such as "Hey NEXA". It does not transmit an API key
 * or call Gemini directly from the APK.
 */
class NexaVoiceService : Service() {
    companion object {
        const val CHANNEL_ID = "nexa_voice"
        const val NOTIFICATION_ID = 4101
        const val ACTION_WAKE = "com.samzytechnology.nexa.WAKE"
        const val EXTRA_QUERY = "query"
        private const val WAKE_WORD = "nexa"
    }

    private val handler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var stopped = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, notification("Voice assistant is active"))
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            startListening()
        } else {
            stopSelf()
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "NEXA Voice", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "NEXA voice assistant status"
                }
            )
        }
    }

    private fun notification(text: String): Notification {
        val launch = Intent(this, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            this, 4102, launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(com.samzytechnology.nexa.R.drawable.ic_nexa)
            .setContentTitle("NEXA")
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(pending)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun startListening() {
        if (stopped || !SpeechRecognizer.isRecognitionAvailable(this)) {
            updateNotification("Voice recognition is unavailable on this device")
            return
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
            setRecognitionListener(listener)
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-NG")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
        }
        try {
            recognizer?.startListening(intent)
            updateNotification("Listening for Hey NEXA")
        } catch (_: Exception) {
            scheduleRestart()
        }
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = scheduleRestart()
        override fun onError(error: Int) = scheduleRestart()
        override fun onResults(results: Bundle?) {
            val values = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
            val phrase = values.firstOrNull()?.trim().orEmpty()
            if (phrase.isNotEmpty() && containsWakeWord(phrase)) {
                val query = phrase
                    .replace(Regex("(?i)^(hey|ok|okay)?\\s*nexa[, ]*"), "")
                    .trim()
                sendWakeBroadcast(query)
                updateNotification("NEXA activated")
            }
            scheduleRestart()
        }
        override fun onPartialResults(partialResults: Bundle?) = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }

    private fun containsWakeWord(text: String): Boolean =
        Regex("(?i)(^|\\s)(hey|ok|okay)?\\s*nexa([,.!? ]|$)").containsMatchIn(text)

    private fun sendWakeBroadcast(query: String) {
        sendBroadcast(Intent(ACTION_WAKE).apply {
            setPackage(packageName)
            putExtra(EXTRA_QUERY, query)
        })
        val launch = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_QUERY, query)
        }
        startActivity(launch)
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification(text))
    }

    private fun scheduleRestart() {
        if (!stopped) handler.postDelayed({ startListening() }, 700)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        stopped = true
        handler.removeCallbacksAndMessages(null)
        recognizer?.destroy()
        recognizer = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null
}
