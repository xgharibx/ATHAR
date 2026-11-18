import Capacitor
import HealthKit

/**
 * Tasbeeh sessions as mindful minutes in Apple Health (src/lib/mindfulMinutes.ts).
 * Writes only: Athar never reads Health data.
 *
 *   available() → { available }
 *   requestAuthorization() → { granted }
 *   log({ start, end })   ISO dates
 */
@objc(MindfulHealthPlugin)
public class MindfulHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MindfulHealthPlugin"
    public let jsName = "MindfulHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    private let mindful = HKCategoryType(.mindfulSession)

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: [mindful], read: []) { [weak self] _, _ in
            guard let self else { return }
            call.resolve(["granted": self.store.authorizationStatus(for: self.mindful) == .sharingAuthorized])
        }
    }

    @objc func log(_ call: CAPPluginCall) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard HKHealthStore.isHealthDataAvailable(),
              store.authorizationStatus(for: mindful) == .sharingAuthorized,
              let startText = call.getString("start"), let endText = call.getString("end"),
              let start = formatter.date(from: startText), let end = formatter.date(from: endText),
              end > start else {
            call.resolve()
            return
        }
        let sample = HKCategorySample(type: mindful, value: HKCategoryValue.notApplicable.rawValue, start: start, end: end)
        store.save(sample) { _, _ in call.resolve() }
    }
}
