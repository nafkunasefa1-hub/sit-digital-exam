package com.university.digitalexam

import android.app.Activity
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

/**
 * Android Native Lockdown Kiosk Activity
 * ----------------------------------------------------
 * 1. WindowManager.LayoutParams.FLAG_SECURE: Prevents screenshots & screen mirroring
 * 2. startLockTask(): Enforces Android Screen Pinning / Kiosk Mode (no home button or split screen)
 * 3. onWindowFocusChanged(): Detects floating bubbles & overlays
 */
class LockdownExamActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. BLOCK SCREENSHOTS & SCREEN RECORDING
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )

        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // 2. CONFIGURE SECURE WEBVIEW
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false

        // Load Campus Wi-Fi Digital Exam Client
        val serverUrl = intent.getStringExtra("SERVER_URL") ?: "http://192.168.1.50:4000/student"
        webView.loadUrl(serverUrl)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // 3. ENTER ANDROID LOCK TASK / KIOSK MODE ONCE EXAM LOADS
                try {
                    startLockTask()
                } catch (e: Exception) {
                    Toast.makeText(this@LockdownExamActivity, "Screen Pinning Requested", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // 4. DETECT FLOATING CHAT BUBBLES OR ACCESSIBILITY OVERLAYS
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) {
            // Student pulled down notification shade or a floating bubble appeared
            webView.evaluateJavascript(
                "if (window.triggerSecurityViolation) { window.triggerSecurityViolation('FOCUS_LOST', 'Android System Window lost focus / overlay detected'); }",
                null
            )
        }
    }

    override fun onBackPressed() {
        // Disable back button during exam
        Toast.makeText(this, "Exiting is locked during exam. Submit to unlock.", Toast.LENGTH_SHORT).show()
    }

    fun releaseLockdown() {
        try {
            stopLockTask()
            finish()
        } catch (e: Exception) {
            finish()
        }
    }
}
