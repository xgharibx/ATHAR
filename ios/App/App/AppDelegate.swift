import UIKit
import Capacitor
import WebKit
#if canImport(WidgetKit)
import WidgetKit
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// App Group shared with the (optional) WidgetKit extension.
    /// Must match the App Group enabled on both targets in Xcode.
    static let widgetAppGroup = "group.com.athar.adhkar"

    /// Widget payload keys written by the web app via @capacitor/preferences.
    /// The plugin stores them in UserDefaults.standard with a "CapacitorStorage." prefix;
    /// widget extensions can only read the shared App Group, so we mirror them across.
    private static let widgetKeys = [
        "noor_widget_prayer_v2",
        "noor_widget_adhkar_v1",
        "noor_widget_wird_v1",
        "noor_widget_dashboard_v1",
    ]

    private var pendingNativeAuthURL: URL?
    private var nativeAuthDeliveryInProgress = false
    private var nativeAuthDeliveryAttempts = 0

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // The user may be heading to the home screen — hand the widgets fresh data.
        mirrorWidgetDataToAppGroup()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        mirrorWidgetDataToAppGroup()
    }

    /// Copies the web app's widget payloads into the shared App Group and asks
    /// WidgetKit to re-render. No-ops harmlessly until a widget extension +
    /// App Group are configured in Xcode (see ios/WidgetExtension/README.md).
    private func mirrorWidgetDataToAppGroup() {
        guard let shared = UserDefaults(suiteName: AppDelegate.widgetAppGroup) else { return }
        let standard = UserDefaults.standard
        for key in AppDelegate.widgetKeys {
            if let value = standard.string(forKey: "CapacitorStorage." + key) {
                shared.set(value, forKey: key)
            }
        }
        #if canImport(WidgetKit)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        #endif
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        Self.flushPendingNativeAuthURL()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        let handled = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        guard Self.isNativeAuthCallbackURL(url) else { return handled }
        Self.deliverNativeAuthCallback(url)
        return true
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    static func deliverNativeAuthCallback(_ url: URL) {
        guard isNativeAuthCallbackURL(url) else { return }
        DispatchQueue.main.async {
            guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
            appDelegate.pendingNativeAuthURL = url
            appDelegate.nativeAuthDeliveryAttempts = 0
            appDelegate.deliverPendingNativeAuthURLIfReady()
        }
    }

    static func flushPendingNativeAuthURL() {
        DispatchQueue.main.async {
            (UIApplication.shared.delegate as? AppDelegate)?.deliverPendingNativeAuthURLIfReady()
        }
    }

    private static func isNativeAuthCallbackURL(_ url: URL) -> Bool {
        guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return false }
        return parts.scheme?.lowercased() == "app.athar"
            && parts.host == "auth"
            && parts.port == nil
            && parts.user == nil
            && parts.password == nil
            && (parts.path.isEmpty || parts.path == "/")
    }

    private func deliverPendingNativeAuthURLIfReady() {
        guard !nativeAuthDeliveryInProgress, let url = pendingNativeAuthURL else { return }
        guard let controller = window?.rootViewController as? CAPBridgeViewController,
              let bridge = controller.bridge,
              let webView = bridge.webView,
              webView.url != nil,
              let jsonData = try? JSONSerialization.data(withJSONObject: url.absoluteString, options: [.fragmentsAllowed]),
              let jsonURL = String(data: jsonData, encoding: .utf8) else {
            scheduleNativeAuthDeliveryRetry()
            return
        }

        nativeAuthDeliveryInProgress = true
        let script = "(function(){if(document.readyState==='loading')return 'wait';var u=\(jsonURL);if(window.__atharAuthCallbackReady){window.dispatchEvent(new CustomEvent('athar-auth-callback',{detail:{url:u}}));}else{window.__atharPendingAuthUrl=u;}return 'delivered';})()"
        webView.evaluateJavaScript(script) { [weak self] result, error in
            guard let self else { return }
            self.nativeAuthDeliveryInProgress = false
            guard self.pendingNativeAuthURL == url else {
                self.deliverPendingNativeAuthURLIfReady()
                return
            }
            if error == nil, result as? String == "delivered" {
                self.pendingNativeAuthURL = nil
                self.nativeAuthDeliveryAttempts = 0
                return
            }
            self.scheduleNativeAuthDeliveryRetry()
        }
    }

    private func scheduleNativeAuthDeliveryRetry() {
        guard pendingNativeAuthURL != nil, nativeAuthDeliveryAttempts < 25 else {
            nativeAuthDeliveryAttempts = 0
            return
        }
        nativeAuthDeliveryAttempts += 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.deliverPendingNativeAuthURLIfReady()
        }
    }

}
