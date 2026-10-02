import AuthenticationServices
import Capacitor
import Foundation
import UIKit

@objc(AuthBridgePlugin)
public final class AuthBridgePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AuthBridgePlugin"
    public let jsName = "AuthBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openExternal", returnType: CAPPluginReturnPromise),
    ]

    private var activeSession: ASWebAuthenticationSession?

    @objc func openExternal(_ call: CAPPluginCall) {
        guard let rawURL = call.getString("url"),
              let components = URLComponents(string: rawURL),
              components.scheme?.lowercased() == "https",
              let host = components.host, !host.isEmpty,
              components.user == nil, components.password == nil,
              components.fragment == nil,
              let url = components.url else {
            call.reject("invalid authentication URL")
            return
        }

        DispatchQueue.main.async {
            guard self.activeSession == nil else {
                call.reject("an authentication session is already active")
                return
            }

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "app.athar"
            ) { [weak self] callbackURL, error in
                DispatchQueue.main.async {
                    self?.activeSession = nil
                    guard let callbackURL else {
                        if let error = error {
                            CAPLog.print("AuthBridge authentication ended: \(error.localizedDescription)")
                        }
                        return
                    }
                    AppDelegate.deliverNativeAuthCallback(callbackURL)
                }
            }
            session.presentationContextProvider = self
            // Keep the user's existing browser session available for Google.
            session.prefersEphemeralWebBrowserSession = false
            self.activeSession = session

            guard session.start() else {
                self.activeSession = nil
                call.reject("could not start authentication session")
                return
            }
            call.resolve()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? UIWindow()
    }
}
