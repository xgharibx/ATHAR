import Capacitor
import UIKit
import WebKit

/**
 * The iPhone's own controls where the app used web ones:
 *
 *   setBackSwipe({ enabled })            edge swipe to go back (follows the
 *                                        layout direction: from the right in Arabic)
 *   copyText({ text })                   the system pasteboard
 *   pickDate({ value?, min?, max? })     the system calendar  → { value: "yyyy-MM-dd" }
 *   pickTime({ value? })                 the system time wheel → { value: "HH:mm" }
 *   setPullToRefresh({ enabled })        the system refresh spinner; fires "pullToRefresh"
 *   endPullToRefresh()
 *   vaultWrite({ key, value }) / vaultRemove({ key }) / vaultClear()
 *                                        a copy of the app's saved data in Application
 *                                        Support, which iOS does not clear the way it
 *                                        may clear a web view's storage
 *
 * A picker the person closes without choosing rejects with "cancelled".
 */
@objc(NativeUIPlugin)
public class NativeUIPlugin: CAPPlugin, CAPBridgedPlugin, UIAdaptivePresentationControllerDelegate {
    public let identifier = "NativeUIPlugin"
    public let jsName = "NativeUI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setBackSwipe", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickDate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickTime", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPullToRefresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endPullToRefresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultWrite", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultClear", returnType: CAPPluginReturnPromise),
    ]

    // MARK: Back swipe

    @objc func setBackSwipe(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? true
        DispatchQueue.main.async {
            self.bridge?.webView?.allowsBackForwardNavigationGestures = enabled
            call.resolve()
        }
    }

    // MARK: Copy

    @objc func copyText(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        DispatchQueue.main.async {
            UIPasteboard.general.string = text
            // iOS shows no confirmation of its own, so the app keeps its message.
            call.resolve(["systemConfirms": false])
        }
    }

    // MARK: Date and time pickers

    private var pickerCall: CAPPluginCall?

    private static let dayFormat: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let timeFormat: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "HH:mm"
        return f
    }()

    @objc func pickDate(_ call: CAPPluginCall) {
        let initial = call.getString("value").flatMap { Self.dayFormat.date(from: $0) } ?? Date()
        let minimum = call.getString("min").flatMap { Self.dayFormat.date(from: $0) }
        let maximum = call.getString("max").flatMap { Self.dayFormat.date(from: $0) }
        let clearable = call.getBool("clearable") ?? false
        DispatchQueue.main.async {
            self.presentPicker(call: call, mode: .date, initial: initial, minimum: minimum, maximum: maximum, clearable: clearable) { date in
                Self.dayFormat.string(from: date)
            }
        }
    }

    @objc func pickTime(_ call: CAPPluginCall) {
        var initial = Date()
        if let value = call.getString("value"), let parsed = Self.timeFormat.date(from: value) {
            let parts = Calendar.current.dateComponents([.hour, .minute], from: parsed)
            initial = Calendar.current.date(bySettingHour: parts.hour ?? 0, minute: parts.minute ?? 0, second: 0, of: Date()) ?? Date()
        }
        DispatchQueue.main.async {
            self.presentPicker(call: call, mode: .time, initial: initial, minimum: nil, maximum: nil, clearable: false) { date in
                Self.timeFormat.string(from: date)
            }
        }
    }

    private func presentPicker(
        call: CAPPluginCall,
        mode: UIDatePicker.Mode,
        initial: Date,
        minimum: Date?,
        maximum: Date?,
        clearable: Bool,
        format: @escaping (Date) -> String
    ) {
        guard let host = bridge?.viewController, pickerCall == nil else {
            call.reject("busy")
            return
        }
        pickerCall = call

        let sheet = DatePickerSheet(mode: mode, initial: initial, minimum: minimum, maximum: maximum, clearable: clearable)
        sheet.onDone = { [weak self] date in
            self?.finishPicker(value: format(date))
        }
        sheet.onCancel = { [weak self] in
            self?.finishPicker(value: nil)
        }
        sheet.onClear = { [weak self] in
            self?.finishPicker(value: "")
        }
        sheet.modalPresentationStyle = .pageSheet
        if let presentation = sheet.sheetPresentationController {
            let height: CGFloat = mode == .date ? 470 : 320
            presentation.detents = [.custom { _ in height }]
            presentation.prefersGrabberVisible = true
        }
        sheet.presentationController?.delegate = self
        (host.presentedViewController ?? host).present(sheet, animated: true)
    }

    private func finishPicker(value: String?) {
        guard let call = pickerCall else { return }
        pickerCall = nil
        if let value {
            call.resolve(["value": value])
        } else {
            call.reject("cancelled")
        }
    }

    /// Swiped down without choosing.
    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        finishPicker(value: nil)
    }

    // MARK: Pull to refresh

    private var refreshControl: UIRefreshControl?
    private var savedBounce: (Bool, Bool)?

    @objc func setPullToRefresh(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            guard let scrollView = self.bridge?.webView?.scrollView else {
                call.resolve()
                return
            }
            if enabled {
                if self.refreshControl == nil {
                    let control = UIRefreshControl()
                    control.addTarget(self, action: #selector(self.didPull), for: .valueChanged)
                    self.refreshControl = control
                }
                if self.savedBounce == nil {
                    self.savedBounce = (scrollView.bounces, scrollView.alwaysBounceVertical)
                }
                // Capacitor turns bouncing off; the spinner needs it while it is in use.
                scrollView.bounces = true
                scrollView.alwaysBounceVertical = true
                scrollView.refreshControl = self.refreshControl
            } else {
                self.refreshControl?.endRefreshing()
                if scrollView.refreshControl === self.refreshControl {
                    scrollView.refreshControl = nil
                }
                if let saved = self.savedBounce {
                    scrollView.bounces = saved.0
                    scrollView.alwaysBounceVertical = saved.1
                    self.savedBounce = nil
                }
            }
            call.resolve()
        }
    }

    @objc private func didPull() {
        notifyListeners("pullToRefresh", data: [:])
    }

    @objc func endPullToRefresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.refreshControl?.endRefreshing()
            call.resolve()
        }
    }

    // MARK: Saved-data copy

    @objc func vaultWrite(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        DispatchQueue.global(qos: .utility).async {
            do {
                try NativeVault.write(key: key, value: value)
                call.resolve()
            } catch {
                call.reject("write failed")
            }
        }
    }

    @objc func vaultRemove(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? ""
        DispatchQueue.global(qos: .utility).async {
            NativeVault.remove(key: key)
            call.resolve()
        }
    }

    @objc func vaultClear(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .utility).async {
            NativeVault.clear()
            call.resolve()
        }
    }
}

/// The copy of the web view's saved data: one file per key, written atomically.
enum NativeVault {
    private static var directory: URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        let dir = base.appendingPathComponent("athar-vault", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// Keys are turned into safe file names; the real key is stored with the value.
    private static func fileURL(for key: String) -> URL? {
        let safe = Data(key.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "+", with: "-")
        return directory?.appendingPathComponent(safe + ".json")
    }

    static func write(key: String, value: String) throws {
        guard let url = fileURL(for: key) else { return }
        let payload = try JSONSerialization.data(withJSONObject: ["k": key, "v": value])
        try payload.write(to: url, options: .atomic)
    }

    static func remove(key: String) {
        guard let url = fileURL(for: key) else { return }
        try? FileManager.default.removeItem(at: url)
    }

    static func clear() {
        guard let dir = directory else { return }
        try? FileManager.default.removeItem(at: dir)
    }

    /// Every saved key and value, for the page to restore what the web view lost.
    static func readAll() -> [String: String] {
        guard let dir = directory,
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
        else { return [:] }
        var out: [String: String] = [:]
        for file in files where file.pathExtension == "json" {
            guard let data = try? Data(contentsOf: file),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: String],
                  let k = obj["k"], let v = obj["v"]
            else { continue }
            out[k] = v
        }
        return out
    }

    /// A script that hands the copy to the page before any of its code runs.
    static func restoreScript() -> WKUserScript? {
        let all = readAll()
        guard !all.isEmpty,
              let data = try? JSONSerialization.data(withJSONObject: all),
              let json = String(data: data, encoding: .utf8)
        else { return nil }
        return WKUserScript(source: "window.__atharVault = \(json);", injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }
}

/// A sheet holding the system date or time picker, with «إلغاء» and «تم».
final class DatePickerSheet: UIViewController {
    var onDone: ((Date) -> Void)?
    var onCancel: (() -> Void)?
    var onClear: (() -> Void)?

    private let picker = UIDatePicker()
    private let mode: UIDatePicker.Mode
    private let clearable: Bool

    init(mode: UIDatePicker.Mode, initial: Date, minimum: Date?, maximum: Date?, clearable: Bool = false) {
        self.mode = mode
        self.clearable = clearable
        super.init(nibName: nil, bundle: nil)
        picker.datePickerMode = mode
        picker.preferredDatePickerStyle = mode == .date ? .inline : .wheels
        picker.calendar = Calendar(identifier: .gregorian)
        picker.minimumDate = minimum
        picker.maximumDate = maximum
        picker.date = initial
        if mode == .time { picker.minuteInterval = 1 }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let cancel = UIButton(type: .system)
        cancel.setTitle("إلغاء", for: .normal)
        cancel.titleLabel?.font = .preferredFont(forTextStyle: .body)
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        let done = UIButton(type: .system)
        done.setTitle("تم", for: .normal)
        done.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        done.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)

        var items: [UIView] = [cancel, UIView()]
        if clearable {
            let clear = UIButton(type: .system)
            clear.setTitle("مسح", for: .normal)
            clear.titleLabel?.font = .preferredFont(forTextStyle: .body)
            clear.addTarget(self, action: #selector(clearTapped), for: .touchUpInside)
            items.append(clear)
            items.append(UIView())
        }
        items.append(done)
        let bar = UIStackView(arrangedSubviews: items)
        bar.distribution = .equalCentering
        bar.axis = .horizontal
        bar.alignment = .center

        let stack = UIStackView(arrangedSubviews: [bar, picker])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
        ])
    }

    @objc private func clearTapped() {
        let handler = onClear
        onClear = nil
        onCancel = nil
        onDone = nil
        dismiss(animated: true) { handler?() }
    }

    @objc private func cancelTapped() {
        let handler = onCancel
        onCancel = nil
        onClear = nil
        onDone = nil
        dismiss(animated: true) { handler?() }
    }

    @objc private func doneTapped() {
        let handler = onDone
        let value = picker.date
        onCancel = nil
        onClear = nil
        onDone = nil
        dismiss(animated: true) { handler?(value) }
    }
}
