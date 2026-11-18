import Capacitor
import UIKit

/**
 * Opens Athar's notification settings in the iPhone's Settings app, for when
 * notifications were refused (Settings › التذكيرات › إذن الإشعارات).
 *
 *   openNotificationSettings()
 */
@objc(SystemSettingsPlugin)
public class SystemSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SystemSettingsPlugin"
    public let jsName = "SystemSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openNotificationSettings", returnType: CAPPluginReturnPromise),
    ]

    @objc func openNotificationSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openNotificationSettingsURLString) else {
                call.reject("settings unavailable")
                return
            }
            UIApplication.shared.open(url) { opened in
                if opened { call.resolve() } else { call.reject("settings unavailable") }
            }
        }
    }
}
