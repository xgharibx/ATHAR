import Capacitor
import Foundation

/**
 * Hands the app the notification buttons pressed while it was not on screen
 * («صلّيتُ», «تمّ», snoozes). The patched notification library keeps each
 * press (AtharNotificationActions in LocalNotificationsHandler.swift) and
 * schedules a snooze itself; the app applies the rest when it opens
 * (src/lib/notificationActionQueue.ts).
 *
 *   drain() → { actions: [{ id, actionId, extra, title, body, handled, at }] }
 */
@objc(NotificationActionsPlugin)
public class NotificationActionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotificationActionsPlugin"
    public let jsName = "NotificationActions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "drain", returnType: CAPPluginReturnPromise),
    ]

    private static let queueKey = "athar_notification_actions_v1"

    @objc func drain(_ call: CAPPluginCall) {
        let defaults = UserDefaults.standard
        let raw = defaults.stringArray(forKey: Self.queueKey) ?? []
        defaults.removeObject(forKey: Self.queueKey)
        let actions: [Any] = raw.compactMap { text in
            guard let data = text.data(using: .utf8) else { return nil }
            return try? JSONSerialization.jsonObject(with: data)
        }
        call.resolve(["actions": actions])
    }
}
