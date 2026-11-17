import Capacitor
import Foundation

/**
 * The iOS half of WidgetRefresh (see WidgetRefreshPlugin.java).
 *
 * The web app writes widget data through @capacitor/preferences, which lands
 * in the app's own UserDefaults. `refresh()` copies it into the App Group the
 * AtharWidgets extension reads and asks WidgetKit to redraw, so the home-screen
 * and Lock Screen widgets change as soon as the data does, not only when the
 * app goes to the background.
 */
@objc(WidgetRefreshPlugin)
public class WidgetRefreshPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetRefreshPlugin"
    public let jsName = "WidgetRefresh"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise),
    ]

    @objc func refresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            AppDelegate.mirrorWidgetDataToAppGroup()
            call.resolve()
        }
    }
}
