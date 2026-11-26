import AppIntents
import Foundation

/**
 * Opens Athar on one screen. Used by the Control Center, Lock Screen and
 * Action button controls (AtharControls.swift). iOS runs a control's action
 * in the app when it opens the app, so this file is built into both the app
 * and the widget extension, and the app hands the screen to the web view
 * (AppDelegate sets `AtharScreenRouter.handler`).
 */
enum AtharScreenRouter {
    static var handler: ((String) -> Void)?
    static var pending: String?

    static func open(_ route: String) {
        if let handler {
            handler(route)
        } else {
            pending = route
        }
    }
}

struct OpenAtharScreenIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Athar"
    static let openAppWhenRun = true

    @Parameter(title: "Screen")
    var route: String

    init() {
        route = "/"
    }

    init(route: String) {
        self.route = route
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        AtharScreenRouter.open(route)
        return .result()
    }
}

// MARK: «السماع» from the Home Screen, the Lock Screen and Control Center

/**
 * What the widgets show of «السماع», and how their buttons reach the player.
 *
 * QuranAudioPlugin writes a small snapshot (what is playing, by whom, where
 * in the track, and when that was read) to the App Group each time something
 * changes; the widgets draw from it, and a playing track's bar and clock move
 * by themselves (WidgetKit counts from the time in the snapshot), so nothing
 * has to wake the app to keep them true.
 *
 * The buttons are AudioPlaybackIntents: iOS runs them in the app's process,
 * starting it in the background if it was closed, and they hand their command
 * to the player (QuranAudioPlugin sets `handler`). When Athar was closed, the
 * player picks the last recitation up where it stopped, without opening the app.
 */
enum AtharListen {
    static let appGroup = "group.com.athar.adhkar"
    static let snapshotKey = "noor_widget_listen_v1"
    static let widgetKind = "AtharListenWidget"
    static let controlKind = "com.athar.adhkar.control.listen"

    struct Snapshot: Codable, Equatable {
        /// "playing", "paused" (or stopped where it can be resumed) or "idle".
        var state: String
        var title: String
        var artist: String
        var album: String?
        var live: Bool
        var positionMs: Double
        var durationMs: Double
        /// When positionMs was read (seconds since 1970).
        var at: Double
        var rate: Double
        var hasNext: Bool
        var hasPrevious: Bool

        var playing: Bool { state == "playing" }
        var resumable: Bool { state != "idle" }
    }

    static func load() -> Snapshot? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let json = defaults.string(forKey: snapshotKey),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }

    static func save(_ snapshot: Snapshot) {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = try? JSONEncoder().encode(snapshot),
              let json = String(data: data, encoding: .utf8) else { return }
        defaults.set(json, forKey: snapshotKey)
    }

    /// Set by the player in the app; nil in the widget extension.
    static var handler: ((String) -> Void)?
    /// A command that arrived before the player was ready.
    static var pending: (action: String, at: Date)?

    /// Give `action` (toggle, play, pause, next, previous) to the player,
    /// waiting a moment for it when iOS has only just started the app.
    @MainActor static func deliver(_ action: String) async {
        for _ in 0..<30 {
            if let handler {
                handler(action)
                return
            }
            try? await Task.sleep(nanoseconds: 100_000_000)
        }
        pending = (action, Date())
    }
}

@available(iOS 17.0, *)
struct ListenControlIntent: AudioPlaybackIntent {
    static let title: LocalizedStringResource = "السماع"
    static let isDiscoverable = false

    /// toggle, play, pause, next or previous.
    @Parameter(title: "Action")
    var action: String

    init() {
        action = "toggle"
    }

    init(action: String) {
        self.action = action
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        await AtharListen.deliver(action)
        return .result()
    }
}

/// The Control Center switch: on plays, off pauses.
@available(iOS 18.0, *)
struct ListenPlayingIntent: SetValueIntent, AudioPlaybackIntent {
    static let title: LocalizedStringResource = "تشغيل السماع"
    static let isDiscoverable = false

    @Parameter(title: "Playing")
    var value: Bool

    @MainActor
    func perform() async throws -> some IntentResult {
        await AtharListen.deliver(value ? "play" : "pause")
        return .result()
    }
}
