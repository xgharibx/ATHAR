import ActivityKit
import Capacitor
import Foundation

/**
 * The next prayer as a Live Activity: a live countdown on the Lock Screen and
 * in the Dynamic Island.
 *
 * The web app calls `sync` whenever it knows the next prayer (on launch, on
 * returning to the app, and when a prayer time passes while it is open).
 * There is at most one prayer activity at a time:
 *   sync({ prayerKey, nameAr, at, startAt?, followingNameAr?, followingAt? })
 *       starts the countdown, or moves the existing one to this prayer.
 *       `at`, `startAt` and `followingAt` are epoch milliseconds.
 *   end()  removes it.
 *   status() reports whether the user allows Live Activities for Athar.
 *
 * No push server is involved. The countdown and progress bar are drawn by the
 * system from the dates alone, and the activity goes stale at the adhan, which
 * switches it to "it is time for ..." with a countdown to the prayer after.
 *
 * If the person swipes the countdown away, it stays away for that prayer and
 * returns for the next one.
 */
@objc(PrayerActivityPlugin)
public class PrayerActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrayerActivityPlugin"
    public let jsName = "PrayerActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    private typealias PrayerActivity = Activity<PrayerActivityAttributes>

    private static func date(fromMs value: Double?) -> Date? {
        guard let value, value.isFinite, value > 0 else { return nil }
        return Date(timeIntervalSince1970: value / 1000)
    }

    private static func liveActivities() -> [PrayerActivity] {
        PrayerActivity.activities.filter { $0.activityState == .active || $0.activityState == .stale }
    }

    private static let dismissedKey = "athar.prayerActivity.dismissed"
    private static let lock = NSLock()
    private static var endedByApp = Set<String>()
    private static var watched = Set<String>()

    private static func marker(_ key: String, _ time: Date) -> String {
        "\(key)@\(Int(time.timeIntervalSince1970))"
    }

    private static func endAll(_ activities: [PrayerActivity]) async {
        for activity in activities {
            lock.withLock { _ = endedByApp.insert(activity.id) }
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    /// Remember when the person, not the app, removes the countdown.
    private static func watchForDismissal(_ activity: PrayerActivity) {
        let isNew = lock.withLock { watched.insert(activity.id).inserted }
        guard isNew else { return }
        Task {
            for await state in activity.activityStateUpdates where state == .dismissed {
                let endedHere = lock.withLock {
                    watched.remove(activity.id)
                    return endedByApp.remove(activity.id) != nil
                }
                if !endedHere {
                    let current = activity.content.state
                    UserDefaults.standard.set(marker(current.prayerKey, current.prayerTime), forKey: dismissedKey)
                }
                return
            }
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve([
            "enabled": ActivityAuthorizationInfo().areActivitiesEnabled,
            "active": !Self.liveActivities().isEmpty,
        ])
    }

    @objc func end(_ call: CAPPluginCall) {
        UserDefaults.standard.removeObject(forKey: Self.dismissedKey)
        Task {
            await Self.endAll(PrayerActivity.activities)
            call.resolve()
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard let key = call.getString("prayerKey"), !key.isEmpty,
              let name = call.getString("nameAr"), !name.isEmpty,
              let prayerTime = Self.date(fromMs: call.getDouble("at")) else {
            call.reject("prayerKey, nameAr and at are required")
            return
        }

        let now = Date()
        // The system draws the countdown from a date range, which must not be reversed.
        let start = min(Self.date(fromMs: call.getDouble("startAt")) ?? now, now, prayerTime)
        var followingName = call.getString("followingNameAr")
        var followingTime = Self.date(fromMs: call.getDouble("followingAt"))
        if followingName?.isEmpty ?? true || followingTime.map({ $0 <= prayerTime }) ?? true {
            followingName = nil
            followingTime = nil
        }

        let state = PrayerActivityAttributes.ContentState(
            prayerKey: key,
            prayerNameAr: name,
            prayerTime: prayerTime,
            countdownStart: start,
            followingNameAr: followingName,
            followingTime: followingTime
        )
        let content = ActivityContent(state: state, staleDate: prayerTime, relevanceScore: 100)

        Task {
            let existing = Self.liveActivities()
            // Activities from an earlier launch of the app.
            existing.forEach(Self.watchForDismissal)
            guard prayerTime > now else {
                await Self.endAll(existing)
                call.resolve(["active": false])
                return
            }

            // Already counting down to this prayer: refresh it in place.
            if let current = existing.first(where: {
                $0.content.state.prayerKey == key
                    && abs($0.content.state.prayerTime.timeIntervalSince(prayerTime)) < 1
            }) {
                if current.content.state != state {
                    await current.update(content)
                }
                await Self.endAll(existing.filter { $0.id != current.id })
                call.resolve(["active": true])
                return
            }

            if UserDefaults.standard.string(forKey: Self.dismissedKey) == Self.marker(key, prayerTime) {
                await Self.endAll(existing)
                call.resolve(["active": false, "reason": "dismissed"])
                return
            }

            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                await Self.endAll(existing)
                call.resolve(["active": false, "reason": "disabled"])
                return
            }

            do {
                // A fresh activity for each prayer, so the system's eight-hour
                // limit always counts from this countdown's start.
                let activity = try PrayerActivity.request(
                    attributes: PrayerActivityAttributes(),
                    content: content,
                    pushType: nil
                )
                Self.watchForDismissal(activity)
                await Self.endAll(existing.filter { $0.id != activity.id })
                call.resolve(["active": true])
            } catch {
                // New activities can only be started while the app is in the
                // foreground; an existing one can still be moved forward.
                if let current = existing.first {
                    await current.update(content)
                    await Self.endAll(existing.filter { $0.id != current.id })
                    call.resolve(["active": true])
                } else {
                    call.reject("could not start the prayer countdown", nil, error)
                }
            }
        }
    }
}
