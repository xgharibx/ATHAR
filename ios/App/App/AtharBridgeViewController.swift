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
        AppDelegate.flushPendingNativeAuthURL()
    }
}
