import AuthenticationServices
import Capacitor
import CryptoKit
import Foundation
import UIKit

/// «تسجيل الدخول عبر Apple» with the system sheet (Face ID, Hide My Email),
/// no browser involved. Returns Apple's identity token; the app hands it to
/// Supabase (signInWithIdToken), which checks it against Apple's keys and
/// the nonce. The page passes a random nonce; Apple receives only its SHA-256.
@objc(AppleSignInPlugin)
public final class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
    ]

    private var pending: CAPPluginCall?

    @objc func signIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), nonce.count >= 16, nonce.count <= 128 else {
            call.reject("a nonce is required")
            return
        }
        DispatchQueue.main.async {
            guard self.pending == nil else {
                call.reject("a sign-in is already in progress")
                return
            }
            self.pending = call
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            let digest = SHA256.hash(data: Data(nonce.utf8))
            request.nonce = digest.map { String(format: "%02x", $0) }.joined()
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pending else { return }
        pending = nil
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            call.reject("Apple returned no identity token")
            return
        }
        var result: [String: Any] = ["identityToken": token, "user": credential.user]
        if let code = credential.authorizationCode, let text = String(data: code, encoding: .utf8) {
            result["authorizationCode"] = text
        }
        // Apple shares the name and email only the first time a person signs in.
        if let email = credential.email { result["email"] = email }
        if let given = credential.fullName?.givenName { result["givenName"] = given }
        if let family = credential.fullName?.familyName { result["familyName"] = family }
        call.resolve(result)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pending else { return }
        pending = nil
        let code = (error as? ASAuthorizationError)?.code
        // Closing the sheet is not an error worth showing.
        if code == .canceled {
            call.reject("canceled", "CANCELED")
        } else {
            call.reject(error.localizedDescription, "FAILED")
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? UIWindow()
    }
}
