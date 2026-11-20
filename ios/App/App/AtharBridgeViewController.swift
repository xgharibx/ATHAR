import Capacitor
import UIKit

/// Registers the small native bridges that are implemented in this app rather
/// than shipped as separate Capacitor packages.
final class AtharBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let bridge else { return }

        // The saved-data copy goes in before the page's own code runs, so a
        // web storage the system cleared is filled back before the app reads it.
        if let restore = NativeVault.restoreScript() {
            webView?.configuration.userContentController.addUserScript(restore)
        }

        bridge.registerPluginInstance(AuthBridgePlugin())
        bridge.registerPluginInstance(AppleSignInPlugin())
        bridge.registerPluginInstance(ShareBridgePlugin())
        bridge.registerPluginInstance(WidgetRefreshPlugin())
        bridge.registerPluginInstance(PrayerActivityPlugin())
        bridge.registerPluginInstance(CompassPlugin())
        bridge.registerPluginInstance(QuranAudioPlugin())
        bridge.registerPluginInstance(StoreReviewPlugin())
        bridge.registerPluginInstance(AppLockPlugin())
        bridge.registerPluginInstance(AppIconPlugin())
        bridge.registerPluginInstance(PrayerTopUpPlugin())
        bridge.registerPluginInstance(VoiceTasbeehPlugin())
        bridge.registerPluginInstance(SpotlightPlugin())
        bridge.registerPluginInstance(AdhanAlarmPlugin())
        bridge.registerPluginInstance(LocationAccessPlugin())
        bridge.registerPluginInstance(MindfulHealthPlugin())
        bridge.registerPluginInstance(ScreenAwakePlugin())
        bridge.registerPluginInstance(InAppBrowserPlugin())
        bridge.registerPluginInstance(NotificationActionsPlugin())
        bridge.registerPluginInstance(SystemSettingsPlugin())
        bridge.registerPluginInstance(NativeUIPlugin())
        AppDelegate.flushPendingNativeAuthURL()
    }
}
