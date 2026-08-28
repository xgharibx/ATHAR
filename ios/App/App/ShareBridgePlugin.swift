import Foundation
import Capacitor
import UIKit
import Photos

/**
 * The iOS half of ShareBridge.
 *
 * Android had this from the start; iOS did not, so `nativeBridge()` fell
 * through to the Web Share API. Sharing worked that way — WKWebView does expose
 * navigator.share — but "download" did not: there is no download manager behind
 * an <a download> click, so saving a poster meant opening the share sheet and
 * finding "Save Image" in it.
 *
 * Implemented to the same contract as ShareBridgePlugin.java, so shareTargets.ts
 * needs no per-platform branch:
 *   shareImage({ base64, filename, text, title })
 *   saveImage({ base64, filename })
 *   shareText({ text, title })
 */
@objc(ShareBridgePlugin)
public class ShareBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareBridgePlugin"
    public let jsName = "ShareBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareText", returnType: CAPPluginReturnPromise),
    ]

    /// Strip a `data:` URL prefix if one came through, then decode.
    private func decode(_ raw: String) -> Data? {
        var payload = raw
        if payload.hasPrefix("data:"), let comma = payload.firstIndex(of: ",") {
            payload = String(payload[payload.index(after: comma)...])
        }
        return Data(base64Encoded: payload, options: .ignoreUnknownCharacters)
    }

    /// Present a share sheet, anchored for iPad where a popover is required.
    private func present(_ items: [Any], _ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                call.reject("no view controller")
                return
            }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            // Without this an iPad crashes outright rather than showing a sheet.
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = vc.view
                popover.sourceRect = CGRect(
                    x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0
                )
                popover.permittedArrowDirections = []
            }
            vc.present(sheet, animated: true) { call.resolve() }
        }
    }

    @objc func shareImage(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"), !base64.isEmpty,
              let data = decode(base64), let image = UIImage(data: data) else {
            call.reject("missing or unreadable base64")
            return
        }
        let text = call.getString("text") ?? ""
        var items: [Any] = [image]
        if !text.isEmpty { items.append(text) }
        present(items, call)
    }

    @objc func shareText(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("missing text")
            return
        }
        present([text], call)
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"), !base64.isEmpty,
              let data = decode(base64), let image = UIImage(data: data) else {
            call.reject("missing or unreadable base64")
            return
        }

        // `addOnly` asks for permission to add, not to read the whole library —
        // the narrowest authorisation that can save a file, and the one users
        // are most likely to grant.
        let save = {
            PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            } completionHandler: { ok, error in
                if ok {
                    call.resolve()
                } else {
                    call.reject("save failed: \(error?.localizedDescription ?? "unknown")")
                }
            }
        }

        let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        switch status {
        case .authorized, .limited:
            save()
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { granted in
                if granted == .authorized || granted == .limited {
                    save()
                } else {
                    // Rejecting lets the JS fall back to the share sheet, where
                    // "Save Image" needs no library permission at all.
                    call.reject("photo library permission denied")
                }
            }
        default:
            call.reject("photo library permission denied")
        }
    }
}
