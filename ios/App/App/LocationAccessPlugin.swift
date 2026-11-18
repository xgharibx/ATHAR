import Capacitor
import CoreLocation

/**
 * Whether the location permission is already granted, without asking for it
 * (src/lib/travelLocation.ts only checks for travel when it is).
 */
@objc(LocationAccessPlugin)
public class LocationAccessPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LocationAccessPlugin"
    public let jsName = "LocationAccess"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    @objc func status(_ call: CAPPluginCall) {
        let status = CLLocationManager().authorizationStatus
        call.resolve(["granted": status == .authorizedWhenInUse || status == .authorizedAlways])
    }
}
