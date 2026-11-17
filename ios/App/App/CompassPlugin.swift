import Capacitor
import CoreLocation
import UIKit

/**
 * The Qibla compass's heading, straight from Core Location.
 *
 * The web view's compass events report magnetic north, which is off from true
 * north by the local magnetic declination (about 5° in Cairo, more than 10°
 * in much of North America). Core Location corrects for it: `trueHeading` is
 * measured from true north whenever the app has a location fix.
 *
 *   start()  begins updates; each one arrives as a "heading" event:
 *            { magneticHeading, trueHeading?, accuracy?, calibrationNeeded }
 *   stop()   ends them.
 *   setLocation() exists for the Android contract; iOS finds its own fix.
 *
 * Headings are measured from the top of the screen in its current rotation.
 */
@objc(CompassPlugin)
public class CompassPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "CompassPlugin"
    public let jsName = "Compass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLocation", returnType: CAPPluginReturnPromise),
    ]

    /// Beyond this many degrees of possible error the reading is not good
    /// enough to pray by, so iOS is allowed to show its calibration screen.
    private static let calibrationThreshold: CLLocationDirection = 25

    private var manager: CLLocationManager?
    private var running = false

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard CLLocationManager.headingAvailable() else {
                call.resolve(["available": false])
                return
            }
            let manager = self.manager ?? CLLocationManager()
            self.manager = manager
            manager.delegate = self
            manager.headingFilter = 0.5
            // True north only needs a rough position.
            manager.desiredAccuracy = kCLLocationAccuracyKilometer
            self.running = true
            self.syncHeadingOrientation(manager)
            switch manager.authorizationStatus {
            case .notDetermined:
                manager.requestWhenInUseAuthorization()
            case .authorizedWhenInUse, .authorizedAlways:
                manager.startUpdatingLocation()
            default:
                break
            }
            manager.startUpdatingHeading()
            call.resolve(["available": true])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopUpdates()
            call.resolve()
        }
    }

    @objc func setLocation(_ call: CAPPluginCall) {
        call.resolve()
    }

    private func stopUpdates() {
        running = false
        manager?.stopUpdatingHeading()
        manager?.stopUpdatingLocation()
    }

    /// Measure headings from the top of the screen as the user currently sees it.
    private func syncHeadingOrientation(_ manager: CLLocationManager) {
        let interface = bridge?.viewController?.view.window?.windowScene?.effectiveGeometry.interfaceOrientation ?? .portrait
        let orientation: CLDeviceOrientation
        switch interface {
        // Interface and device landscape orientations are mirror images.
        case .landscapeLeft: orientation = .landscapeRight
        case .landscapeRight: orientation = .landscapeLeft
        case .portraitUpsideDown: orientation = .portraitUpsideDown
        default: orientation = .portrait
        }
        if manager.headingOrientation != orientation {
            manager.headingOrientation = orientation
        }
    }

    // MARK: CLLocationManagerDelegate

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard running else { return }
        if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // Only needed so Core Location can report true north.
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Without a fix the magnetic heading still arrives; the web app corrects it.
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard running else { return }
        syncHeadingOrientation(manager)
        let accuracy = newHeading.headingAccuracy
        var data: [String: Any] = [
            "magneticHeading": newHeading.magneticHeading,
            "calibrationNeeded": accuracy < 0 || accuracy > Self.calibrationThreshold,
        ]
        if newHeading.trueHeading >= 0 {
            data["trueHeading"] = newHeading.trueHeading
        }
        if accuracy >= 0 {
            data["accuracy"] = accuracy
        }
        notifyListeners("heading", data: data)
    }

    public func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool {
        guard let heading = manager.heading else { return true }
        return heading.headingAccuracy < 0 || heading.headingAccuracy > Self.calibrationThreshold
    }
}
