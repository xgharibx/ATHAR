//
//  AtharTasbeehWidget.swift
//  A tasbeeh on the Home Screen: tap the counter to count, without opening
//  the app (iOS 17 and later; on iOS 16 it shows today's count and opens the
//  Sebha).
//
//  It behaves like the Android tasbeeh widget (NoorTasbeehWidgetProvider):
//  the same four phrases and targets, moving to the next phrase at its
//  target, and starting again each day. Every tap is also added to the same
//  per-account, per-day ledger the Android widget keeps
//  (noor_widget_tasbeeh_totals_v1), which the app merges into its tasbeeh
//  statistics when it opens (src/lib/tasbeehWidgetSync.ts).
//

import AppIntents
import SwiftUI
import WidgetKit

enum WidgetTasbeeh {
    /// Exactly the Android widget's phrases: the app credits taps by this text.
    static let phrases = ["سُبْحَانَ اللَّهِ", "الحَمْدُ لِلَّهِ", "اللَّهُ أَكْبَر", "لا إِلَهَ إِلَّا اللَّه"]
    static let targets = [33, 33, 33, 100]

    private static let group = "group.com.athar.adhkar"
    private static let indexKey = "tasbeeh_widget_index"
    private static let countKey = "tasbeeh_widget_count"
    private static let dayKey = "tasbeeh_widget_day"
    static let totalsKey = "noor_widget_tasbeeh_totals_v1"
    static let ownerKey = "noor_widget_tasbeeh_owner_v1"

    struct State {
        var index: Int
        var count: Int
        var phrase: String { phrases[index] }
        var target: Int { targets[index] }
    }

    private static var defaults: UserDefaults? { UserDefaults(suiteName: group) }

    static func today(_ date: Date = Date()) -> String {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// Today's state; a new day starts again from the first phrase.
    static func load(at date: Date = Date()) -> State {
        guard let defaults, defaults.string(forKey: dayKey) == today(date) else { return State(index: 0, count: 0) }
        let index = defaults.integer(forKey: indexKey)
        return State(index: phrases.indices.contains(index) ? index : 0, count: max(0, defaults.integer(forKey: countKey)))
    }

    private static func save(_ state: State) {
        guard let defaults else { return }
        defaults.set(today(), forKey: dayKey)
        defaults.set(state.index, forKey: indexKey)
        defaults.set(state.count, forKey: countKey)
    }

    static func increment() {
        var state = load()
        recordTap(state.phrase)
        state.count += 1
        if state.count >= state.target {
            state.index = (state.index + 1) % phrases.count
            state.count = 0
        }
        save(state)
    }

    static func reset() {
        var state = load()
        state.count = 0
        save(state)
    }

    static func next() {
        var state = load()
        state.index = (state.index + 1) % phrases.count
        state.count = 0
        save(state)
    }

    /// { "version": 2, "owners": { owner: { "YYYY-MM-DD": { "counts": { phrase: n }, "total": n } } } }
    private static func recordTap(_ phrase: String) {
        guard let defaults else { return }
        var payload = (defaults.string(forKey: totalsKey)?.data(using: .utf8))
            .flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
        var owners = payload["owners"] as? [String: Any] ?? [:]
        let owner = defaults.string(forKey: ownerKey).flatMap { $0.isEmpty ? nil : $0 } ?? "local"
        var days = owners[owner] as? [String: Any] ?? [:]
        let todayKey = today()
        var day = days[todayKey] as? [String: Any] ?? [:]
        var counts = day["counts"] as? [String: Any] ?? [:]
        counts[phrase] = ((counts[phrase] as? Int) ?? 0) + 1
        day["counts"] = counts
        day["total"] = ((day["total"] as? Int) ?? 0) + 1
        days[todayKey] = day
        owners[owner] = days
        payload["owners"] = owners
        payload["version"] = 2
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let json = String(data: data, encoding: .utf8) {
            defaults.set(json, forKey: totalsKey)
        }
    }
}

struct TasbeehIncrementIntent: AppIntent {
    static let title: LocalizedStringResource = "سبّح"
    func perform() async throws -> some IntentResult {
        WidgetTasbeeh.increment()
        return .result()
    }
}

struct TasbeehResetIntent: AppIntent {
    static let title: LocalizedStringResource = "إعادة العدّ"
    func perform() async throws -> some IntentResult {
        WidgetTasbeeh.reset()
        return .result()
    }
}

struct TasbeehNextIntent: AppIntent {
    static let title: LocalizedStringResource = "الذكر التالي"
    func perform() async throws -> some IntentResult {
        WidgetTasbeeh.next()
        return .result()
    }
}

private struct TasbeehEntry: TimelineEntry {
    let date: Date
}

private struct TasbeehProvider: TimelineProvider {
    func placeholder(in context: Context) -> TasbeehEntry { TasbeehEntry(date: Date()) }

    func getSnapshot(in context: Context, completion: @escaping (TasbeehEntry) -> Void) {
        completion(TasbeehEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TasbeehEntry>) -> Void) {
        let now = Date()
        // Taps reload the widget themselves; the only scheduled change is the new day.
        let midnight = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now
        completion(Timeline(entries: [TasbeehEntry(date: now), TasbeehEntry(date: midnight)], policy: .after(midnight.addingTimeInterval(60))))
    }
}

private let tasbeehGold = Color(red: 1.0, green: 0.91, blue: 0.69)

private struct TasbeehCounter: View {
    let state: WidgetTasbeeh.State
    let large: Bool

    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.15), lineWidth: 6)
            Circle()
                .trim(from: 0, to: CGFloat(state.count) / CGFloat(max(state.target, 1)))
                .stroke(tasbeehGold, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(state.count)")
                    .font(.system(size: large ? 30 : 26, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundColor(.white)
                Text("من \(state.target)").font(.caption2).foregroundColor(.white.opacity(0.65))
            }
        }
    }
}

private struct TasbeehWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TasbeehEntry

    var body: some View {
        let state = WidgetTasbeeh.load(at: entry.date)
        let large = family == .systemMedium
        VStack(spacing: 8) {
            Text(state.phrase)
                .font(.system(size: large ? 18 : 15, weight: .semibold))
                .foregroundColor(tasbeehGold)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if #available(iOS 17.0, *) {
                HStack(spacing: 14) {
                    Button(intent: TasbeehIncrementIntent()) {
                        TasbeehCounter(state: state, large: large)
                            .frame(width: large ? 96 : 84, height: large ? 96 : 84)
                            .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("سبّح: \(state.phrase)")
                    if large {
                        VStack(spacing: 10) {
                            Button(intent: TasbeehNextIntent()) {
                                Label("التالي", systemImage: "chevron.left").font(.caption)
                            }
                            Button(intent: TasbeehResetIntent()) {
                                Label("إعادة", systemImage: "arrow.counterclockwise").font(.caption)
                            }
                        }
                        .buttonStyle(.plain)
                        .foregroundColor(.white.opacity(0.85))
                    }
                }
            } else {
                // iOS 16: widgets cannot run actions, so the counter opens the Sebha.
                TasbeehCounter(state: state, large: large)
                    .frame(width: large ? 96 : 84, height: large ? 96 : 84)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
        .environment(\.layoutDirection, .rightToLeft)
        .atharWidgetBackground()
        .widgetURL(URL(string: "app.athar://open/sebha"))
    }
}

struct AtharTasbeehWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharTasbeehWidget", provider: TasbeehProvider()) { entry in
            TasbeehWidgetView(entry: entry)
        }
        .configurationDisplayName("السبحة")
        .description("سبّح من الشاشة الرئيسية بلمسة، ويُضاف العدّ إلى إحصاءاتك في أثر")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
