import Capacitor
import SafariServices
import UIKit

/**
 * Web pages opened inside Athar (src/lib/inAppBrowser.ts): Safari's own view,
 * with the person's Safari sign-ins, Reader and a Done button back to the
 * app, instead of leaving for Safari.
 *
 *   open({ url, color? }) → resolves once the page is showing
 */
@objc(InAppBrowserPlugin)
public class InAppBrowserPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InAppBrowserPlugin"
    public let jsName = "InAppBrowser"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
    ]

    @objc func open(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw),
              let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else {
            call.reject("a web address is required")
            return
        }
        let color = call.getString("color").flatMap(Self.color(hex:))
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController else {
                call.reject("no view controller")
                return
            }
            var top = host
            while let presented = top.presentedViewController { top = presented }
            let configuration = SFSafariViewController.Configuration()
            configuration.entersReaderIfAvailable = false
            let safari = SFSafariViewController(url: url, configuration: configuration)
            safari.dismissButtonStyle = .done
            if let color { safari.preferredControlTintColor = color }
            top.present(safari, animated: true) { call.resolve() }
        }
    }

    private static func color(hex: String) -> UIColor? {
        var value = hex.trimmingCharacters(in: .whitespaces)
        if value.hasPrefix("#") { value.removeFirst() }
        if value.count == 3 { value = value.map { "\($0)\($0)" }.joined() }
        guard value.count == 6, let rgb = UInt32(value, radix: 16) else { return nil }
        return UIColor(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}
