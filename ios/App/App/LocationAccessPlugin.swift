import Capacitor
import CoreLocation

/**
 * The phone's location for prayer times, Qibla, nearby mosques and travel
 * checks (src/lib/deviceLocation.ts), straight from Core Location: one
 * system question, and approximate location understood.
 *
 *   status() → { granted }   never asks
 *   current({ precise, timeoutMs, maxAgeMs, onlyIfGranted })
 *       → { lat, lng, accuracy, approximate }
 *       rejects with code "denied", "unavailable" or "timeout"
 *
 * When the person allowed only an approximate location and a precise one is
 * wanted (the mosques near them), iOS is asked once for precise location for
 * this use, with the reason in NSLocationTemporaryUsageDescriptionDictionary.
 */
@objc(LocationAccessPlugin)
public class LocationAccessPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LocationAccessPlugin"
    public let jsName = "LocationAccess"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "current", returnType: CAPPluginReturnPromise),
    ]

    private var requests: [ObjectIdentifier: LocationRequest] = [:]

    @objc func status(_ call: CAPPluginCall) {
        let status = CLLocationManager().authorizationStatus
        call.resolve(["granted": status == .authorizedWhenInUse || status == .authorizedAlways])
    }

    @objc func current(_ call: CAPPluginCall) {
        let precise = call.getBool("precise") ?? false
        let timeout = max(1, (call.getDouble("timeoutMs") ?? 10_000) / 1000)
        let maxAge = max(0, (call.getDouble("maxAgeMs") ?? 0) / 1000)
        let onlyIfGranted = call.getBool("onlyIfGranted") ?? false
        DispatchQueue.main.async {
            let request = LocationRequest(precise: precise, timeout: timeout, maxAge: maxAge, onlyIfGranted: onlyIfGranted)
            let key = ObjectIdentifier(request)
            self.requests[key] = request
            request.start { result in
                self.requests[key] = nil
                switch result {
                case .success(let fix):
                    call.resolve(fix)
                case .failure(let reason):
                    call.reject(reason.rawValue, reason.rawValue)
                }
            }
        }
    }
}

private enum LocationFailure: String, Error {
    case denied, unavailable, timeout
}

/** One request for the current location, from asking permission to the fix. */
private final class LocationRequest: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private let precise: Bool
    private let timeout: TimeInterval
    private let maxAge: TimeInterval
    private let onlyIfGranted: Bool
    private var completion: ((Result<[String: Any], LocationFailure>) -> Void)?
    private var timer: Timer?
    private var locating = false
    private var askedForPrecise = false

    init(precise: Bool, timeout: TimeInterval, maxAge: TimeInterval, onlyIfGranted: Bool) {
        self.precise = precise
        self.timeout = timeout
        self.maxAge = maxAge
        self.onlyIfGranted = onlyIfGranted
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = precise ? kCLLocationAccuracyBest : kCLLocationAccuracyHundredMeters
    }

    func start(_ completion: @escaping (Result<[String: Any], LocationFailure>) -> Void) {
        self.completion = completion
        timer = Timer.scheduledTimer(withTimeInterval: timeout, repeats: false) { [weak self] _ in
            self?.timedOut()
        }
        proceed()
    }

    private func proceed() {
        guard completion != nil else { return }
        switch manager.authorizationStatus {
        case .notDetermined:
            if onlyIfGranted { finish(.failure(.denied)) } else { manager.requestWhenInUseAuthorization() }
        case .restricted, .denied:
            finish(.failure(.denied))
        default:
            if precise, manager.accuracyAuthorization == .reducedAccuracy, !askedForPrecise, !onlyIfGranted {
                askedForPrecise = true
                manager.requestTemporaryFullAccuracyAuthorization(withPurposeKey: "NearbyMosques") { [weak self] _ in
                    DispatchQueue.main.async { self?.locate() }
                }
                return
            }
            locate()
        }
    }

    private func locate() {
        guard completion != nil, !locating else { return }
        if let cached = manager.location, -cached.timestamp.timeIntervalSinceNow <= maxAge, maxAge > 0 {
            deliver(cached)
            return
        }
        locating = true
        manager.requestLocation()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard manager.authorizationStatus != .notDetermined else { return }
        proceed()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        deliver(location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let code = (error as? CLError)?.code
        if code == .locationUnknown { return } // Core Location keeps trying until the timeout.
        finish(.failure(code == .denied ? .denied : .unavailable))
    }

    private func deliver(_ location: CLLocation) {
        let accuracy = location.horizontalAccuracy
        finish(.success([
            "lat": location.coordinate.latitude,
            "lng": location.coordinate.longitude,
            "accuracy": accuracy >= 0 ? accuracy : NSNull(),
            "approximate": manager.accuracyAuthorization == .reducedAccuracy,
        ]))
    }

    private func timedOut() {
        // Better a recent-enough older fix than nothing.
        if let last = manager.location, -last.timestamp.timeIntervalSinceNow < 30 * 60 {
            deliver(last)
        } else {
            finish(.failure(.timeout))
        }
    }

    private func finish(_ result: Result<[String: Any], LocationFailure>) {
        guard let completion else { return }
        self.completion = nil
        timer?.invalidate()
        timer = nil
        manager.stopUpdatingLocation()
        manager.delegate = nil
        completion(result)
    }
}
