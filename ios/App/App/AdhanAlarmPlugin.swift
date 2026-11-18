import Capacitor

/**
 * The Adhan alarm from the app's settings (src/lib/adhanAlarm.ts). The alarms
 * themselves follow the prayer plan (PrayerTopUp → AdhanAlarmKit.sync).
 *
 *   status() → { available, authorized }
 *   requestPermission() → asks for the alarm permission
 *   test({ title }) → rings in a few seconds
 */
@objc(AdhanAlarmPlugin)
public class AdhanAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AdhanAlarmPlugin"
    public let jsName = "AdhanAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "test", returnType: CAPPluginReturnPromise),
    ]

    private func status() -> [String: Any] {
        ["available": AdhanAlarmKit.available, "authorized": AdhanAlarmKit.authorized]
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(status())
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        Task {
            _ = await AdhanAlarmKit.requestAuthorization()
            call.resolve(self.status())
        }
    }

    @objc func test(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "تجربة منبّه الأذان"
        Task {
            if await AdhanAlarmKit.test(title: title) {
                call.resolve()
            } else {
                call.reject("unavailable")
            }
        }
    }
}
