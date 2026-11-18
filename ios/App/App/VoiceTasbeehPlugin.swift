import AVFoundation
import Capacitor
import Speech

/**
 * Tasbeeh counted by voice with Apple's speech recognition
 * (src/lib/voiceTasbeeh.ts). The web view has no speech recognition, so the
 * app listens here and sends the growing transcript to the page, which counts
 * each repetition.
 *
 * Recognition runs on the iPhone itself when it supports Arabic on device;
 * otherwise Apple's service is used (the permission text says so). Apple
 * ends a recognition after about a minute or a long pause, so a new segment
 * starts straight away until the person stops.
 *
 *   available() → { available, onDevice }
 *   start({ locale, hints })    events: "transcript" { text, segment, final }, "state" { state }
 *   stop()
 */
@objc(VoiceTasbeehPlugin)
public class VoiceTasbeehPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VoiceTasbeehPlugin"
    public let jsName = "VoiceTasbeeh"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let engine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private let requestLock = NSLock()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var hints: [String] = []
    private var segment = 0
    private var listening = false
    private var recentFailures: [Date] = []

    @objc func available(_ call: CAPPluginCall) {
        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: call.getString("locale") ?? "ar-SA"))
        call.resolve([
            "available": recognizer?.isAvailable ?? false,
            "onDevice": recognizer?.supportsOnDeviceRecognition ?? false,
        ])
    }

    @objc func start(_ call: CAPPluginCall) {
        let locale = Locale(identifier: call.getString("locale") ?? "ar-SA")
        hints = (call.getArray("hints") as? [String]) ?? []
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                DispatchQueue.main.async { self.fail(call, state: "denied") }
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    guard granted else {
                        self.fail(call, state: "denied")
                        return
                    }
                    do {
                        try self.begin(locale: locale)
                        call.resolve()
                    } catch {
                        self.stopListening()
                        self.fail(call, state: "unavailable")
                    }
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopListening()
            call.resolve()
        }
    }

    private func fail(_ call: CAPPluginCall, state: String) {
        notifyListeners("state", data: ["state": state])
        call.reject(state)
    }

    private func begin(locale: Locale) throws {
        stopListening()
        guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable else {
            throw NSError(domain: "VoiceTasbeeh", code: 1)
        }
        self.recognizer = recognizer

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let input = engine.inputNode
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
            guard let self else { return }
            self.requestLock.lock()
            self.request?.append(buffer)
            self.requestLock.unlock()
        }
        engine.prepare()
        try engine.start()
        listening = true
        recentFailures = []
        startSegment()
    }

    private func startSegment() {
        guard listening, let recognizer else { return }
        segment += 1
        let current = segment
        let next = SFSpeechAudioBufferRecognitionRequest()
        next.shouldReportPartialResults = true
        next.contextualStrings = hints
        next.addsPunctuation = false
        if recognizer.supportsOnDeviceRecognition {
            next.requiresOnDeviceRecognition = true
        }
        requestLock.lock()
        request = next
        requestLock.unlock()

        task = recognizer.recognitionTask(with: next) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, self.listening, current == self.segment else { return }
                if let result {
                    self.notifyListeners("transcript", data: [
                        "text": result.bestTranscription.formattedString,
                        "segment": "ios-\(current)",
                        "final": result.isFinal,
                    ])
                    if result.isFinal {
                        self.nextSegment(failed: false)
                        return
                    }
                }
                if error != nil { self.nextSegment(failed: true) }
            }
        }
    }

    /// A segment ended (a pause, Apple's time limit, or an error): carry on,
    /// unless it keeps failing straight away.
    private func nextSegment(failed: Bool) {
        if failed {
            let now = Date()
            recentFailures = recentFailures.filter { now.timeIntervalSince($0) < 10 } + [now]
            if recentFailures.count > 5 {
                stopListening()
                notifyListeners("state", data: ["state": "error"])
                return
            }
        }
        requestLock.lock()
        request?.endAudio()
        request = nil
        requestLock.unlock()
        task?.cancel()
        task = nil
        startSegment()
    }

    private func stopListening() {
        let wasListening = listening
        listening = false
        task?.cancel()
        task = nil
        requestLock.lock()
        request?.endAudio()
        request = nil
        requestLock.unlock()
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        if wasListening {
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }

    deinit {
        stopListening()
    }
}
