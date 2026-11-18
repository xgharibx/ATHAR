import AppIntents
import Foundation

/**
 * Siri and Shortcuts: "When is the next prayer in Athar?" / «متى الصلاة
 * القادمة في أثر؟». Siri answers out loud without opening the app, from the
 * prayer times the app last saved (the same payload the widgets use).
 *
 * The English phrases are below; the Arabic ones are in
 * ar.lproj/AppShortcuts.strings.
 */
struct NextPrayerIntent: AppIntent {
    static let title: LocalizedStringResource = "Next prayer"
    static let description: IntentDescription? = IntentDescription("Tells you the next prayer and how long until it.")
    static let openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let arabic = Locale.current.language.languageCode?.identifier == "ar"
        guard let next = NextPrayer.find(after: Date()) else {
            return .result(dialog: IntentDialog(stringLiteral: arabic
                ? "افتح أثر مرة ليحمّل مواقيت الصلاة، ثم اسألني مجددًا."
                : "Open Athar once so it can load your prayer times, then ask me again."))
        }
        let time = next.date.formatted(date: .omitted, time: .shortened)
        let left = NextPrayer.spokenDuration(until: next.date, arabic: arabic)
        return .result(dialog: IntentDialog(stringLiteral: arabic
            ? "صلاة \(next.nameAr) الساعة \(time)، بعد \(left)."
            : "\(next.name) is at \(time), in \(left)."))
    }
}

struct AtharShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: NextPrayerIntent(),
            phrases: [
                "When is the next prayer in \(.applicationName)",
                "Next prayer in \(.applicationName)",
                "\(.applicationName) next prayer",
            ]
        )
    }
}

/// The next prayer from the times the app saved for today
/// (src/lib/prayerWidget.ts writes them; the widgets read the same data).
enum NextPrayer {
    struct Entry {
        let name: String
        let nameAr: String
        let date: Date
    }

    private struct Payload: Decodable {
        struct Prayer: Decodable {
            let name: String
            let nameAr: String
            let time: String
        }
        let prayers: [Prayer]
    }

    private static let key = "noor_widget_prayer_v2"

    private static func payload() -> Payload? {
        let json = UserDefaults.standard.string(forKey: "CapacitorStorage." + key)
            ?? UserDefaults(suiteName: AppDelegate.widgetAppGroup)?.string(forKey: key)
        guard let data = json?.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Payload.self, from: data)
    }

    static func find(after now: Date) -> Entry? {
        guard let payload = payload(), !payload.prayers.isEmpty else { return nil }
        let today = payload.prayers.compactMap { prayer -> Entry? in
            let parts = prayer.time.split(separator: ":").compactMap { Int($0.prefix(2)) }
            guard parts.count >= 2,
                  let date = Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: now) else { return nil }
            return Entry(name: prayer.name, nameAr: prayer.nameAr, date: date)
        }
        if let upcoming = today.first(where: { $0.date > now }) { return upcoming }
        // After Isha: tomorrow's Fajr, a minute or two from today's time.
        guard let fajr = today.first,
              let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: fajr.date) else { return nil }
        return Entry(name: fajr.name, nameAr: fajr.nameAr, date: tomorrow)
    }

    /// "ساعة و٢٠ دقيقة" / "1 hour 20 minutes".
    static func spokenDuration(until date: Date, arabic: Bool) -> String {
        let minutes = max(1, Int((date.timeIntervalSinceNow / 60).rounded(.up)))
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = minutes >= 60 ? [.hour, .minute] : [.minute]
        formatter.unitsStyle = .full
        var calendar = Calendar.current
        calendar.locale = Locale(identifier: arabic ? "ar" : "en")
        formatter.calendar = calendar
        return formatter.string(from: TimeInterval(minutes * 60)) ?? "\(minutes)"
    }
}
