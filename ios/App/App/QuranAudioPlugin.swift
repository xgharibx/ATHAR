import AVFoundation
import Capacitor
import MediaPlayer
import UIKit

/**
 * The Mushaf's native recitation player.
 *
 * The web player created a new audio element for every verse and only
 * started loading it when the previous verse ended, which left a pause between
 * verses and could stop the recitation once the phone was locked (iOS does
 * not let a web view start new audio from the background). Here an
 * AVQueuePlayer always holds the current verse and the next one, already
 * buffering, and the recitation continues with the screen locked.
 *
 *   play({ items: [{ id, url, title, artist }], startIndex, rate, volume, repeat })
 *       repeat: "none" | "one" (the current verse) | "all" (the whole list)
 *   pause() / resume() / stop() / next() / previous()
 *   setRate({ rate }) / setVolume({ volume })
 *   download({ urls, maxBytes })  saves verses for offline listening,
 *       reporting "downloadProgress" { done, total }; resolves { saved, failed, evicted }
 *   clearDownloads() / downloadedBytes()
 *
 * Events: "itemChange" { index, id }, "stateChange" { state }
 * (playing | paused | buffering | stopped), "ended", "error" { message, index }.
 * Verses saved offline play from the file; the rest stream.
 */
@objc(QuranAudioPlugin)
public class QuranAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QuranAudioPlugin"
    public let jsName = "QuranAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "downloadedBytes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearDownloads", returnType: CAPPluginReturnPromise),
    ]

    private struct Verse {
        let id: String
        let url: URL
        let title: String
        let artist: String
    }

    private enum Repeat: String {
        case none, one, all
    }

    private let player = AVQueuePlayer()
    private var verses: [Verse] = []
    private var repeatMode: Repeat = .none
    private var rate: Float = 1
    private var currentIndex = 0
    /// Which verse each queued player item plays.
    private var indexOf: [ObjectIdentifier: Int] = [:]
    private var observations: [NSKeyValueObservation] = []
    private var itemStatusObservation: NSKeyValueObservation?
    private var remoteTargets: [(MPRemoteCommand, Any)] = []
    private var lastState = "stopped"
    private var active = false
    private lazy var artwork: MPMediaItemArtwork? = {
        guard let path = Bundle.main.path(forResource: "icon-512", ofType: "png", inDirectory: "public/icons"),
              let image = UIImage(contentsOfFile: path) else { return nil }
        return MPMediaItemArtwork(boundsSize: image.size) { _ in image }
    }()

    override public func load() {
        player.actionAtItemEnd = .advance
        observations.append(player.observe(\.currentItem, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.currentItemChanged() }
        })
        observations.append(player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.emitState() }
        })
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(handleInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        center.addObserver(self, selector: #selector(handleFailure(_:)), name: AVPlayerItem.failedToPlayToEndTimeNotification, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: Queue

    private func nextIndex(after index: Int) -> Int? {
        switch repeatMode {
        case .one: return index
        case .all: return verses.isEmpty ? nil : (index + 1) % verses.count
        case .none: return index + 1 < verses.count ? index + 1 : nil
        }
    }

    private func playerItem(for index: Int) -> AVPlayerItem {
        let verse = verses[index]
        let source = RecitationFiles.existing(for: verse.url) ?? verse.url
        let item = AVPlayerItem(url: source)
        // Keeps the reciter's voice natural at faster or slower speeds.
        item.audioTimePitchAlgorithm = .timeDomain
        indexOf[ObjectIdentifier(item)] = index
        return item
    }

    /// Start playing verse `index`, with the following verse queued behind it.
    private func loadQueue(at index: Int) {
        player.removeAllItems()
        indexOf.removeAll()
        currentIndex = index
        player.insert(playerItem(for: index), after: nil)
        if let following = nextIndex(after: index) {
            player.insert(playerItem(for: following), after: player.items().last)
        }
    }

    private func currentItemChanged() {
        guard active else { return }
        guard let item = player.currentItem, let index = indexOf[ObjectIdentifier(item)] else {
            // The queue ran out: the recitation is complete.
            if player.items().isEmpty {
                finish(event: "ended")
            }
            return
        }
        currentIndex = index
        // Forget items that have already played.
        let queued = Set(player.items().map { ObjectIdentifier($0) })
        indexOf = indexOf.filter { queued.contains($0.key) }
        // Keep one verse buffering behind the current one.
        if player.items().count < 2, let following = nextIndex(after: index) {
            player.insert(playerItem(for: following), after: player.items().last)
        }
        observeStatus(of: item)
        notifyListeners("itemChange", data: ["index": index, "id": verses[index].id])
        updateNowPlaying()
    }

    private func observeStatus(of item: AVPlayerItem) {
        itemStatusObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                if item.status == .failed {
                    self.notifyListeners("error", data: [
                        "message": item.error?.localizedDescription ?? "playback failed",
                        "index": self.currentIndex,
                    ])
                } else if item.status == .readyToPlay {
                    self.updateNowPlaying()
                }
            }
        }
    }

    private func emitState() {
        let state: String
        if !active || player.currentItem == nil {
            state = "stopped"
        } else {
            switch player.timeControlStatus {
            case .playing: state = "playing"
            case .waitingToPlayAtSpecifiedRate: state = "buffering"
            default: state = "paused"
            }
        }
        updateNowPlaying()
        guard state != lastState else { return }
        lastState = state
        notifyListeners("stateChange", data: ["state": state])
    }

    private func finish(event: String?) {
        active = false
        player.pause()
        player.removeAllItems()
        indexOf.removeAll()
        itemStatusObservation = nil
        removeRemoteCommands()
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        if let event { notifyListeners(event, data: [:]) }
        emitState()
    }

    // MARK: Lock screen

    private func updateNowPlaying() {
        guard active, verses.indices.contains(currentIndex) else { return }
        let verse = verses[currentIndex]
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: verse.title,
            MPMediaItemPropertyArtist: verse.artist,
            MPMediaItemPropertyAlbumTitle: "القرآن الكريم · أثر",
            MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? Double(rate) : 0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: Double(rate),
        ]
        if let artwork { info[MPMediaItemPropertyArtwork] = artwork }
        if let item = player.currentItem {
            let duration = item.duration.seconds
            if duration.isFinite, duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
            let elapsed = item.currentTime().seconds
            if elapsed.isFinite { info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed }
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func addRemoteCommands() {
        removeRemoteCommands()
        let commands = MPRemoteCommandCenter.shared()
        func on(_ command: MPRemoteCommand, _ action: @escaping () -> Void) {
            command.isEnabled = true
            let target = command.addTarget { _ in
                action()
                return .success
            }
            remoteTargets.append((command, target))
        }
        on(commands.playCommand) { [weak self] in self?.player.play() }
        on(commands.pauseCommand) { [weak self] in self?.player.pause() }
        on(commands.togglePlayPauseCommand) { [weak self] in
            guard let self else { return }
            if self.player.timeControlStatus == .paused { self.player.play() } else { self.player.pause() }
        }
        on(commands.nextTrackCommand) { [weak self] in self?.skip(by: 1) }
        on(commands.previousTrackCommand) { [weak self] in self?.skip(by: -1) }
    }

    private func removeRemoteCommands() {
        for (command, target) in remoteTargets { command.removeTarget(target) }
        remoteTargets.removeAll()
    }

    private func skip(by step: Int) {
        guard active, !verses.isEmpty else { return }
        var target = currentIndex + step
        if repeatMode == .all {
            target = (target + verses.count) % verses.count
        }
        guard verses.indices.contains(target) else { return }
        loadQueue(at: target)
        player.playImmediately(atRate: rate)
    }

    // MARK: Interruptions

    @objc private func handleInterruption(_ notification: Notification) {
        guard active,
              let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .ended,
           let optionsRaw = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt,
           AVAudioSession.InterruptionOptions(rawValue: optionsRaw).contains(.shouldResume) {
            DispatchQueue.main.async { self.player.playImmediately(atRate: self.rate) }
        }
    }

    @objc private func handleFailure(_ notification: Notification) {
        guard active, let item = notification.object as? AVPlayerItem, indexOf[ObjectIdentifier(item)] != nil else { return }
        let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
        DispatchQueue.main.async {
            self.notifyListeners("error", data: [
                "message": error?.localizedDescription ?? "playback failed",
                "index": self.currentIndex,
            ])
        }
    }

    // MARK: Plugin methods

    @objc func play(_ call: CAPPluginCall) {
        guard let raw = call.getArray("items", JSObject.self), !raw.isEmpty else {
            call.reject("items are required")
            return
        }
        var parsed: [Verse] = []
        for entry in raw {
            guard let link = entry["url"] as? String, let url = URL(string: link) else { continue }
            parsed.append(Verse(
                id: entry["id"] as? String ?? link,
                url: url,
                title: entry["title"] as? String ?? "القرآن الكريم",
                artist: entry["artist"] as? String ?? ""
            ))
        }
        guard !parsed.isEmpty else {
            call.reject("items are required")
            return
        }
        let start = max(0, min(parsed.count - 1, call.getInt("startIndex") ?? 0))
        let requestedRate = Float(call.getDouble("rate") ?? 1)
        let volume = Float(call.getDouble("volume") ?? 1)
        let repeatMode = Repeat(rawValue: call.getString("repeat") ?? "none") ?? .none

        DispatchQueue.main.async {
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .spokenAudio)
                try session.setActive(true)
            } catch {
                call.reject("The audio session could not start", nil, error)
                return
            }
            self.verses = parsed
            self.repeatMode = repeatMode
            self.rate = max(0.5, min(2, requestedRate.isFinite ? requestedRate : 1))
            self.player.defaultRate = self.rate
            self.player.volume = max(0, min(1, volume.isFinite ? volume : 1))
            self.active = true
            self.addRemoteCommands()
            self.loadQueue(at: start)
            self.player.playImmediately(atRate: self.rate)
            call.resolve()
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.player.pause()
            call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.active else {
                call.resolve()
                return
            }
            try? AVAudioSession.sharedInstance().setActive(true)
            self.player.playImmediately(atRate: self.rate)
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.active { self.finish(event: nil) }
            call.resolve()
        }
    }

    @objc func next(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.skip(by: 1)
            call.resolve()
        }
    }

    @objc func previous(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.skip(by: -1)
            call.resolve()
        }
    }

    @objc func setRate(_ call: CAPPluginCall) {
        let requested = Float(call.getDouble("rate") ?? 1)
        DispatchQueue.main.async {
            self.rate = max(0.5, min(2, requested.isFinite ? requested : 1))
            self.player.defaultRate = self.rate
            if self.player.timeControlStatus != .paused { self.player.rate = self.rate }
            self.updateNowPlaying()
            call.resolve()
        }
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        let volume = Float(call.getDouble("volume") ?? 1)
        DispatchQueue.main.async {
            self.player.volume = max(0, min(1, volume.isFinite ? volume : 1))
            call.resolve()
        }
    }

    @objc func download(_ call: CAPPluginCall) {
        let urls = (call.getArray("urls", String.self) ?? []).compactMap { URL(string: $0) }
        let maxBytes = Int64(call.getDouble("maxBytes") ?? Double(1024 * 1024 * 1024))
        Task {
            var saved = 0
            var failed = 0
            var batch = Set<String>()
            for (offset, url) in urls.enumerated() {
                if await RecitationFiles.save(url) {
                    saved += 1
                    if let file = RecitationFiles.file(for: url) { batch.insert(file.path) }
                } else {
                    failed += 1
                }
                self.notifyListeners("downloadProgress", data: ["done": offset + 1, "total": urls.count])
            }
            let evicted = RecitationFiles.enforceBudget(maxBytes: max(1, maxBytes), keeping: batch)
            call.resolve(["saved": saved, "failed": failed, "evicted": evicted])
        }
    }

    @objc func downloadedBytes(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .utility).async {
            call.resolve(["bytes": RecitationFiles.totalBytes()])
        }
    }

    @objc func clearDownloads(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .utility).async {
            try? FileManager.default.removeItem(at: RecitationFiles.root)
            call.resolve()
        }
    }
}

/// Recitation files saved for listening offline, under Application Support
/// (kept out of iCloud backups; they can always be downloaded again).
enum RecitationFiles {
    static let maxFileBytes: Int64 = 8 * 1024 * 1024

    static var root: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("QuranAudio", isDirectory: true)
    }

    /// Where a recitation URL is (or would be) saved; nil for anything but a plain https file URL.
    static func file(for url: URL) -> URL? {
        guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased() else { return nil }
        let segments = url.pathComponents.filter { $0 != "/" }.suffix(2)
        guard !segments.isEmpty else { return nil }
        var file = root.appendingPathComponent(host, isDirectory: true)
        for segment in segments {
            guard segment != ".", segment != "..",
                  segment.range(of: "^[A-Za-z0-9._-]+$", options: .regularExpression) != nil else { return nil }
            file.appendPathComponent(segment)
        }
        return file
    }

    static func existing(for url: URL) -> URL? {
        guard let file = file(for: url),
              let size = try? FileManager.default.attributesOfItem(atPath: file.path)[.size] as? Int64,
              size > 0 else { return nil }
        return file
    }

    static func save(_ url: URL) async -> Bool {
        guard let target = file(for: url) else { return false }
        let fileManager = FileManager.default
        if existing(for: url) != nil {
            // Count it as recently wanted, so the budget keeps it.
            try? fileManager.setAttributes([.modificationDate: Date()], ofItemAtPath: target.path)
            return true
        }
        do {
            let (temporary, response) = try await URLSession.shared.download(from: url)
            defer { try? fileManager.removeItem(at: temporary) }
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return false }
            let size = (try? fileManager.attributesOfItem(atPath: temporary.path)[.size] as? Int64) ?? 0
            guard size > 0, size <= maxFileBytes else { return false }
            try fileManager.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
            if fileManager.fileExists(atPath: target.path) { try fileManager.removeItem(at: target) }
            try fileManager.moveItem(at: temporary, to: target)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var excluded = root
            try? excluded.setResourceValues(values)
            return true
        } catch {
            return false
        }
    }

    private static func allFiles() -> [(url: URL, size: Int64, modified: Date)] {
        guard let enumerator = FileManager.default.enumerator(
            at: root,
            includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey]
        ) else { return [] }
        var files: [(url: URL, size: Int64, modified: Date)] = []
        for case let url as URL in enumerator {
            guard let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey]),
                  values.isRegularFile == true else { continue }
            files.append((url: url, size: Int64(values.fileSize ?? 0), modified: values.contentModificationDate ?? .distantPast))
        }
        return files
    }

    static func totalBytes() -> Int64 {
        allFiles().reduce(0) { $0 + $1.size }
    }

    /// Remove the oldest saved verses (except `keeping`) until the total fits.
    static func enforceBudget(maxBytes: Int64, keeping: Set<String>) -> Int {
        var files = allFiles()
        var total = files.reduce(0) { $0 + $1.size }
        guard total > maxBytes else { return 0 }
        files.sort { $0.modified < $1.modified }
        var removed = 0
        for file in files where total > maxBytes && !keeping.contains(file.url.path) {
            if (try? FileManager.default.removeItem(at: file.url)) != nil {
                total -= file.size
                removed += 1
            }
        }
        return removed
    }
}
