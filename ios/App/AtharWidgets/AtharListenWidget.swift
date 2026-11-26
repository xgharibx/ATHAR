//
//  AtharListenWidget.swift
//  «السماع» on the Home Screen, the Lock Screen and in Control Center.
//
//  What is playing and by whom, under a mihrab's arch; a bar and a clock that
//  move with the recitation on their own (WidgetKit counts from the time the
//  player wrote down, so the app is not woken for it); and the controls,
//  which play, pause and skip without opening the app (iOS 17 and later).
//  When Athar was closed, play picks the last recitation up where it stopped.
//
//  The player writes the snapshot (QuranAudioPlugin.publishWidget) and runs
//  the buttons (AtharListen in Shared/OpenAtharScreenIntent.swift). The
//  Android widget is NoorListenWidgetProvider.
//

import AppIntents
import SwiftUI
import WidgetKit

private let listenGold = Color(red: 1.0, green: 0.91, blue: 0.69)
private let listenAmber = Color(red: 0.88, green: 0.72, blue: 0.42)
private let listenInk = Color(red: 0.02, green: 0.14, blue: 0.10)
private let listenMint = Color(red: 0.49, green: 0.78, blue: 0.64)
private let listenURL = URL(string: "app.athar://open/listen")

private extension AtharListen.Snapshot {
    static let sample = AtharListen.Snapshot(
        state: "playing", title: "سورة الكهف", artist: "مشاري راشد العفاسي", album: nil, live: false,
        positionMs: 312_000, durationMs: 1_840_000, at: Date().timeIntervalSince1970, rate: 1,
        hasNext: true, hasPrevious: true
    )

    var timed: Bool { !live && durationMs > 1000 }
    private var speed: Double { rate > 0 ? rate : 1 }
    /// When the track would have started, at this speed, to be where it is now.
    var startDate: Date { Date(timeIntervalSince1970: at - positionMs / 1000 / speed) }
    var endDate: Date { startDate.addingTimeInterval(durationMs / 1000 / speed) }

    /// Still playing at `date`? (A track long past its end means the app stopped writing.)
    func isPlaying(at date: Date) -> Bool {
        playing && (!timed || date < endDate.addingTimeInterval(45))
    }

    func fraction(at date: Date) -> Double {
        guard timed else { return 0 }
        let elapsed = isPlaying(at: date) ? date.timeIntervalSince(startDate) * speed : positionMs / 1000
        return min(1, max(0, elapsed * 1000 / durationMs))
    }
}

private func clock(_ ms: Double) -> String {
    let total = max(0, Int(ms / 1000))
    let h = total / 3600, m = (total % 3600) / 60, s = total % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
}

struct ListenEntry: TimelineEntry {
    let date: Date
    let snapshot: AtharListen.Snapshot?
}

private struct ListenProvider: TimelineProvider {
    func placeholder(in context: Context) -> ListenEntry {
        ListenEntry(date: Date(), snapshot: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (ListenEntry) -> Void) {
        let saved = AtharListen.load()
        completion(ListenEntry(date: Date(), snapshot: context.isPreview && saved == nil ? .sample : saved))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ListenEntry>) -> Void) {
        let now = Date()
        let snapshot = AtharListen.load()
        // The player reloads the widget at every change; the one thing to catch
        // here is a player that went quiet mid-track, shown paused after its end.
        if let snapshot, snapshot.isPlaying(at: now), snapshot.timed {
            let after = snapshot.endDate.addingTimeInterval(50)
            completion(Timeline(entries: [ListenEntry(date: now, snapshot: snapshot), ListenEntry(date: after, snapshot: snapshot)], policy: .after(after)))
        } else {
            completion(Timeline(entries: [ListenEntry(date: now, snapshot: snapshot)], policy: .never))
        }
    }
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/// A mihrab's pointed arch: the frame the recitation sits in.
private struct MihrabArch: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let h = rect.height
        let shoulder = rect.minY + h * 0.38
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: shoulder))
        p.addQuadCurve(to: CGPoint(x: rect.midX, y: rect.minY), control: CGPoint(x: rect.minX, y: rect.minY + h * 0.08))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: shoulder), control: CGPoint(x: rect.maxX, y: rect.minY + h * 0.08))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        return p
    }
}

private struct ListenEmblem: View {
    let playing: Bool
    let live: Bool
    let size: CGFloat

    var body: some View {
        ZStack {
            MihrabArch()
                .fill(LinearGradient(colors: [listenGold.opacity(0.28), listenGold.opacity(0.06)], startPoint: .top, endPoint: .bottom))
            MihrabArch()
                .stroke(listenGold.opacity(0.65), lineWidth: 1.2)
            Image(systemName: live ? "dot.radiowaves.left.and.right" : playing ? "waveform" : "headphones")
                .font(.system(size: size * 0.38, weight: .semibold))
                .foregroundColor(listenGold)
                .offset(y: size * 0.1)
        }
        .frame(width: size * 0.82, height: size)
        .accessibilityHidden(true)
    }
}

private struct ListenStatus: View {
    let snapshot: AtharListen.Snapshot?
    let playing: Bool

    var body: some View {
        HStack(spacing: 5) {
            if playing {
                Circle().fill(listenMint).frame(width: 6, height: 6)
            }
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(playing ? listenMint : listenGold.opacity(0.85))
                .lineLimit(1)
        }
    }

    private var label: String {
        guard let snapshot, snapshot.resumable else { return "السماع" }
        if snapshot.live { return playing ? "بث مباشر" : "الإذاعة متوقفة" }
        return playing ? "يُتلى الآن" : "أكمل الاستماع"
    }
}

/// The bar, left to right like every player in the app; it runs by itself while playing.
private struct ListenBar: View {
    let snapshot: AtharListen.Snapshot
    let date: Date

    var body: some View {
        Group {
            if snapshot.isPlaying(at: date), snapshot.timed {
                ProgressView(timerInterval: snapshot.startDate...snapshot.endDate, countsDown: false) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
            } else {
                ProgressView(value: snapshot.fraction(at: date))
            }
        }
        .progressViewStyle(.linear)
        .tint(listenGold)
        .environment(\.layoutDirection, .leftToRight)
    }
}

private struct ListenTimes: View {
    let snapshot: AtharListen.Snapshot
    let date: Date

    var body: some View {
        HStack {
            Group {
                if snapshot.isPlaying(at: date), date < snapshot.endDate {
                    Text(snapshot.startDate, style: .timer)
                } else {
                    Text(clock(snapshot.fraction(at: date) * snapshot.durationMs))
                }
            }
            .frame(width: 52, alignment: .leading)
            Spacer(minLength: 0)
            Text(clock(snapshot.durationMs)).frame(width: 52, alignment: .trailing)
        }
        .font(.system(size: 10, weight: .medium).monospacedDigit())
        .foregroundColor(.white.opacity(0.6))
        .environment(\.layoutDirection, .leftToRight)
    }
}

private struct PlayDisc: View {
    let playing: Bool
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle().fill(LinearGradient(colors: [listenGold, listenAmber], startPoint: .topLeading, endPoint: .bottomTrailing))
            Circle().stroke(Color.white.opacity(0.35), lineWidth: 0.8)
            Image(systemName: playing ? "pause.fill" : "play.fill")
                .font(.system(size: size * 0.38, weight: .bold))
                .foregroundColor(listenInk)
                .offset(x: playing ? 0 : size * 0.04)
        }
        .frame(width: size, height: size)
        .shadow(color: listenGold.opacity(0.35), radius: 6)
    }
}

/// ⏮ ⏯ ⏭, left to right. Buttons run without opening the app on iOS 17;
/// on iOS 16 they are drawn and the widget opens «السماع».
private struct ListenTransport: View {
    let snapshot: AtharListen.Snapshot
    let playing: Bool
    let disc: CGFloat

    var body: some View {
        HStack(spacing: disc * 0.42) {
            control("previous", icon: "backward.fill", label: snapshot.live ? "المحطة السابقة" : "السابق", enabled: snapshot.hasPrevious)
            if #available(iOS 17.0, *) {
                Button(intent: ListenControlIntent(action: "toggle")) {
                    PlayDisc(playing: playing, size: disc)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(playing ? "إيقاف مؤقت" : "تشغيل")
            } else {
                PlayDisc(playing: playing, size: disc)
            }
            control("next", icon: "forward.fill", label: snapshot.live ? "المحطة التالية" : "التالي", enabled: snapshot.hasNext)
        }
        .environment(\.layoutDirection, .leftToRight)
    }

    @ViewBuilder
    private func control(_ action: String, icon: String, label: String, enabled: Bool) -> some View {
        let glyph = Image(systemName: icon)
            .font(.system(size: disc * 0.36, weight: .semibold))
            .foregroundColor(.white.opacity(enabled ? 0.92 : 0.3))
            .frame(width: disc * 0.8, height: disc * 0.8)
            .contentShape(Rectangle())
        if #available(iOS 17.0, *), enabled {
            Button(intent: ListenControlIntent(action: action)) { glyph }
                .buttonStyle(.plain)
                .accessibilityLabel(label)
        } else {
            glyph.accessibilityHidden(true)
        }
    }
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

private struct ListenIdle: View {
    let compact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 6 : 8) {
            HStack(alignment: .top) {
                ListenEmblem(playing: false, live: false, size: compact ? 40 : 46)
                Spacer(minLength: 0)
            }
            Spacer(minLength: 0)
            Text("السماع")
                .font(.system(size: compact ? 17 : 19, weight: .bold))
                .foregroundColor(.white)
            Text("القرآن كاملًا بأصوات كبار القرّاء")
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.65))
                .lineLimit(2)
            Text("ابدأ السماع")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(listenInk)
                .padding(.horizontal, 12)
                .padding(.vertical, 5)
                .background(Capsule().fill(listenGold))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct ListenSmall: View {
    let snapshot: AtharListen.Snapshot
    let date: Date

    var body: some View {
        let playing = snapshot.isPlaying(at: date)
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                ListenEmblem(playing: playing, live: snapshot.live, size: 34)
                Spacer(minLength: 4)
                if #available(iOS 17.0, *) {
                    Button(intent: ListenControlIntent(action: "toggle")) {
                        PlayDisc(playing: playing, size: 40)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(playing ? "إيقاف مؤقت" : "تشغيل")
                } else {
                    PlayDisc(playing: playing, size: 40)
                }
            }
            Spacer(minLength: 0)
            ListenStatus(snapshot: snapshot, playing: playing)
            Text(snapshot.title)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            Text(snapshot.artist)
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.65))
                .lineLimit(1)
            if snapshot.timed {
                ListenBar(snapshot: snapshot, date: date).padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct ListenMedium: View {
    let snapshot: AtharListen.Snapshot
    let date: Date

    var body: some View {
        let playing = snapshot.isPlaying(at: date)
        VStack(spacing: 8) {
            HStack(alignment: .center, spacing: 12) {
                ListenEmblem(playing: playing, live: snapshot.live, size: 50)
                VStack(alignment: .leading, spacing: 2) {
                    ListenStatus(snapshot: snapshot, playing: playing)
                    Text(snapshot.title)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(snapshot.artist)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.68))
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            Spacer(minLength: 0)
            if snapshot.timed {
                ListenBar(snapshot: snapshot, date: date)
            } else if snapshot.live {
                // A broadcast has no length: a fine rule in its place.
                Capsule().fill(listenGold.opacity(playing ? 0.55 : 0.2)).frame(height: 2)
            }
            ZStack {
                if snapshot.timed {
                    ListenTimes(snapshot: snapshot, date: date)
                }
                ListenTransport(snapshot: snapshot, playing: playing, disc: 40)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct ListenWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ListenEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            ListenRectangular(entry: entry).widgetURL(listenURL)
        case .accessoryCircular:
            ListenCircular(entry: entry).widgetURL(listenURL)
        default:
            Group {
                if let snapshot = entry.snapshot, snapshot.resumable {
                    if family == .systemSmall {
                        ListenSmall(snapshot: snapshot, date: entry.date)
                    } else {
                        ListenMedium(snapshot: snapshot, date: entry.date)
                    }
                } else {
                    ListenIdle(compact: family == .systemSmall)
                }
            }
            .padding(14)
            .background(alignment: .bottomLeading) {
                // A large arch, barely there, behind everything.
                MihrabArch()
                    .stroke(listenGold.opacity(0.07), lineWidth: 1.5)
                    .frame(width: 120, height: 150)
                    .offset(x: -26, y: 34)
            }
            .environment(\.layoutDirection, .rightToLeft)
            .atharWidgetBackground()
            .widgetURL(listenURL)
        }
    }
}

// ─── Lock Screen ─────────────────────────────────────────────────────────────

private struct ListenRectangular: View {
    let entry: ListenEntry

    var body: some View {
        Group {
            if let s = entry.snapshot, s.resumable {
                let playing = s.isPlaying(at: entry.date)
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Image(systemName: playing ? "waveform" : "headphones").font(.system(size: 10, weight: .semibold))
                        Text(s.live ? (playing ? "بث مباشر" : "الإذاعة") : (playing ? "يُتلى الآن" : "السماع"))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    Text(s.title).font(.system(size: 14, weight: .bold)).lineLimit(1).widgetAccentable()
                    Text(s.artist).font(.system(size: 11)).lineLimit(1).opacity(0.8)
                    if s.timed {
                        ListenBar(snapshot: s, date: entry.date).tint(.primary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Label("السماع", systemImage: "headphones").font(.system(size: 13, weight: .bold))
                    Text("القرآن بأصوات كبار القرّاء").font(.system(size: 11)).opacity(0.8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .atharAccessoryBackground()
    }
}

private struct ListenCircular: View {
    let entry: ListenEntry

    var body: some View {
        let s = entry.snapshot
        let playing = s?.isPlaying(at: entry.date) ?? false
        let face = ZStack {
            if let s, s.timed, playing {
                ProgressView(timerInterval: s.startDate...s.endDate, countsDown: false) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .progressViewStyle(.circular)
            } else {
                ProgressView(value: s?.fraction(at: entry.date) ?? 0).progressViewStyle(.circular)
            }
            Image(systemName: s?.resumable == true ? (playing ? "pause.fill" : "play.fill") : "headphones")
                .font(.system(size: 16, weight: .bold))
                .widgetAccentable()
        }
        Group {
            if #available(iOS 17.0, *), s?.resumable == true {
                Button(intent: ListenControlIntent(action: "toggle")) { face }
                    .buttonStyle(.plain)
                    .accessibilityLabel(playing ? "إيقاف السماع مؤقتًا" : "تشغيل السماع")
            } else {
                face
            }
        }
        .atharAccessoryBackground()
    }
}

struct AtharListenWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: AtharListen.widgetKind, provider: ListenProvider()) { entry in
            ListenWidgetView(entry: entry)
        }
        .configurationDisplayName("السماع")
        .description("ما يُتلى الآن، وشريط يسير مع التلاوة، وتشغيل وإيقاف وتنقّل دون فتح التطبيق")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

// ─── Control Center (iOS 18) ─────────────────────────────────────────────────

@available(iOS 18.0, *)
private struct ListenControlValue: ControlValueProvider {
    var previewValue: Bool { false }

    func currentValue() async throws -> Bool {
        AtharListen.load()?.isPlaying(at: Date()) ?? false
    }
}

@available(iOS 18.0, *)
struct AtharListenControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: AtharListen.controlKind, provider: ListenControlValue()) { playing in
            ControlWidgetToggle("السماع", isOn: playing, action: ListenPlayingIntent()) { on in
                Label(on ? "يُتلى الآن" : "متوقف", systemImage: on ? "pause.fill" : "play.fill")
            }
            .tint(listenGold)
        }
        .displayName("السماع")
        .description("شغّل التلاوة الأخيرة أو أوقفها بلمسة")
    }
}
