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
 *       live: true for the Quran radio stations: only the station playing is
 *       loaded (a live stream has no end to buffer towards), and the lock
 *       screen shows a live broadcast; next and previous change station
 *   pause() / resume() / stop() / next() / previous()
 *   setRate({ rate }) / setVolume({ volume })
 *   position()  resolves { index, positionMs, durationMs, playing } for the
 *       listening section's progress bar and the verses that follow the reciter
 *   seek({ positionMs, index? })  jump within the current track (or to another)
 *   items may carry "album"; play may carry "startPositionMs" (resume where you left off)
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
        CAPPluginMethod(name: "position", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "downloadedBytes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearDownloads", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "savedCount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "savedUrls", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readDownloaded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeDownloads", returnType: CAPPluginReturnPromise),
    ]

    private struct Verse {
        let id: String
        let url: URL
        let title: String
        let artist: String
        let album: String?
    }

    private enum Repeat: String {
        case none, one, all
    }

    private let player = AVQueuePlayer()
    private var verses: [Verse] = []
    private var repeatMode: Repeat = .none
    private var live = false
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
        if !live, let following = nextIndex(after: index) {
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
        if !live, player.items().count < 2, let following = nextIndex(after: index) {
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
            MPMediaItemPropertyAlbumTitle: verse.album ?? (live ? "إذاعة القرآن الكريم · أثر" : "القرآن الكريم · أثر"),
            MPNowPlayingInfoPropertyIsLiveStream: live,
            MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? Double(rate) : 0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: Double(rate),
        ]
        if let artwork { info[MPMediaItemPropertyArtwork] = artwork }
        if !live, let item = player.currentItem {
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
        // Scrubbing on the lock screen, for long tracks (a whole surah, a night prayer).
        commands.changePlaybackPositionCommand.isEnabled = !live
        let scrub = commands.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self, let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self.player.seek(to: CMTime(seconds: event.positionTime, preferredTimescale: 1000)) { _ in self.updateNowPlaying() }
            return .success
        }
        remoteTargets.append((commands.changePlaybackPositionCommand, scrub))
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
                artist: entry["artist"] as? String ?? "",
                album: entry["album"] as? String
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
        let live = call.getBool("live") ?? false
        let startPositionMs = max(0, call.getDouble("startPositionMs") ?? 0)

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
            self.live = live
            self.rate = max(0.5, min(2, requestedRate.isFinite ? requestedRate : 1))
            self.player.defaultRate = self.rate
            self.player.volume = max(0, min(1, volume.isFinite ? volume : 1))
            self.active = true
            self.addRemoteCommands()
            self.loadQueue(at: start)
            if startPositionMs > 0 {
                self.player.seek(to: CMTime(seconds: startPositionMs / 1000, preferredTimescale: 1000))
            }
            self.player.playImmediately(atRate: self.rate)
            call.resolve()
        }
    }

    /// Where the player is: the listening section's progress bar polls this while it is open.
    @objc func position(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.active, let item = self.player.currentItem else {
                call.resolve(["index": -1, "positionMs": 0, "durationMs": 0, "playing": false])
                return
            }
            let elapsed = item.currentTime().seconds
            let duration = item.duration.seconds
            call.resolve([
                "index": self.currentIndex,
                "positionMs": elapsed.isFinite ? Int(elapsed * 1000) : 0,
                "durationMs": duration.isFinite ? Int(duration * 1000) : 0,
                "playing": self.player.timeControlStatus == .playing,
            ])
        }
    }

    @objc func seek(_ call: CAPPluginCall) {
        let positionMs = max(0, call.getDouble("positionMs") ?? 0)
        let index = call.getInt("index")
        DispatchQueue.main.async {
            guard self.active else {
                call.resolve()
                return
            }
            if let index, index != self.currentIndex, self.verses.indices.contains(index) {
                self.loadQueue(at: index)
                self.player.playImmediately(atRate: self.rate)
            }
            self.player.seek(to: CMTime(seconds: positionMs / 1000, preferredTimescale: 1000)) { _ in
                self.updateNowPlaying()
            }
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

    /// Calls waiting for their batch, while the app is open.
    private var waitingDownloads: [String: CAPPluginCall] = [:]

    /// Saves verses in a background download session (RecitationBackgroundDownloads):
    /// the download carries on after the app is left, and resolves here if it is still open.
    @objc func download(_ call: CAPPluginCall) {
        let urls = (call.getArray("urls", String.self) ?? []).compactMap { URL(string: $0) }
        let maxBytes = Int64(call.getDouble("maxBytes") ?? Double(1024 * 1024 * 1024))
        let title = call.getString("title") ?? ""
        let requested = call.getString("kind") ?? ""
        let kind = requested == "tafsir" || requested == "listen" ? requested : "audio"
        let maxFileBytes = Int64(max(0, call.getDouble("maxFileBytes") ?? 0))
        DispatchQueue.main.async {
            let downloads = RecitationBackgroundDownloads.shared
            downloads.onProgress = { [weak self] batch, done, total in
                guard let self, self.waitingDownloads[batch] != nil else { return }
                self.notifyListeners("downloadProgress", data: ["done": done, "total": total])
            }
            downloads.onFinished = { [weak self] batch, result in
                guard let self, let waiting = self.waitingDownloads.removeValue(forKey: batch) else { return }
                waiting.resolve(["saved": result.saved, "failed": result.failed, "evicted": result.evicted])
            }
            // Waiting before the batch starts, in case it is already complete.
            downloads.start(urls: urls, maxBytes: max(1, maxBytes), title: title, kind: kind, maxFileBytes: maxFileBytes) { batch in
                self.waitingDownloads[batch] = call
            }
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

    /// How many of `urls` are saved on the phone.
    @objc func savedCount(_ call: CAPPluginCall) {
        let urls = (call.getArray("urls", String.self) ?? []).compactMap { URL(string: $0) }
        DispatchQueue.global(qos: .utility).async {
            call.resolve(["count": urls.filter { RecitationFiles.existing(for: $0) != nil }.count])
        }
    }

    /// Which of `urls` are saved on the phone.
    @objc func savedUrls(_ call: CAPPluginCall) {
        let urls = call.getArray("urls", String.self) ?? []
        DispatchQueue.global(qos: .userInitiated).async {
            let saved = urls.filter { text in
                guard let url = URL(string: text) else { return false }
                return RecitationFiles.existing(for: url) != nil
            }
            call.resolve(["saved": saved])
        }
    }

    /// The saved copy of a text file (a tafsir surah), or nothing.
    @objc func readDownloaded(_ call: CAPPluginCall) {
        guard let url = URL(string: call.getString("url") ?? "") else {
            call.resolve([:])
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            if let text = RecitationFiles.readText(for: url) {
                call.resolve(["text": text])
            } else {
                call.resolve([:])
            }
        }
    }

    @objc func removeDownloads(_ call: CAPPluginCall) {
        let urls = (call.getArray("urls", String.self) ?? []).compactMap { URL(string: $0) }
        DispatchQueue.global(qos: .utility).async {
            var removed = 0
            for url in urls {
                if let file = RecitationFiles.existing(for: url), (try? FileManager.default.removeItem(at: file)) != nil {
                    removed += 1
                }
            }
            call.resolve(["removed": removed])
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

    /// Text saved for reading offline (tafsir surahs, as .json). Kept apart from
    /// the recitations so the audio budget never removes it and clearing the
    /// recitations leaves it in place.
    static var textRoot: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("OfflineText", isDirectory: true)
    }

    static func rootFor(_ url: URL) -> URL {
        url.pathExtension.lowercased() == "json" ? textRoot : root
    }

    /// Keep saved files out of iCloud backups; they can always be downloaded again.
    static func excludeFromBackup(_ folder: URL) {
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var excluded = folder
        try? excluded.setResourceValues(values)
    }

    /// The longest tafsir surah (al-Tabari on al-Baqarah) is about 7.4 MB.
    static let maxTextBytes: Int64 = 16 * 1024 * 1024

    static func maxBytes(for url: URL) -> Int64 {
        rootFor(url) == textRoot ? maxTextBytes : maxFileBytes
    }

    static func readText(for url: URL) -> String? {
        guard rootFor(url) == textRoot, let file = existing(for: url),
              let size = try? FileManager.default.attributesOfItem(atPath: file.path)[.size] as? Int64,
              size <= maxTextBytes,
              let data = try? Data(contentsOf: file) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Where a recitation URL is (or would be) saved; nil for anything but a plain https file URL.
    static func file(for url: URL) -> URL? {
        guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased(),
              let encodedPath = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedPath else { return nil }
        // Verses (everyayah) and tafsir surahs keep their last two segments, as
        // they always have. Whole surahs and other long recordings keep their
        // whole path: several reciters' folders end alike (".../r1/001.mp3"),
        // and one must never play for another. Segments stay percent-encoded,
        // so Arabic file names are safe.
        let all = encodedPath.split(separator: "/").map(String.init)
        let shortPath = rootFor(url) == textRoot || host == "everyayah.com" || host.hasSuffix(".everyayah.com")
        let segments = shortPath ? Array(all.suffix(2)) : all
        guard !segments.isEmpty, segments.count <= 10 else { return nil }
        var file = rootFor(url).appendingPathComponent(host, isDirectory: true)
        for segment in segments {
            guard segment != ".", segment != "..", segment.count <= 200,
                  segment.range(of: "^[A-Za-z0-9._%-]+$", options: .regularExpression) != nil else { return nil }
            file.appendPathComponent(segment)
        }
        return file
    }

    /// The most a batch may allow per file: a whole surah in high quality.
    static let maxLongFileBytes: Int64 = 600 * 1024 * 1024

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
            guard size > 0, size <= maxBytes(for: url) else { return false }
            try fileManager.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
            if fileManager.fileExists(atPath: target.path) { try fileManager.removeItem(at: target) }
            try fileManager.moveItem(at: temporary, to: target)
            excludeFromBackup(rootFor(url))
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
