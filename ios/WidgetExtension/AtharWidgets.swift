//
//  AtharWidgets.swift
//  Athar home-screen widgets (WidgetKit)
//
//  NOT yet part of an Xcode target — see README.md in this folder for the
//  one-time Xcode setup (Widget Extension target + App Group). The app side
//  is already done: AppDelegate mirrors widget payloads into the App Group
//  "group.com.athar.adhkar" every time the app goes to background.
//

import WidgetKit
import SwiftUI

private let appGroup = "group.com.athar.adhkar"

// ─── Shared payload models (written by the web app) ─────────────────────────

struct PrayerEntryData: Decodable {
    let name: String
    let nameAr: String
    let time: String   // "HH:MM" 24h
    let passed: Bool
}

struct PrayerPayload: Decodable {
    struct NextPrayer: Decodable {
        let name: String
        let nameAr: String
        let time: String
    }
    let updatedAt: String
    let nextPrayer: NextPrayer?
    let prayers: [PrayerEntryData]
    let isRamadan: Bool
    let suhoor: String?
    let iftar: String?
}

func loadPrayerPayload() -> PrayerPayload? {
    guard
        let defaults = UserDefaults(suiteName: appGroup),
        let json = defaults.string(forKey: "noor_widget_prayer_v2"),
        let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(PrayerPayload.self, from: data)
}

func format12h(_ time24: String) -> String {
    let parts = time24.split(separator: ":").compactMap { Int($0) }
    guard parts.count == 2 else { return time24 }
    let suffix = parts[0] < 12 ? "ص" : "م"
    var h = parts[0] % 12
    if h == 0 { h = 12 }
    return String(format: "%d:%02d %@", h, parts[1], suffix)
}

// ─── Timeline ────────────────────────────────────────────────────────────────

struct PrayerEntry: TimelineEntry {
    let date: Date
    let payload: PrayerPayload?
}

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), payload: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        completion(PrayerEntry(date: Date(), payload: loadPrayerPayload()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let entry = PrayerEntry(date: Date(), payload: loadPrayerPayload())
        // Refresh every 15 minutes; the app also forces a reload whenever it backgrounds.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// ─── Views ───────────────────────────────────────────────────────────────────

struct PrayerWidgetView: View {
    let entry: PrayerEntry

    private let bgTop = Color(red: 0.02, green: 0.14, blue: 0.10)
    private let bgBottom = Color(red: 0.04, green: 0.20, blue: 0.13)
    private let gold = Color(red: 1.0, green: 0.91, blue: 0.69)

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .top, endPoint: .bottom)
            if let payload = entry.payload {
                VStack(alignment: .trailing, spacing: 6) {
                    HStack {
                        if let next = payload.nextPrayer {
                            Text("القادمة: \(next.nameAr) \(format12h(next.time))")
                                .font(.caption).foregroundColor(gold)
                        }
                        Spacer()
                        Text("مواقيت الصلاة")
                            .font(.headline).foregroundColor(.white)
                    }
                    ForEach(payload.prayers, id: \.name) { prayer in
                        HStack {
                            Text(format12h(prayer.time))
                                .font(.system(.subheadline, design: .rounded).monospacedDigit())
                                .foregroundColor(prayer.passed ? .white.opacity(0.45) : .white)
                            Spacer()
                            if prayer.passed {
                                Image(systemName: "checkmark")
                                    .font(.caption2)
                                    .foregroundColor(.green.opacity(0.7))
                            }
                            Text(prayer.nameAr)
                                .font(.subheadline)
                                .foregroundColor(
                                    prayer.nameAr == payload.nextPrayer?.nameAr
                                        ? gold
                                        : (prayer.passed ? .white.opacity(0.45) : .white)
                                )
                        }
                    }
                }
                .padding(14)
                .environment(\.layoutDirection, .rightToLeft)
            } else {
                VStack(spacing: 6) {
                    Text("مواقيت الصلاة").font(.headline).foregroundColor(.white)
                    Text("افتح التطبيق لتحميل المواقيت")
                        .font(.caption).foregroundColor(.white.opacity(0.6))
                }
            }
        }
    }
}

// ─── Widget declarations ─────────────────────────────────────────────────────

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

@main
struct AtharWidgetBundle: WidgetBundle {
    var body: some Widget {
        AtharPrayerWidget()
    }
}
