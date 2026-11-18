import UIKit
import Capacitor
import WebKit
#if canImport(WidgetKit)
import WidgetKit
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// App Group shared with the AtharWidgets extension. Must match the
    /// entitlements of both targets (App.entitlements, AtharWidgets.entitlements).
    static let widgetAppGroup = "group.com.athar.adhkar"

    /// Widget payload keys written by the web app via @capacitor/preferences.
    /// The plugin stores them in UserDefaults.standard with a "CapacitorStorage." prefix;
    /// widget extensions can only read the shared App Group, so we mirror them across.
    private static let widgetKeys = [
        "noor_widget_prayer_v2",
        "noor_widget_adhkar_v1",
        "noor_widget_wird_v1",
        "noor_widget_dashboard_v1",
        // Which account the Home Screen tasbeeh credits its taps to.
        "noor_widget_tasbeeh_owner_v1",
    ]

    private var pendingNativeAuthURL: URL?
    private var nativeAuthDeliveryInProgress = false
    private var nativeAuthDeliveryAttempts = 0

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Keep the Adhan queued past the app's own week, also while it stays closed.
        PrayerTopUp.registerBackgroundTask()
        PrayerTopUp.run()
        // Opened from a Home Screen quick action (long-press on the app icon).
        if let shortcut = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            Self.openShortcut(shortcut)
            // Handled here, so iOS does not also call performActionFor.
            return false
        }
        return true
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(Self.openShortcut(shortcutItem))
    }

    /// Quick actions carry an in-app route (Info.plist, UIApplicationShortcutItems).
    @discardableResult
    static func openShortcut(_ item: UIApplicationShortcutItem) -> Bool {
        guard let route = item.userInfo?["route"] as? String,
              route.range(of: "^/[A-Za-z0-9/_-]*$", options: .regularExpression) != nil else { return false }
        deliverRoute(route)
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // The user may be heading to the home screen — hand the widgets fresh data.
        Self.mirrorWidgetDataToAppGroup()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        Self.mirrorWidgetDataToAppGroup()
        PrayerTopUp.scheduleBackgroundRefresh()
    }

    /// Copies the web app's widget payloads into the shared App Group and asks
    /// WidgetKit to re-render the AtharWidgets extension. Also called by
    /// WidgetRefreshPlugin whenever the web app writes new widget data.
    static func mirrorWidgetDataToAppGroup() {
        guard let shared = UserDefaults(suiteName: AppDelegate.widgetAppGroup) else { return }
        let standard = UserDefaults.standard
        for key in AppDelegate.widgetKeys {
            if let value = standard.string(forKey: "CapacitorStorage." + key) {
                shared.set(value, forKey: key)
            }
        }
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
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
        if let route = Self.inAppRoute(from: url) {
            // A widget or the prayer countdown was tapped: open that screen.
            Self.deliverRoute(route)
            return true
        }
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

    /// `app.athar://open/prayer-times` → `/prayer-times`. Only plain in-app
    /// paths are accepted; the links come from Athar's own widgets.
    static func inAppRoute(from url: URL) -> String? {
        guard url.scheme?.lowercased() == "app.athar", url.host == "open" else { return nil }
        let path = url.path.isEmpty ? "/" : url.path
        guard path.range(of: "^/[A-Za-z0-9/_-]*$", options: .regularExpression) != nil else { return nil }
        return path
    }

    /// Navigate the web app to `route` once it has mounted, retrying briefly on a cold start.
    static func deliverRoute(_ route: String, attempt: Int = 0) {
        DispatchQueue.main.async {
            guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
                  let controller = appDelegate.window?.rootViewController as? CAPBridgeViewController,
                  let webView = controller.bridge?.webView,
                  webView.url != nil,
                  let data = try? JSONSerialization.data(withJSONObject: route, options: [.fragmentsAllowed]),
                  let json = String(data: data, encoding: .utf8) else {
                if attempt < 25 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { deliverRoute(route, attempt: attempt + 1) }
                }
                return
            }
            let script = "(function(){var r=document.querySelector('#root');if(!r||!r.firstChild)return 'wait';var p=\(json);if(location.pathname!==p){history.pushState({},'',p);window.dispatchEvent(new PopStateEvent('popstate'));}return 'ok';})()"
            webView.evaluateJavaScript(script) { result, _ in
                if result as? String != "ok", attempt < 25 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { deliverRoute(route, attempt: attempt + 1) }
                }
            }
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
