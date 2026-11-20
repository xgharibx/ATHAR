import Foundation
import UIKit
import UserNotifications

/**
 * Saves recitation verses for offline listening in a background download
 * session, so iOS keeps downloading a surah or a juz' after the person leaves
 * Athar or locks the phone, and wakes the app to file each verse
 * (RecitationFiles). When a batch ends while Athar is not on screen, a
 * notification says so.
 *
 * Each task carries its batch and verse address in `taskDescription`, and the
 * batch counts live in UserDefaults, so a batch survives the app being closed.
 */
final class RecitationBackgroundDownloads: NSObject, URLSessionDownloadDelegate {
    static let shared = RecitationBackgroundDownloads()
    static let identifier = "com.athar.adhkar.recitations"

    struct Result {
        let saved: Int
        let failed: Int
        let evicted: Int
    }

    /// Set by the app's player while it is open.
    var onProgress: ((String, Int, Int) -> Void)?
    var onFinished: ((String, Result) -> Void)?
    /// From application(_:handleEventsForBackgroundURLSession:completionHandler:).
    var backgroundCompletion: (() -> Void)?

    private let queue = DispatchQueue(label: "athar.recitation-downloads")
    private let batchesKey = "athar_recitation_batches_v1"

    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.background(withIdentifier: Self.identifier)
        configuration.sessionSendsLaunchEvents = true
        configuration.isDiscretionary = false
        configuration.allowsCellularAccess = true
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }()

    /// Reconnect to downloads iOS carried on while the app was closed.
    func reconnect() {
        _ = session
    }

    // MARK: Batches

    private func batches() -> [String: [String: Any]] {
        UserDefaults.standard.dictionary(forKey: batchesKey) as? [String: [String: Any]] ?? [:]
    }

    private func store(_ batches: [String: [String: Any]]) {
        UserDefaults.standard.set(batches, forKey: batchesKey)
    }

    /// Queue a batch; `registered` gets its id before anything can finish.
    func start(urls: [URL], maxBytes: Int64, title: String, kind: String = "audio", maxFileBytes: Int64 = 0, registered: (String) -> Void) {
        let batch = UUID().uuidString
        registered(batch)
        var pending: [URL] = []
        var saved = 0
        for url in urls {
            if RecitationFiles.existing(for: url) != nil {
                // Already saved: count it as recently wanted, so the budget keeps it.
                if let file = RecitationFiles.file(for: url) {
                    try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: file.path)
                }
                saved += 1
            } else if RecitationFiles.file(for: url) != nil {
                pending.append(url)
            }
        }
        let failedUpfront = urls.count - saved - pending.count
        queue.sync {
            var all = batches()
            all[batch] = [
                "total": urls.count,
                "done": saved + failedUpfront,
                "saved": saved,
                "failed": failedUpfront,
                "maxBytes": NSNumber(value: maxBytes),
                "title": title,
                "kind": kind,
                "maxFileBytes": NSNumber(value: maxFileBytes),
            ]
            store(all)
        }
        if pending.isEmpty {
            finishIfComplete(batch)
        } else {
            for url in pending {
                let task = session.downloadTask(with: url)
                task.taskDescription = batch + "\n" + url.absoluteString
                task.resume()
            }
        }
    }

    private func record(batch: String, saved: Bool) {
        var progress: (Int, Int)?
        queue.sync {
            var all = batches()
            guard var entry = all[batch] else { return }
            entry["done"] = (entry["done"] as? Int ?? 0) + 1
            if saved {
                entry["saved"] = (entry["saved"] as? Int ?? 0) + 1
            } else {
                entry["failed"] = (entry["failed"] as? Int ?? 0) + 1
            }
            all[batch] = entry
            store(all)
            progress = (entry["done"] as? Int ?? 0, entry["total"] as? Int ?? 0)
        }
        if let progress {
            DispatchQueue.main.async { self.onProgress?(batch, progress.0, progress.1) }
        }
        finishIfComplete(batch)
    }

    private func finishIfComplete(_ batch: String) {
        var finished: (Result, String, Int, String)?
        queue.sync {
            var all = batches()
            guard let entry = all[batch],
                  let done = entry["done"] as? Int, let total = entry["total"] as? Int, done >= total else { return }
            all.removeValue(forKey: batch)
            store(all)
            let maxBytes = (entry["maxBytes"] as? NSNumber)?.int64Value ?? Int64(1024 * 1024 * 1024)
            let evicted = RecitationFiles.enforceBudget(maxBytes: max(1, maxBytes), keeping: [])
            finished = (Result(saved: entry["saved"] as? Int ?? 0, failed: entry["failed"] as? Int ?? 0, evicted: evicted),
                        entry["title"] as? String ?? "", total, entry["kind"] as? String ?? "audio")
        }
        guard let finished else { return }
        let (result, title, total, kind) = finished
        DispatchQueue.main.async {
            self.onFinished?(batch, result)
            if UIApplication.shared.applicationState != .active, result.saved > 0 {
                Self.notifyDone(title: title, saved: result.saved, total: total, kind: kind)
            }
        }
    }

    private static func notifyDone(title: String, saved: Int, total: Int, kind: String) {
        let content = UNMutableNotificationContent()
        if kind == "listen" {
            content.title = title.isEmpty ? "اكتمل تنزيل التلاوة" : title
            content.body = saved == total
                ? (saved == 1 ? "حُفظت التلاوة للاستماع دون إنترنت" : "حُفظت \(saved) تلاوة للاستماع دون إنترنت")
                : "حُفظت \(saved) من \(total) تلاوة للاستماع دون إنترنت"
            content.userInfo = ["cap_extra": ["route": "/listen/downloads"]]
        } else if kind == "tafsir" {
            content.title = title.isEmpty ? "اكتمل تنزيل التفسير" : title
            content.body = saved == total
                ? "حُفظ التفسير للقراءة دون إنترنت"
                : "حُفظ تفسير \(saved) من \(total) سورة للقراءة دون إنترنت"
            content.userInfo = ["cap_extra": ["route": "/tafsir"]]
        } else {
            content.title = title.isEmpty ? "اكتمل تنزيل التلاوة" : title
            content.body = saved == total
                ? "حُفظت \(saved) آية للاستماع دون إنترنت"
                : "حُفظت \(saved) من \(total) آية للاستماع دون إنترنت"
            content.userInfo = ["cap_extra": ["route": "/mushaf"]]
        }
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "athar-downloads", content: content, trigger: nil))
    }

    private static func parts(_ task: URLSessionTask) -> (batch: String, url: URL)? {
        let pieces = (task.taskDescription ?? "").split(separator: "\n", maxSplits: 1).map(String.init)
        guard pieces.count == 2, let url = URL(string: pieces[1]) else { return nil }
        return (pieces[0], url)
    }

    // MARK: URLSessionDownloadDelegate

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let parts = Self.parts(downloadTask) else { return }
        let batch = parts.batch
        let url = parts.url
        var saved = false
        if let http = downloadTask.response as? HTTPURLResponse, http.statusCode == 200,
           let target = RecitationFiles.file(for: url) {
            let fileManager = FileManager.default
            let size = (try? fileManager.attributesOfItem(atPath: location.path)[.size] as? Int64) ?? 0
            var limit = RecitationFiles.maxBytes(for: url)
            queue.sync {
                if let allowed = (batches()[batch]?["maxFileBytes"] as? NSNumber)?.int64Value, allowed > 0 {
                    limit = min(allowed, RecitationFiles.maxLongFileBytes)
                }
            }
            if size > 0, size <= limit {
                do {
                    try fileManager.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                    if fileManager.fileExists(atPath: target.path) { try fileManager.removeItem(at: target) }
                    try fileManager.moveItem(at: location, to: target)
                    RecitationFiles.excludeFromBackup(RecitationFiles.rootFor(url))
                    saved = true
                } catch {
                    saved = false
                }
            }
        }
        // Mark it so didCompleteWithError does not count it twice.
        downloadTask.taskDescription = (downloadTask.taskDescription ?? "") + (saved ? "\nsaved" : "\nfailed")
        record(batch: batch, saved: saved)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        let description = task.taskDescription ?? ""
        // Already counted when its file arrived.
        if description.hasSuffix("\nsaved") || description.hasSuffix("\nfailed") { return }
        guard let parts = Self.parts(task) else { return }
        record(batch: parts.batch, saved: false)
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            self.backgroundCompletion?()
            self.backgroundCompletion = nil
        }
    }
}
