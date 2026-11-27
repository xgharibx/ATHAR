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
        let route = id.isEmpty ? "/hadith" : "/library/sharh?h=\(id)"
        switch family {
        case .accessoryRectangular:
            // Lock Screen: the day's hadith in two lines.
            VStack(alignment: .leading, spacing: 1) {
                Text("حديث اليوم").font(.caption2.weight(.semibold)).widgetAccentable()
                Text(payload?.hadeeth.isEmpty == false ? payload!.hadeeth : "افتح أثر ليظهر حديث اليوم")
                    .font(.caption)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .environment(\.layoutDirection, .rightToLeft)
            .atharAccessoryBackground()
            .widgetURL(moreURL(route))
        case .accessoryInline:
            Text(payload?.hadeeth.isEmpty == false ? "حديث اليوم: \(payload!.hadeeth)" : "حديث اليوم")
                .atharAccessoryBackground()
                .widgetURL(moreURL(route))
        default:
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
}

struct AtharSunnahWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharSunnahWidget", provider: MoreProvider()) { entry in
            SunnahWidgetView(entry: entry)
        }
        .configurationDisplayName("حديث اليوم")
        .description("حديث اليوم نفسه الذي في التطبيق، مع مصدره ودرجته، وعلى شاشة القفل")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
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

// ─── «القرآن الكريم»: today's memorisation (حفظك اليوم) ───────────────────────────

/// Written by src/quran2/native/widget.ts. `dues` holds each older page's next
/// revision (ms), so the far-review count is made on the day the widget draws.
private struct HifzPayload: Decodable {
    let memorised: Int
    let day: String?
    let newToday: Int?
    let newLater: Int?
    let near: Int?
    let nearLater: Int?
    let dues: [Double]?
    /// Each hadith card's due day (yyyy-MM-dd): the hadith side of «مراجعة اليوم».
    let hadithDues: [String]?
}

private struct HifzToday {
    let memorised: Int
    let fresh: Int
    let near: Int
    let far: Int
    /// Hadith cards due by this day.
    let hadith: Int
    var total: Int { fresh + near + far }
    var percent: Int { min(100, Int((Double(memorised) / 604.0 * 100).rounded())) }

    init(at date: Date) {
        let payload = morePayload("noor_widget_q2_hifz_v1", as: HifzPayload.self)
        memorised = max(0, payload?.memorised ?? 0)
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        let sameDay = payload?.day == formatter.string(from: date)
        fresh = max(0, sameDay ? (payload?.newToday ?? 0) : (payload?.newLater ?? 0))
        near = max(0, sameDay ? (payload?.near ?? 0) : (payload?.nearLater ?? payload?.near ?? 0))
        let calendar = Calendar.current
        let endOfDay = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: calendar.startOfDay(for: date)) ?? date
        let limit = endOfDay.timeIntervalSince1970 * 1000
        // The app revises at most twenty far pages a day.
        far = min(20, (payload?.dues ?? []).filter { $0 <= limit }.count)
        let todayKey = formatter.string(from: date)
        hadith = (payload?.hadithDues ?? []).filter { $0 <= todayKey }.count
    }
}

private struct HifzWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MoreEntry

    var body: some View {
        let today = HifzToday(at: entry.date)
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(today.percent), in: 0...100) {
                Text("حفظ")
            } currentValueLabel: {
                Text(today.memorised > 0 ? arabicDigits(today.total) : "–")
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .atharAccessoryBackground()
            .widgetURL(moreURL("/quran/hifz"))
        default:
            MoreCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("حفظك اليوم").font(.headline).foregroundColor(moreGold)
                    if today.memorised == 0 {
                        Text("ابدأ الحفظ من «القرآن الكريم»").font(.subheadline).foregroundColor(.white.opacity(0.8))
                    } else if today.total == 0 {
                        Text("✓ لا مراجعة اليوم").font(.title3.weight(.bold)).foregroundColor(moreMint)
                    } else {
                        Text("\(arabicDigits(today.total)) \(today.total == 1 ? "صفحة" : "صفحات")")
                            .font(.title3.weight(.bold)).foregroundColor(.white)
                        Text("جديد \(arabicDigits(today.fresh))، قريب \(arabicDigits(today.near))، بعيد \(arabicDigits(today.far))")
                            .font(.footnote).foregroundColor(.white.opacity(0.8))
                    }
                    if today.hadith > 0 {
                        Text("ومعها \(arabicDigits(today.hadith)) \(today.hadith == 1 ? "بطاقة حديث" : "بطاقات حديث")")
                            .font(.footnote).foregroundColor(moreMint)
                    }
                    if today.memorised > 0 {
                        ProgressView(value: Double(today.percent), total: 100).tint(moreMint)
                        Text("\(arabicDigits(today.memorised)) صفحة محفوظة، \(arabicDigits(today.percent))٪ من المصحف")
                            .font(.caption2).foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .widgetURL(moreURL(today.total > 0 ? "/quran/hifz/session" : "/quran/hifz"))
        }
    }
}

struct AtharHifzWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AtharHifzWidget", provider: MoreProvider()) { entry in
            HifzWidgetView(entry: entry)
        }
        .configurationDisplayName("حفظك اليوم")
        .description("صفحات جلسة الحفظ اليوم وما حفظته من القرآن")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}
