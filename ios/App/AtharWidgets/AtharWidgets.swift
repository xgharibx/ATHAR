//
//  AtharWidgets.swift
//  Athar widgets (WidgetKit) and the next-prayer Live Activity (ActivityKit).
//
//  The app writes the day's prayer times into the App Group
//  "group.com.athar.adhkar" (see AppDelegate.mirrorWidgetDataToAppGroup and
//  WidgetRefreshPlugin). The widgets work out the next prayer themselves, with
//  a timeline entry at every prayer time, so they move on to the next prayer
//  even while the app stays closed.
//

import ActivityKit
import SwiftUI
import WidgetKit

private let appGroup = "group.com.athar.adhkar"
/// Tapping a widget or the countdown opens the app on Prayer Times.
private let prayerTimesURL = URL(string: "app.athar://open/prayer-times")

// ─── Shared payload (written by the web app) ────────────────────────────────

struct PrayerEntryData: Decodable {
    let name: String
    let nameAr: String
    let time: String // "HH:MM", 24-hour
}

struct PrayerPayload: Decodable {
    let prayers: [PrayerEntryData]
}

func loadPrayerPayload() -> PrayerPayload? {
    guard
        let defaults = UserDefaults(suiteName: appGroup),
        let json = defaults.string(forKey: "noor_widget_prayer_v2"),
        let data = json.data(using: .utf8),
        let payload = try? JSONDecoder().decode(PrayerPayload.self, from: data),
        !payload.prayers.isEmpty
    else { return nil }
    return payload
}

/// The date of an "HH:MM" prayer time on the given day.
func prayerDate(_ time: String, on day: Date) -> Date? {
    let parts = time.split(separator: ":").compactMap { Int($0.prefix(2)) }
    guard parts.count >= 2, (0...23).contains(parts[0]), (0...59).contains(parts[1]) else { return nil }
    return Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: day)
}

struct TimedPrayer: Identifiable {
    let name: String
    let nameAr: String
    let date: Date
    var id: String { name }
}

/// Today's prayers on the entry's own day, plus the prayer that comes next.
/// Prayer times move by a minute or two a day, so the last written times stand
/// in for today's until the app writes fresh ones.
struct PrayerDay {
    let prayers: [TimedPrayer]
    let next: TimedPrayer
    let previousDate: Date

    init?(payload: PrayerPayload?, at now: Date) {
        guard let payload else { return nil }
        let today = payload.prayers.compactMap { prayer in
            prayerDate(prayer.time, on: now).map { TimedPrayer(name: prayer.name, nameAr: prayer.nameAr, date: $0) }
        }
        guard let first = today.first, let last = today.last else { return nil }
        prayers = today
        if let upcoming = today.firstIndex(where: { $0.date > now }) {
            next = today[upcoming]
            previousDate = upcoming > 0
                ? today[upcoming - 1].date
                : Calendar.current.date(byAdding: .day, value: -1, to: last.date) ?? now
        } else {
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: first.date) ?? first.date
            next = TimedPrayer(name: first.name, nameAr: first.nameAr, date: tomorrow)
            previousDate = last.date
        }
    }
}

// ─── Timeline ────────────────────────────────────────────────────────────────

struct PrayerEntry: TimelineEntry {
    let date: Date
    let payload: PrayerPayload?
    var day: PrayerDay? { PrayerDay(payload: payload, at: date) }
}

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), payload: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        completion(PrayerEntry(date: Date(), payload: loadPrayerPayload()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let now = Date()
        let payload = loadPrayerPayload()
        // A fresh entry the moment each remaining prayer arrives today.
        let changes = (PrayerDay(payload: payload, at: now)?.prayers ?? [])
            .map(\.date)
            .filter { $0 > now }
        let entries = ([now] + changes).map { PrayerEntry(date: $0, payload: payload) }
        // Rebuild just after midnight for the new day; the app also reloads
        // the timeline every time it writes new prayer times.
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now
        completion(Timeline(entries: entries, policy: .after(tomorrow.addingTimeInterval(60))))
    }
}

// ─── Style ───────────────────────────────────────────────────────────────────

private let gold = Color(red: 1.0, green: 0.91, blue: 0.69)
private let deepGreen = Color(red: 0.02, green: 0.14, blue: 0.10)

private let widgetBackground = LinearGradient(
    colors: [deepGreen, Color(red: 0.04, green: 0.20, blue: 0.13)],
    startPoint: .top,
    endPoint: .bottom
)

extension View {
    /// iOS 17 requires widgets to declare their background through
    /// containerBackground; earlier systems draw it behind the content.
    @ViewBuilder
    func atharWidgetBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { widgetBackground }
        } else {
            background(widgetBackground)
        }
    }

    /// Lock Screen widgets take the system's own background.
    @ViewBuilder
    func atharAccessoryBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { Color.clear }
        } else {
            self
        }
    }
}

/// A countdown the system keeps ticking without waking the widget.
private func countdown(to date: Date, from start: Date) -> Text {
    Text(timerInterval: min(start, date)...date, countsDown: true)
}

// ─── Prayer times widget (medium and large) ─────────────────────────────────

struct PrayerWidgetView: View {
    let entry: PrayerEntry

    var body: some View {
        Group {
            if let day = entry.day {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("مواقيت الصلاة")
                            .font(.headline).foregroundColor(.white)
                        Spacer()
                        Text("\(day.next.nameAr) بعد ")
                            .font(.caption).foregroundColor(gold)
                        + countdown(to: day.next.date, from: entry.date)
                            .font(.caption.monospacedDigit()).foregroundColor(gold)
                    }
                    ForEach(day.prayers) { prayer in
                        let passed = prayer.date <= entry.date
                        let isNext = prayer.name == day.next.name && prayer.date == day.next.date
                        HStack {
                            Text(prayer.nameAr)
                                .font(.subheadline)
                                .foregroundColor(isNext ? gold : (passed ? .white.opacity(0.45) : .white))
                            if passed {
                                Image(systemName: "checkmark")
                                    .font(.caption2)
                                    .foregroundColor(.green.opacity(0.7))
                            }
                            Spacer()
                            Text(prayer.date, style: .time)
                                .font(.system(.subheadline, design: .rounded).monospacedDigit())
                                .foregroundColor(isNext ? gold : (passed ? .white.opacity(0.45) : .white))
                        }
                    }
                }
                .padding(14)
            } else {
                VStack(spacing: 6) {
                    Text("مواقيت الصلاة").font(.headline).foregroundColor(.white)
                    Text("افتح التطبيق لتحميل المواقيت")
                        .font(.caption).foregroundColor(.white.opacity(0.6))
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .atharWidgetBackground()
        .widgetURL(prayerTimesURL)
    }
}

struct AtharPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharPrayerWidget", provider: PrayerProvider()) { entry in
            PrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("مواقيت الصلاة")
        .description("مواقيت الصلوات الخمس والصلاة القادمة")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// ─── Next prayer widget (small, and on the Lock Screen) ─────────────────────

struct NextPrayerWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    var body: some View {
        if let day = entry.day {
            switch family {
            case .accessoryInline:
                (Text("\(day.next.nameAr) ") + Text(day.next.date, style: .time))
                    .atharAccessoryBackground()
            case .accessoryCircular:
                ProgressView(timerInterval: min(day.previousDate, entry.date)...day.next.date, countsDown: true) {
                    Text(day.next.nameAr)
                } currentValueLabel: {
                    Text(day.next.nameAr).font(.system(size: 11, weight: .semibold))
                }
                .progressViewStyle(.circular)
                .atharAccessoryBackground()
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 1) {
                    Text("الصلاة القادمة").font(.caption2).opacity(0.75)
                    Text(day.next.nameAr).font(.headline).widgetAccentable()
                    HStack(spacing: 4) {
                        Text(day.next.date, style: .time)
                        Text("·")
                        countdown(to: day.next.date, from: entry.date).monospacedDigit()
                    }
                    .font(.caption)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .environment(\.layoutDirection, .rightToLeft)
                .atharAccessoryBackground()
            default:
                VStack(alignment: .leading, spacing: 4) {
                    Text("الصلاة القادمة").font(.caption).foregroundColor(.white.opacity(0.7))
                    Text(day.next.nameAr).font(.title2.bold()).foregroundColor(gold)
                    Text(day.next.date, style: .time)
                        .font(.system(.title3, design: .rounded).monospacedDigit())
                        .foregroundColor(.white)
                    Spacer(minLength: 0)
                    countdown(to: day.next.date, from: entry.date)
                        .font(.system(.footnote, design: .rounded).monospacedDigit())
                        .foregroundColor(.white.opacity(0.8))
                    ProgressView(timerInterval: min(day.previousDate, entry.date)...day.next.date, countsDown: false) {
                        EmptyView()
                    } currentValueLabel: {
                        EmptyView()
                    }
                    .tint(gold)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .padding(14)
                .environment(\.layoutDirection, .rightToLeft)
                .atharWidgetBackground()
            }
        } else {
            switch family {
            case .accessoryInline, .accessoryCircular, .accessoryRectangular:
                Text("افتح أثر").atharAccessoryBackground()
            default:
                Text("افتح التطبيق لتحميل المواقيت")
                    .font(.caption).foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding()
                    .atharWidgetBackground()
            }
        }
    }
}

struct AtharNextPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharNextPrayerWidget", provider: PrayerProvider()) { entry in
            NextPrayerWidgetView(entry: entry)
                .widgetURL(prayerTimesURL)
        }
        .configurationDisplayName("الصلاة القادمة")
        .description("الصلاة القادمة والوقت المتبقي لها")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

// ─── Live Activity: countdown to the next prayer ────────────────────────────

struct PrayerActivityTimes {
    let state: PrayerActivityAttributes.ContentState
    let arrived: Bool

    /// The prayer being counted down to: this one, or the next once it has arrived.
    var targetName: String { arrived ? (state.followingNameAr ?? state.prayerNameAr) : state.prayerNameAr }
    var targetRange: ClosedRange<Date>? {
        if !arrived { return min(state.countdownStart, state.prayerTime)...state.prayerTime }
        guard let following = state.followingTime, following > state.prayerTime else { return nil }
        return state.prayerTime...following
    }
}

struct PrayerActivityLockScreenView: View {
    let times: PrayerActivityTimes

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center) {
                Image(systemName: times.arrived ? "bell.fill" : "moon.stars.fill")
                    .font(.title3)
                    .foregroundColor(gold)
                VStack(alignment: .leading, spacing: 2) {
                    Text(times.arrived ? "حان الآن وقت صلاة" : "الصلاة القادمة")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                    Text(times.state.prayerNameAr)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    if let range = times.targetRange {
                        Text(times.arrived ? "\(times.targetName) بعد" : "بعد")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                        Text(timerInterval: range, countsDown: true)
                            .font(.system(.title2, design: .rounded).monospacedDigit().bold())
                            .foregroundColor(gold)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 120, alignment: .trailing)
                    }
                }
            }
            if let range = times.targetRange {
                ProgressView(timerInterval: range, countsDown: false) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(gold)
                HStack {
                    Text(times.arrived ? "أذان \(times.targetName)" : "الأذان")
                    Spacer()
                    Text(range.upperBound, style: .time)
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding(16)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

struct PrayerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PrayerActivityAttributes.self) { context in
            PrayerActivityLockScreenView(times: PrayerActivityTimes(state: context.state, arrived: context.isStale))
                .widgetURL(prayerTimesURL)
                .activityBackgroundTint(deepGreen)
                .activitySystemActionForegroundColor(gold)
        } dynamicIsland: { context in
            let times = PrayerActivityTimes(state: context.state, arrived: context.isStale)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(times.arrived ? "حان الآن" : "الصلاة القادمة")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.7))
                        Text(times.state.prayerNameAr)
                            .font(.title3.bold())
                            .foregroundColor(gold)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let range = times.targetRange {
                        Text(timerInterval: range, countsDown: true)
                            .font(.system(.title3, design: .rounded).monospacedDigit().bold())
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 96, alignment: .trailing)
                            .padding(.trailing, 4)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let range = times.targetRange {
                        VStack(spacing: 4) {
                            ProgressView(timerInterval: range, countsDown: false) {
                                EmptyView()
                            } currentValueLabel: {
                                EmptyView()
                            }
                            .tint(gold)
                            HStack {
                                Text(times.arrived ? "أذان \(times.targetName)" : "الأذان")
                                Spacer()
                                Text(range.upperBound, style: .time)
                            }
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.7))
                        }
                        .environment(\.layoutDirection, .rightToLeft)
                    }
                }
            } compactLeading: {
                Image(systemName: times.arrived ? "bell.fill" : "moon.stars.fill")
                    .foregroundColor(gold)
            } compactTrailing: {
                if let range = times.targetRange {
                    Text(timerInterval: range, countsDown: true)
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 52)
                        .foregroundColor(gold)
                } else {
                    Text(times.state.prayerNameAr).foregroundColor(gold)
                }
            } minimal: {
                Image(systemName: times.arrived ? "bell.fill" : "moon.stars.fill")
                    .foregroundColor(gold)
            }
            .keylineTint(gold)
            .widgetURL(prayerTimesURL)
        }
    }
}

// ─── Bundle ──────────────────────────────────────────────────────────────────

@main
struct AtharWidgetBundle: WidgetBundle {
    var body: some Widget {
        AtharPrayerWidget()
        AtharNextPrayerWidget()
        PrayerLiveActivity()
    }
}
