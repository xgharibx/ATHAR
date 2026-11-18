import Capacitor
import StoreKit
import UIKit

/**
 * The App Store's own rating prompt. iOS decides whether it actually appears
 * (at most three times a year) and never says whether it did.
 *
 * JS side: registerPlugin("StoreReview").request() → { requested }
 */
@objc(StoreReviewPlugin)
public class StoreReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreReviewPlugin"
    public let jsName = "StoreReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
    ]

    @objc func request(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene,
                  scene.activationState == .foregroundActive else {
                call.resolve(["requested": false])
                return
            }
            AppStore.requestReview(in: scene)
            call.resolve(["requested": true])
        }
    }
}
