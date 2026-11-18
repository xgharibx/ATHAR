import Foundation
import SwiftUI
#if canImport(AlarmKit)
import ActivityKit
import AlarmKit
#endif

/**
 * The Adhan as a real alarm on iPhone (iOS 26+, AlarmKit): it rings through
 * silent mode and Focus with the system's full-screen alarm and a Stop button
 * (src/lib/adhanAlarm.ts). The next alarms come from the prayer plan
 * (PrayerTopUp), so they are renewed whenever iOS lets Athar run.
 */
enum AdhanAlarmKit {
    /// iOS 26 or later, where apps can set alarms.
    static var available: Bool {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) { return true }
        #endif
        return false
    }

    static var authorized: Bool {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) { return AlarmManager.shared.authorizationState == .authorized }
        #endif
        return false
    }

    static func requestAuthorization() async -> Bool {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            do {
                return try await AlarmManager.shared.requestAuthorization() == .authorized
            } catch {
                return false
            }
        }
        #endif
        return false
    }

    /// Replace the alarms set earlier with the plan's next ones.
    static func sync(plan: [String: Any]?) async {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            await AdhanAlarms.sync(plan: plan)
        }
        #endif
    }

    static func cancelAll() async {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            AdhanAlarms.cancelScheduled()
        }
        #endif
    }

    /// Ring once in a few seconds, to hear it.
    static func test(title: String) async -> Bool {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            var allowed = authorized
            if !allowed { allowed = await requestAuthorization() }
            guard allowed else { return false }
            do {
                try await AdhanAlarms.schedule(id: UUID(), at: Date().addingTimeInterval(5), title: title, prayer: "test", sound: AdhanAlarms.defaultSound)
                return true
            } catch {
                return false
            }
        }
        #endif
        return false
    }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct AdhanAlarmMetadata: AlarmMetadata {
    var prayer: String
}

@available(iOS 26.0, *)
enum AdhanAlarms {
    private static let idsKey = "athar_adhan_alarm_ids_v1"
    private static let prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    /// About a week of Fajr alarms, or a day and a half of all five.
    private static let maxAlarms = 8
    static let defaultSound = "adhan_ahmad_al_nafees.caf"

    static func sync(plan: [String: Any]?) async {
        cancelScheduled()
        // In another time zone the plan's times are another city's: no alarms until the app updates them.
        guard AdhanAlarmKit.authorized,
              PrayerTopUp.timeZoneMatches(plan),
              let plan,
              let alarm = plan["alarm"] as? [String: Any],
              let chosen = alarm["prayers"] as? [String], !chosen.isEmpty else { return }
        let names = alarm["names"] as? [String: String] ?? [:]
        let sound = (alarm["sound"] as? [String: String])?["ios"] ?? defaultSound

        var ids: [String] = []
        for next in upcoming(plan: plan, alarm: alarm, chosen: chosen, now: Date()).prefix(maxAlarms) {
            let id = UUID()
            let title = "حان وقت صلاة " + (names[next.prayer] ?? next.prayer)
            do {
                try await schedule(id: id, at: next.date, title: title, prayer: next.prayer, sound: sound)
                ids.append(id.uuidString)
            } catch {
                break
            }
        }
        UserDefaults.standard.set(ids, forKey: idsKey)
    }

    /// The chosen prayers' times from today: the app's own days first, then the offline plan.
    private static func upcoming(plan: [String: Any], alarm: [String: Any], chosen: [String], now: Date) -> [(date: Date, prayer: String)] {
        var byDay: [String: [String: String]] = [:]
        for day in (plan["days"] as? [[String: Any]]) ?? [] {
            if let d = day["d"] as? String, let t = day["t"] as? [String: String] { byDay[d] = t }
        }
        for day in (alarm["appDays"] as? [[String: Any]]) ?? [] {
            if let d = day["d"] as? String, let t = day["t"] as? [String: String] { byDay[d] = t }
        }
        var result: [(date: Date, prayer: String)] = []
        for (dateISO, times) in byDay {
            let parts = dateISO.split(separator: "-").compactMap { Int($0) }
            guard parts.count == 3 else { continue }
            for prayer in prayers where chosen.contains(prayer) {
                guard let hhmm = times[prayer] else { continue }
                let clock = hhmm.split(separator: ":").compactMap { Int($0.prefix(2)) }
                guard clock.count >= 2 else { continue }
                let components = DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: clock[0], minute: clock[1])
                guard let date = Calendar.current.date(from: components), date.timeIntervalSince(now) > 30 else { continue }
                result.append((date, prayer))
            }
        }
        return result.sorted { $0.date < $1.date }
    }

    static func schedule(id: UUID, at date: Date, title: String, prayer: String, sound: String) async throws {
        let stop = AlarmButton(text: "إيقاف", textColor: .white, systemImageName: "stop.circle")
        let alert = AlarmPresentation.Alert(title: LocalizedStringResource(String.LocalizationValue(title)), stopButton: stop)
        let attributes = AlarmAttributes<AdhanAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: AdhanAlarmMetadata(prayer: prayer),
            tintColor: Color(red: 0.85, green: 0.71, blue: 0.42)
        )
        let configuration = AlarmManager.AlarmConfiguration<AdhanAlarmMetadata>.alarm(
            schedule: .fixed(date),
            attributes: attributes,
            sound: AlertConfiguration.AlertSound.named(sound)
        )
        _ = try await AlarmManager.shared.schedule(id: id, configuration: configuration)
    }

    static func cancelScheduled() {
        for raw in UserDefaults.standard.stringArray(forKey: idsKey) ?? [] {
            if let id = UUID(uuidString: raw) { try? AlarmManager.shared.cancel(id: id) }
        }
        UserDefaults.standard.removeObject(forKey: idsKey)
    }
}
#endif
