import UIKit
import Capacitor
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
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
