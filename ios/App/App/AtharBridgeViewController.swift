import Capacitor
import UIKit

/// Registers the small native bridges that are implemented in this app rather
/// than shipped as separate Capacitor packages.
final class AtharBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let bridge else { return }

        bridge.registerPluginInstance(AuthBridgePlugin())
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
        AppDelegate.flushPendingNativeAuthURL()
    }
}
