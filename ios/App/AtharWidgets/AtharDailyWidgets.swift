//
//  AtharDailyWidgets.swift
//  The iPhone counterparts of Athar's Android widgets: today's adhkar, the
//  daily Quran wird, the streak, and the Name of the day.
//
//  The app writes the same payloads it gives the Android widgets
//  (src/lib/widgetDataBridge.ts); AppDelegate mirrors them into the App Group
//  (AppDelegate.widgetKeys). Daily values are hidden once their day is over,
//  so yesterday's progress never shows as today's.
//

import SwiftUI
import WidgetKit

private let dailyAppGroup = "group.com.athar.adhkar"
private let dailyGold = Color(red: 1.0, green: 0.91, blue: 0.69)
private let dailyMint = Color(red: 0.49, green: 0.78, blue: 0.64)

private func openURL(_ route: String) -> URL? {
    URL(string: "app.athar://open\(route)")
}

private func loadPayload<T: Decodable>(_ key: String, as type: T.Type) -> T? {
    guard let defaults = UserDefaults(suiteName: dailyAppGroup),
          let json = defaults.string(forKey: key),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
}

/// "2026-11-18" for the device's current local day.
private func localDayKey(_ date: Date) -> String {
    let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
}

/// The local day an ISO timestamp falls on.
private func localDayKey(isoTimestamp: String) -> String? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let date = formatter.date(from: isoTimestamp) ?? ISO8601DateFormatter().date(from: isoTimestamp) else { return nil }
    return localDayKey(date)
}

/// The Fajr-based day the Quran counter belongs to (WidgetDayFreshness.currentIbadahDayKey on Android).
func ibadahDayKey(at now: Date, fajrTime: String?) -> String {
    let clock = (fajrTime ?? "").split(separator: " ").first.map(String.init) ?? ""
    let parts = clock.split(separator: ":").compactMap { Int($0) }
    guard parts.count == 2, (0...23).contains(parts[0]), (0...59).contains(parts[1]),
          let fajr = Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: now) else {
        return localDayKey(now)
    }
    if now < fajr, let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: now) {
        return localDayKey(yesterday)
    }
    return localDayKey(now)
}

private func nextLocalMidnight(after date: Date) -> Date {
    let start = Calendar.current.startOfDay(for: date)
    return Calendar.current.date(byAdding: .day, value: 1, to: start) ?? date.addingTimeInterval(86_400)
}

/// Daily widgets share one simple timeline: now, then the next day boundary.
private struct DailyEntry: TimelineEntry {
    let date: Date
}

private struct DailyProvider: TimelineProvider {
    /// When the widget's content next changes on its own.
    let nextChange: (Date) -> Date

    func placeholder(in context: Context) -> DailyEntry { DailyEntry(date: Date()) }

    func getSnapshot(in context: Context, completion: @escaping (DailyEntry) -> Void) {
        completion(DailyEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyEntry>) -> Void) {
        let now = Date()
        let change = nextChange(now)
        // An entry at the boundary itself redraws with the new day's values.
        completion(Timeline(entries: [DailyEntry(date: now), DailyEntry(date: change)], policy: .after(change.addingTimeInterval(60))))
    }
}

private struct DailyCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .environment(\.layoutDirection, .rightToLeft)
            .atharWidgetBackground()
    }
}

private struct ProgressRow: View {
    let title: String
    let done: Int
    let total: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.subheadline.weight(.semibold)).foregroundColor(.white)
                Spacer()
                Text("\(done)/\(total)")
                    .font(.system(.footnote, design: .rounded).monospacedDigit())
                    .foregroundColor(done >= total ? dailyMint : .white.opacity(0.75))
            }
            ProgressView(value: Double(min(done, total)), total: Double(max(total, 1)))
                .tint(done >= total ? dailyMint : dailyGold)
        }
    }
}

// ─── Adhkar ─────────────────────────────────────────────────────────────────

private struct AdhkarPayload: Decodable {
    struct Part: Decodable { let done: Int; let total: Int }
    let morning: Part
    let evening: Part
    let updatedAt: String?
}

private struct AdhkarToday {
    let morningDone: Int, morningTotal: Int, eveningDone: Int, eveningTotal: Int

    init(at date: Date) {
        let payload = loadPayload("noor_widget_adhkar_v1", as: AdhkarPayload.self)
        let current = payload.flatMap { $0.updatedAt.flatMap(localDayKey(isoTimestamp:)) } == localDayKey(date)
        morningTotal = max(1, payload?.morning.total ?? 31)
        eveningTotal = max(1, payload?.evening.total ?? 30)
        morningDone = current ? min(payload?.morning.done ?? 0, morningTotal) : 0
        eveningDone = current ? min(payload?.evening.done ?? 0, eveningTotal) : 0
    }
}

private struct AdhkarWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DailyEntry

    var body: some View {
        let today = AdhkarToday(at: entry.date)
        // Morning adhkar until mid-afternoon, then evening.
        let eveningNow = Calendar.current.component(.hour, from: entry.date) >= 15
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("الأذكار").font(.caption2).opacity(0.75)
                Text("الصباح \(today.morningDone)/\(today.morningTotal)").font(.caption)
                Text("المساء \(today.eveningDone)/\(today.eveningTotal)").font(.caption)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .environment(\.layoutDirection, .rightToLeft)
            .atharAccessoryBackground()
            .widgetURL(openURL(eveningNow ? "/c/evening" : "/c/morning"))
        default:
            DailyCard {
                VStack(alignment: .leading, spacing: 10) {
                    Text("أذكار اليوم").font(.headline).foregroundColor(dailyGold)
                    if family == .systemSmall {
                        ProgressRow(title: "الصباح", done: today.morningDone, total: today.morningTotal)
                        ProgressRow(title: "المساء", done: today.eveningDone, total: today.eveningTotal)
                    } else {
                        Link(destination: openURL("/c/morning")!) {
                            ProgressRow(title: "أذكار الصباح", done: today.morningDone, total: today.morningTotal)
                        }
                        Link(destination: openURL("/c/evening")!) {
                            ProgressRow(title: "أذكار المساء", done: today.eveningDone, total: today.eveningTotal)
                        }
                    }
                }
            }
            .widgetURL(openURL(eveningNow ? "/c/evening" : "/c/morning"))
        }
    }
}

struct AtharAdhkarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharAdhkarWidget", provider: DailyProvider(nextChange: nextLocalMidnight)) { entry in
            AdhkarWidgetView(entry: entry)
        }
        .configurationDisplayName("أذكار اليوم")
        .description("تقدّمك في أذكار الصباح والمساء")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

// ─── Quran wird ──────────────────────────────────────────────────────────────

private struct WirdPayload: Decodable {
    let day: String?
    let ibadahDay: String?
    let fajrTime: String?
    let ayahsRead: Int
    let dailyGoal: Int
    let currentSurah: String
    let currentAyah: Int
}

private struct WirdToday {
    let read: Int, goal: Int, surah: String, ayah: Int

    init(at date: Date) {
        let payload = loadPayload("noor_widget_wird_v1", as: WirdPayload.self)
        goal = max(1, payload?.dailyGoal ?? 10)
        let stored = payload?.ibadahDay ?? payload?.day
        let current = stored != nil && stored == ibadahDayKey(at: date, fajrTime: payload?.fajrTime)
        read = current ? max(0, payload?.ayahsRead ?? 0) : 0
        surah = payload?.currentSurah ?? ""
        ayah = payload?.currentAyah ?? 0
    }
}

private func nextFajrChange(after date: Date) -> Date {
    let payload = loadPayload("noor_widget_wird_v1", as: WirdPayload.self)
    let clock = (payload?.fajrTime ?? "").split(separator: " ").first.map(String.init) ?? ""
    let parts = clock.split(separator: ":").compactMap { Int($0) }
    if parts.count == 2, let fajr = Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: date) {
        return fajr > date ? fajr : (Calendar.current.date(byAdding: .day, value: 1, to: fajr) ?? nextLocalMidnight(after: date))
    }
    return nextLocalMidnight(after: date)
}

private struct WirdWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DailyEntry

    var body: some View {
        let wird = WirdToday(at: entry.date)
        let place = wird.surah.isEmpty ? "ابدأ القراءة" : "سورة \(wird.surah) · \(wird.ayah)"
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(min(wird.read, wird.goal)), in: 0...Double(wird.goal)) {
                Text("الورد")
            } currentValueLabel: {
                Text("\(wird.read)").font(.system(.body, design: .rounded).monospacedDigit())
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .atharAccessoryBackground()
            .widgetURL(openURL("/quran"))
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("الورد اليومي").font(.caption2).opacity(0.75)
                Text("\(wird.read) من \(wird.goal) آية").font(.headline).widgetAccentable()
                Text(place).font(.caption2).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .environment(\.layoutDirection, .rightToLeft)
            .atharAccessoryBackground()
            .widgetURL(openURL("/quran"))
        default:
            DailyCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("الورد اليومي").font(.headline).foregroundColor(dailyGold)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(wird.read)")
                            .font(.system(size: 34, weight: .bold, design: .rounded).monospacedDigit())
                            .foregroundColor(.white)
                        Text("/ \(wird.goal) آية").font(.footnote).foregroundColor(.white.opacity(0.7))
                    }
                    ProgressView(value: Double(min(wird.read, wird.goal)), total: Double(wird.goal))
                        .tint(wird.read >= wird.goal ? dailyMint : dailyGold)
                    Spacer(minLength: 0)
                    Text(place).font(.caption).foregroundColor(.white.opacity(0.75)).lineLimit(1)
                }
            }
            .widgetURL(openURL("/quran"))
        }
    }
}

struct AtharWirdWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharWirdWidget", provider: DailyProvider(nextChange: nextFajrChange)) { entry in
            WirdWidgetView(entry: entry)
        }
        .configurationDisplayName("الورد اليومي")
        .description("آيات اليوم من هدفك وآخر موضع قرأت منه")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
    }
}

// ─── Streak ──────────────────────────────────────────────────────────────────

private struct DashboardPayload: Decodable {
    let streakDays: Int
    let totalScore: Int
    let levelAr: String
    let levelEmoji: String
}

private struct StreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DailyEntry

    var body: some View {
        let dashboard = loadPayload("noor_widget_dashboard_v1", as: DashboardPayload.self)
        let streak = max(0, dashboard?.streakDays ?? 0)
        switch family {
        case .accessoryInline:
            Text("🔥 \(streak) يومًا متتاليًا").atharAccessoryBackground()
        case .accessoryCircular:
            VStack(spacing: 0) {
                Text("🔥").font(.caption)
                Text("\(streak)").font(.system(.title3, design: .rounded).monospacedDigit().bold())
            }
            .atharAccessoryBackground()
            .widgetURL(openURL("/"))
        default:
            DailyCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("المداومة").font(.headline).foregroundColor(dailyGold)
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("\(streak)")
                            .font(.system(size: 38, weight: .bold, design: .rounded).monospacedDigit())
                            .foregroundColor(.white)
                        Text(streak == 1 ? "يوم" : "يومًا").font(.footnote).foregroundColor(.white.opacity(0.7))
                    }
                    Spacer(minLength: 0)
                    if let dashboard {
                        Text("\(dashboard.levelEmoji) \(dashboard.levelAr)")
                            .font(.caption).foregroundColor(.white.opacity(0.85)).lineLimit(1)
                        Text("\(dashboard.totalScore) نقطة")
                            .font(.caption2.monospacedDigit()).foregroundColor(.white.opacity(0.6))
                    } else {
                        Text("افتح أثر لبدء المداومة").font(.caption).foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .widgetURL(openURL("/"))
        }
    }
}

struct AtharStreakWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharStreakWidget", provider: DailyProvider(nextChange: nextLocalMidnight)) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("المداومة")
        .description("أيامك المتتالية ومستواك")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryInline])
    }
}

// ─── Name of the day ─────────────────────────────────────────────────────────

private struct AsmaWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DailyEntry

    var body: some View {
        let name = asmaAlHusna[dailyAsmaIndex(at: entry.date)]
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("اسم اليوم").font(.caption2).opacity(0.75)
                Text(name.arabic).font(.headline).widgetAccentable()
                Text(name.meaning).font(.caption2).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .environment(\.layoutDirection, .rightToLeft)
            .atharAccessoryBackground()
            .widgetURL(openURL("/asma"))
        default:
            DailyCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("اسم اليوم من الأسماء الحسنى").font(.caption).foregroundColor(.white.opacity(0.7))
                    Text(name.arabic)
                        .font(.system(size: family == .systemSmall ? 30 : 36, weight: .bold))
                        .foregroundColor(dailyGold)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    Text(name.meaning)
                        .font(.footnote)
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(family == .systemSmall ? 3 : 2)
                }
            }
            .widgetURL(openURL("/asma"))
        }
    }
}

struct AtharAsmaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharAsmaWidget", provider: DailyProvider(nextChange: nextAsmaChange)) { entry in
            AsmaWidgetView(entry: entry)
        }
        .configurationDisplayName("اسم اليوم")
        .description("اسم من أسماء الله الحسنى كل يوم ومعناه")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}
