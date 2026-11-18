//
//  AtharMoreWidgets.swift
//  More iPhone counterparts of Athar's Android widgets: missed prayers
//  (القضاء), today's hadith (السنة), and the Qibla direction.
//
//  The app writes the same payloads it gives the Android widgets
//  (src/lib/widgetDataBridge.ts); AppDelegate mirrors them into the App Group.
//

import SwiftUI
import WidgetKit

private let moreAppGroup = "group.com.athar.adhkar"
private let moreGold = Color(red: 1.0, green: 0.91, blue: 0.69)
private let moreMint = Color(red: 0.49, green: 0.78, blue: 0.64)

private func moreURL(_ route: String) -> URL? {
    URL(string: "app.athar://open\(route)")
}

private func morePayload<T: Decodable>(_ key: String, as type: T.Type) -> T? {
    guard let defaults = UserDefaults(suiteName: moreAppGroup),
          let json = defaults.string(forKey: key), !json.isEmpty,
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
}

/// Western digits to Arabic-Indic, as the Android widgets show them.
private func arabicDigits(_ value: Int) -> String {
    String(String(value).map { char in
        guard let digit = char.wholeNumberValue else { return char }
        return Character(UnicodeScalar(0x0660 + digit)!)
    })
}

private struct MoreEntry: TimelineEntry {
    let date: Date
}

/// Redraws at the next local midnight (and whenever the app reloads widgets).
private struct MoreProvider: TimelineProvider {
    func placeholder(in context: Context) -> MoreEntry { MoreEntry(date: Date()) }

    func getSnapshot(in context: Context, completion: @escaping (MoreEntry) -> Void) {
        completion(MoreEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoreEntry>) -> Void) {
        let now = Date()
        let midnight = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now
        completion(Timeline(entries: [MoreEntry(date: now), MoreEntry(date: midnight)], policy: .after(midnight.addingTimeInterval(60))))
    }
}

private struct MoreCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .environment(\.layoutDirection, .rightToLeft)
            .atharWidgetBackground()
    }
}

// ─── Missed prayers (القضاء) ─────────────────────────────────────────────────

private struct QadaaPayload: Decodable {
    let configured: Bool
    let owed: Int?
    let remaining: Int?
    let percent: Int?
    let quotaTotal: Int?
    let quotaLeft: Int?
    let streak: Int?
    let fastRemaining: Int?
    let day: String?
    let ibadahDay: String?
    let fajrTime: String?
}

private struct QadaaToday {
    let configured: Bool
    let finished: Bool
    let remaining: Int
    let percent: Int
    let todayLine: String
    let fasts: Int

    init(at date: Date) {
        let payload = morePayload("noor_widget_qadaa_v1", as: QadaaPayload.self)
        configured = payload?.configured == true
        remaining = max(0, payload?.remaining ?? 0)
        percent = max(0, min(100, payload?.percent ?? 0))
        finished = configured && remaining == 0 && (payload?.owed ?? 0) > 0
        fasts = max(0, payload?.fastRemaining ?? 0)
        // Today's share only counts on its own (Fajr-based) day.
        let stored = payload?.ibadahDay ?? payload?.day
        let current = stored != nil && stored == ibadahDayKey(at: date, fajrTime: payload?.fajrTime)
        let total = current ? max(0, payload?.quotaTotal ?? 0) : 0
        let left = current ? max(0, payload?.quotaLeft ?? 0) : 0
        if total > 0 {
            todayLine = left == 0 ? "أتممتَ حصة اليوم" : "اليوم \(arabicDigits(total - left))/\(arabicDigits(total))"
        } else {
            todayLine = current ? "لا حصة اليوم" : "افتح أثر لتحديث حصة اليوم"
        }
    }
}

private struct QadaaWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MoreEntry

    var body: some View {
        let today = QadaaToday(at: entry.date)
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(today.percent), in: 0...100) {
                Text("قضاء")
            } currentValueLabel: {
                Text(today.configured ? arabicDigits(today.remaining) : "–")
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .atharAccessoryBackground()
            .widgetURL(moreURL("/qadaa"))
        default:
            MoreCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("قضاء الفوائت").font(.headline).foregroundColor(moreGold)
                    if !today.configured {
                        Text("ابدأ خطة القضاء من التطبيق").font(.subheadline).foregroundColor(.white.opacity(0.8))
                    } else if today.finished {
                        Text("✓ أتممتَ قضاء الصلوات").font(.title3.weight(.bold)).foregroundColor(moreMint)
                    } else {
                        Text("\(arabicDigits(today.remaining)) صلاة متبقية")
                            .font(.title3.weight(.bold)).foregroundColor(.white)
                        Text(today.todayLine).font(.footnote).foregroundColor(.white.opacity(0.8))
                    }
                    if today.configured {
                        ProgressView(value: Double(today.percent), total: 100).tint(moreMint)
                        HStack {
                            Text("\(arabicDigits(today.percent))٪ مكتمل")
                            if today.fasts > 0 {
                                Spacer()
                                Text("\(arabicDigits(today.fasts)) صيام متبقٍ")
                            }
                        }
                        .font(.caption2).foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .widgetURL(moreURL("/qadaa"))
        }
    }
}

struct AtharQadaaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharQadaaWidget", provider: MoreProvider()) { entry in
            QadaaWidgetView(entry: entry)
        }
        .configurationDisplayName("قضاء الفوائت")
        .description("الصلوات المتبقية وحصة اليوم")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}

// ─── Today's hadith (السنة) ──────────────────────────────────────────────────

private struct SunnahPayload: Decodable {
    let id: String?
    let hadeeth: String
    let attribution: String?
    let grade: String?
}

private struct SunnahWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MoreEntry

    var body: some View {
        let payload = morePayload("noor_widget_sunnah_v1", as: SunnahPayload.self)
        let id = payload?.id?.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" } ?? ""
        let route = id.isEmpty ? "/library/hadith" : "/library/sharh?h=\(id)"
        MoreCard {
            VStack(alignment: .leading, spacing: 6) {
                Text("حديث اليوم").font(.caption.weight(.semibold)).foregroundColor(moreGold)
                if let payload, !payload.hadeeth.isEmpty {
                    Text(payload.hadeeth)
                        .font(.system(size: family == .systemLarge ? 18 : 15))
                        .foregroundColor(.white)
                        .lineLimit(family == .systemLarge ? 12 : family == .systemMedium ? 4 : 5)
                        .minimumScaleFactor(0.8)
                    Spacer(minLength: 0)
                    Text([payload.attribution, payload.grade].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                        .font(.caption2).foregroundColor(.white.opacity(0.65))
                        .lineLimit(1)
                } else {
                    Text("افتح أثر ليظهر حديث اليوم هنا").font(.subheadline).foregroundColor(.white.opacity(0.8))
                }
            }
        }
        .widgetURL(moreURL(route))
    }
}

struct AtharSunnahWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharSunnahWidget", provider: MoreProvider()) { entry in
            SunnahWidgetView(entry: entry)
        }
        .configurationDisplayName("حديث اليوم")
        .description("حديث صحيح كل يوم مع مصدره ودرجته")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// ─── Qibla ───────────────────────────────────────────────────────────────────

private struct QiblaPayload: Decodable {
    let lat: Double
    let lng: Double
}

/// Bearing from true north (degrees) and distance (km) to the Kaaba.
func qiblaDirection(lat: Double, lng: Double) -> (bearing: Double, km: Double) {
    let kaabaLat = 21.4225 * .pi / 180
    let kaabaLng = 39.8262 * .pi / 180
    let φ = lat * .pi / 180
    let Δλ = kaabaLng - lng * .pi / 180
    let y = sin(Δλ) * cos(kaabaLat)
    let x = cos(φ) * sin(kaabaLat) - sin(φ) * cos(kaabaLat) * cos(Δλ)
    let bearing = (atan2(y, x) * 180 / .pi + 360).truncatingRemainder(dividingBy: 360)
    let h = pow(sin((kaabaLat - φ) / 2), 2) + cos(φ) * cos(kaabaLat) * pow(sin(Δλ / 2), 2)
    let km = 2 * 6371 * asin(min(1, sqrt(h)))
    return (bearing, km)
}

private func compassWord(_ bearing: Double) -> String {
    let words = ["الشمال", "الشمال الشرقي", "الشرق", "الجنوب الشرقي", "الجنوب", "الجنوب الغربي", "الغرب", "الشمال الغربي"]
    return words[Int((bearing + 22.5) / 45) % 8]
}

private struct QiblaWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MoreEntry

    var body: some View {
        let payload = morePayload("noor_widget_qibla_v1", as: QiblaPayload.self)
        let direction = payload.map { qiblaDirection(lat: $0.lat, lng: $0.lng) }
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "location.north.fill")
                    .rotationEffect(.degrees(direction?.bearing ?? 0))
                    .opacity(direction == nil ? 0.4 : 1)
            }
            .atharAccessoryBackground()
            .widgetURL(moreURL("/qibla"))
        default:
            MoreCard {
                HStack(spacing: 12) {
                    ZStack {
                        Circle().stroke(Color.white.opacity(0.2), lineWidth: 2)
                        Text("ش").font(.caption2).foregroundColor(.white.opacity(0.6)).offset(y: -26)
                        Image(systemName: "location.north.fill")
                            .font(.system(size: 26))
                            .foregroundColor(moreGold)
                            .rotationEffect(.degrees(direction?.bearing ?? 0))
                    }
                    .frame(width: 64, height: 64)
                    .environment(\.layoutDirection, .leftToRight)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("القبلة").font(.headline).foregroundColor(moreGold)
                        if let direction {
                            Text("\(arabicDigits(Int(direction.bearing.rounded())))° نحو \(compassWord(direction.bearing))")
                                .font(.footnote).foregroundColor(.white)
                            Text("\(arabicDigits(Int(direction.km.rounded()))) كم إلى الكعبة")
                                .font(.caption2).foregroundColor(.white.opacity(0.7))
                        } else {
                            Text("استخدم موقعك في أثر لتظهر القبلة").font(.caption).foregroundColor(.white.opacity(0.8))
                        }
                    }
                }
            }
            .widgetURL(moreURL("/qibla"))
        }
    }
}

struct AtharQiblaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharQiblaWidget", provider: MoreProvider()) { entry in
            QiblaWidgetView(entry: entry)
        }
        .configurationDisplayName("القبلة")
        .description("اتجاه القبلة من الشمال والمسافة إلى الكعبة")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}
