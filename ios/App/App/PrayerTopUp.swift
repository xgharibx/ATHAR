import BackgroundTasks
import Capacitor
import UserNotifications

/**
 * Keeps the Adhan coming while the app stays closed (src/lib/prayerTopUp.ts).
 *
 * The app queues its own week of prayer alerts and hands over a plan: a year
 * of offline prayer times and each prayer's notification. iOS keeps at most
 * 64 alerts waiting per app, so this fills the free places (up to 60, the
 * app's own budget) with the days after the app's week, up to ten days
 * ahead, and refills them whenever iOS lets Athar run: when it starts for any
 * reason, and in the background refresh iOS grants it from time to time.
 *
 * The alerts match the app's own: the same title, Adhan sound, ids and
 * "prayed" button, and they follow the wall clock across time zones.
 */
enum PrayerTopUp {
    static let taskIdentifier = "com.athar.adhkar.prayer-top-up"
    private static let planKey = "athar_prayer_top_up_plan_v1"
    private static let prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    /** The app's own iOS budget (src/lib/reminders.ts), below the system's 64. */
    private static let budget = 60
    private static let minimumLead: TimeInterval = 30

    static func save(plan: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(plan),
              let data = try? JSONSerialization.data(withJSONObject: plan) else { return }
        UserDefaults.standard.set(data, forKey: planKey)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: planKey)
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskIdentifier)
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { pending in
            let ours = pending.filter(isTopUp).map(\.identifier)
            center.removePendingNotificationRequests(withIdentifiers: ours)
        }
    }

    private static func loadPlan() -> [String: Any]? {
        guard let data = UserDefaults.standard.data(forKey: planKey) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }

    private static func isTopUp(_ request: UNNotificationRequest) -> Bool {
        (request.content.userInfo["cap_extra"] as? [String: Any])?["atharTopUp"] as? Bool == true
    }

    // MARK: Background refresh

    /** Called once from application(_:didFinishLaunchingWithOptions:). */
    static func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { task in
            guard let refresh = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            handle(refresh)
        }
    }

    static func scheduleBackgroundRefresh() {
        guard loadPlan() != nil else { return }
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 12 * 60 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func handle(_ task: BGAppRefreshTask) {
        scheduleBackgroundRefresh()
        task.expirationHandler = { task.setTaskCompleted(success: false) }
        run { _ in task.setTaskCompleted(success: true) }
    }

    // MARK: Queuing

    /** Fill the free places with the next days. Calls back with how many are queued. */
    static func run(completion: ((Int) -> Void)? = nil) {
        guard let plan = loadPlan() else {
            completion?(0)
            return
        }
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
                completion?(0)
                return
            }
            center.getPendingNotificationRequests { pending in
                let ours = pending.filter(isTopUp)
                let free = max(0, budget - (pending.count - ours.count))
                let chosen = Array(requests(from: plan, now: Date()).prefix(free))
                let keep = Set(chosen.map(\.identifier))
                center.removePendingNotificationRequests(withIdentifiers: ours.map(\.identifier).filter { !keep.contains($0) })
                let group = DispatchGroup()
                for request in chosen {
                    group.enter()
                    center.add(request) { _ in group.leave() }
                }
                group.notify(queue: .main) { completion?(chosen.count) }
            }
        }
    }

    /** The plan's alerts after the app's week, inside the ten-day window, soonest first. */
    private static func requests(from plan: [String: Any], now: Date) -> [UNNotificationRequest] {
        guard let scheduledThrough = plan["scheduledThrough"] as? String,
              let slotOffset = plan["slotOffset"] as? Int,
              let templates = plan["templates"] as? [String: Any],
              let days = plan["days"] as? [[String: Any]] else { return [] }
        let windowDays = max(1, plan["windowDays"] as? Int ?? 10)
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)
        let todayKey = dateKey(today, calendar)
        let lastKey = dateKey(calendar.date(byAdding: .day, value: windowDays - 1, to: today) ?? today, calendar)

        var result: [UNNotificationRequest] = []
        for day in days {
            guard let dateISO = day["d"] as? String,
                  let slot = day["s"] as? Int,
                  let times = day["t"] as? [String: String] else { continue }
            if dateISO <= scheduledThrough || dateISO < todayKey { continue }
            if dateISO > lastKey { break }
            for prayer in prayers {
                guard let template = templates[prayer] as? [String: Any],
                      let baseId = template["baseId"] as? Int,
                      let notification = template["notification"] as? [String: Any],
                      let hhmm = times[prayer],
                      let components = wallClock(dateISO, hhmm),
                      let at = calendar.date(from: components),
                      at.timeIntervalSince(now) > minimumLead else { continue }

                let content = UNMutableNotificationContent()
                content.title = notification["title"] as? String ?? ""
                content.body = notification["body"] as? String ?? ""
                if let sound = notification["sound"] as? String, !sound.isEmpty {
                    content.sound = resolveSound(sound)
                }
                if let category = notification["actionTypeId"] as? String {
                    content.categoryIdentifier = category
                }
                var extra = notification["extra"] as? [String: Any] ?? [:]
                extra["dateISO"] = dateISO
                extra["atharWallClockOnce"] = true
                extra["atharWallClockDateISO"] = dateISO
                extra["atharWallClockTime"] = String(hhmm.prefix(5))
                // The same userInfo shape the notification plugin writes, so the
                // app reads these alerts and their buttons like its own.
                content.userInfo = ["cap_schedule": ["at": at], "cap_extra": extra]

                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                result.append(UNNotificationRequest(identifier: "\(baseId + slot * slotOffset)", content: content, trigger: trigger))
            }
        }
        return result
    }

    private static func dateKey(_ date: Date, _ calendar: Calendar) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /** A local date and "HH:mm" as wall-clock components in the current time zone. */
    private static func wallClock(_ dateISO: String, _ hhmm: String) -> DateComponents? {
        let date = dateISO.split(separator: "-").compactMap { Int($0) }
        let time = hhmm.split(separator: ":").compactMap { Int($0.prefix(2)) }
        guard date.count == 3, time.count >= 2 else { return nil }
        var components = DateComponents(year: date[0], month: date[1], day: date[2], hour: time[0], minute: time[1], second: 0)
        components.calendar = Calendar.autoupdatingCurrent
        components.timeZone = TimeZone.autoupdatingCurrent
        return components
    }

    /// The notification plugin's lookup: the sound sits in the web assets, maybe
    /// under a hashed name, and iOS needs the folder-qualified name.
    private static func resolveSound(_ path: String) -> UNNotificationSound {
        let ext = (path as NSString).pathExtension
        let base = (path as NSString).deletingPathExtension
        if !ext.isEmpty, let resourcePath = Bundle.main.resourcePath {
            for folder in ["www", "public"] {
                let folderPath = (resourcePath as NSString).appendingPathComponent(folder)
                guard let files = try? FileManager.default.contentsOfDirectory(atPath: folderPath) else { continue }
                let exact = "\(base).\(ext)"
                if files.contains(exact) {
                    return UNNotificationSound(named: UNNotificationSoundName("\(folder)/\(exact)"))
                }
                let pattern = "^\(NSRegularExpression.escapedPattern(for: base))__.+\\.\(NSRegularExpression.escapedPattern(for: ext))$"
                if let match = files.first(where: { $0.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil }) {
                    return UNNotificationSound(named: UNNotificationSoundName("\(folder)/\(match)"))
                }
            }
        }
        return UNNotificationSound(named: UNNotificationSoundName(path))
    }
}

/**
 * The app hands over its prayer plan here (src/lib/prayerTopUp.ts).
 *
 *   configure({ plan }) → { queued }
 *   clear()
 */
@objc(PrayerTopUpPlugin)
public class PrayerTopUpPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrayerTopUpPlugin"
    public let jsName = "PrayerTopUp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    @objc func configure(_ call: CAPPluginCall) {
        guard let plan = call.getObject("plan") else {
            call.reject("plan is required")
            return
        }
        PrayerTopUp.save(plan: plan as [String: Any])
        PrayerTopUp.scheduleBackgroundRefresh()
        PrayerTopUp.run { queued in call.resolve(["queued": queued]) }
    }

    @objc func clear(_ call: CAPPluginCall) {
        PrayerTopUp.clear()
        call.resolve()
    }
}
