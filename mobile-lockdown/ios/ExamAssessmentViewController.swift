import UIKit
import WebKit
import AutomaticAssessmentConfiguration

/**
 * iOS Native Assessment Lockdown Controller
 * ----------------------------------------------------
 * Uses Apple's official AEAssessmentSession framework.
 * Automatically locks down iPhone / iPad:
 * - Disables App Switcher, Control Center, Siri, Notifications
 * - Disables Autocorrect, Predictive Keyboard, Spellcheck
 * - Disables Screen Recording, Screen Capture, AirPlay Mirroring
 */
class ExamAssessmentViewController: UIViewController, AEAssessmentSessionDelegate, WKNavigationDelegate {

    private var webView: WKWebView!
    private var assessmentSession: AEAssessmentSession?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        // 1. Setup Secure WKWebView
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        view.addSubview(webView)

        // Load Campus Wi-Fi Exam URL
        if let url = URL(string: "http://192.168.1.50:4000/student") {
            webView.load(URLRequest(url: url))
        }

        // 2. Initialize Apple Automatic Assessment Session
        startAppleAssessmentLockdown()
    }

    private func startAppleAssessmentLockdown() {
        let configuration = AEAssessmentConfiguration()
        
        // Disallow spellcheck and autocorrect
        configuration.allowsSpellCheck = false
        configuration.allowsPredictiveKeyboard = false
        configuration.allowsKeyboardShortcuts = false
        configuration.allowsActivityContinuation = false

        let session = AEAssessmentSession(configuration: configuration)
        session.delegate = self
        self.assessmentSession = session

        // Begin Single App Kiosk Lockdown
        session.begin()
    }

    // Delegate: Session Successfully Activated
    func assessmentSessionDidBegin(_ session: AEAssessmentSession) {
        print("✅ [iOS Lockdown] Apple Assessment Session Active: Device Locked to Single App Mode.")
    }

    // Delegate: Session Interrupted / Failed
    func assessmentSession(_ session: AEAssessmentSession, failedToBeginWithError error: Error) {
        print("🚨 [iOS Lockdown] Failed to begin assessment: \(error.localizedDescription)")
    }

    // Delegate: Session Terminated
    func assessmentSession(_ session: AEAssessmentSession, wasInterruptedWithError error: Error) {
        print("🚨 [iOS Lockdown] Assessment session interrupted: \(error.localizedDescription)")
        webView.evaluateJavaScript("if (window.triggerSecurityViolation) { window.triggerSecurityViolation('LOCKDOWN_INTERRUPTED', 'iOS Assessment Session was interrupted'); }")
    }

    // Release lockdown upon submission
    func endExamLockdown() {
        assessmentSession?.end()
        assessmentSession = nil
    }
}
