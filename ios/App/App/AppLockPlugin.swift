import Capacitor
import LocalAuthentication

/**
 * The app lock: Face ID, Touch ID or Optic ID, with the device passcode as
 * the fallback, so nobody is ever locked out of Athar by a sensor that fails.
 *
 *   status()  → { available, biometryType: "face" | "fingerprint" | "biometric" | "passcode" }
 *   authenticate({ reason }) → { success, cancelled }
 */
@objc(AppLockPlugin)
public class AppLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppLockPlugin"
    public let jsName = "AppLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
    ]

    @objc func status(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        let biometrics = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        var type = "passcode"
        if biometrics {
            switch context.biometryType {
            case .faceID: type = "face"
            case .touchID: type = "fingerprint"
            default: type = "biometric" // Optic ID (iOS 17+) and anything newer
            }
        }
        call.resolve(["available": available, "biometryType": type])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "افتح أثر"
        let context = LAContext()
        context.localizedCancelTitle = "إلغاء"
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            let code = (error as? LAError)?.code
            call.resolve([
                "success": success,
                "cancelled": code == .userCancel || code == .appCancel || code == .systemCancel,
            ])
        }
    }
}
