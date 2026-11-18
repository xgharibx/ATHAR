import Capacitor
import UIKit

/**
 * The app icon chosen in Settings › أيقونة التطبيق: the alternate icon sets in
 * Assets.xcassets (AppIcon-Light, -Dark, -Ramadan, -Gold), listed in the
 * ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES build setting. iOS confirms
 * the change itself with a short alert.
 *
 *   set({ name: "default" | "light" | "dark" | "ramadan" | "gold" })
 *   get() → { name }
 */
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
    ]

    private static let iconSets = [
        "light": "AppIcon-Light",
        "dark": "AppIcon-Dark",
        "ramadan": "AppIcon-Ramadan",
        "gold": "AppIcon-Gold",
    ]

    @objc func set(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "default"
        guard name == "default" || Self.iconSets[name] != nil else {
            call.reject("unknown icon")
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.supportsAlternateIcons else {
                call.reject("alternate icons are not supported")
                return
            }
            UIApplication.shared.setAlternateIconName(Self.iconSets[name]) { error in
                if let error {
                    call.reject("the icon could not be changed", nil, error)
                } else {
                    call.resolve(["name": name, "appliesOnLeave": false])
                }
            }
        }
    }

    @objc func get(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let current = UIApplication.shared.alternateIconName
            let name = Self.iconSets.first(where: { $0.value == current })?.key ?? "default"
            call.resolve(["name": name])
        }
    }
}
