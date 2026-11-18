import Capacitor
import CoreSpotlight
import UniformTypeIdentifiers

/**
 * Athar in iPhone search: typing «الكهف», «أذكار المساء» or «القبلة» in
 * Spotlight shows Athar's surahs, adhkar and sections, and opens the app on
 * them (src/lib/spotlight.ts sends the list; AppDelegate opens the result).
 *
 *   index({ version, items: [{ route, title, subtitle?, keywords }] })
 */
@objc(SpotlightPlugin)
public class SpotlightPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpotlightPlugin"
    public let jsName = "Spotlight"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "index", returnType: CAPPluginReturnPromise),
    ]

    static let domain = "athar"
    private static let versionKey = "athar_spotlight_version"

    @objc func index(_ call: CAPPluginCall) {
        let version = call.getString("version") ?? ""
        let items = (call.getArray("items") as? [[String: Any]]) ?? []
        // The same list is indexed once per version.
        if !version.isEmpty, UserDefaults.standard.string(forKey: Self.versionKey) == version {
            call.resolve(["indexed": 0])
            return
        }
        let searchable: [CSSearchableItem] = items.compactMap { item in
            guard let route = item["route"] as? String, AppDelegate.isSafeRoute(route),
                  let title = item["title"] as? String else { return nil }
            let attributes = CSSearchableItemAttributeSet(contentType: UTType.text)
            attributes.title = title
            attributes.contentDescription = item["subtitle"] as? String
            attributes.keywords = item["keywords"] as? [String]
            return CSSearchableItem(uniqueIdentifier: route, domainIdentifier: Self.domain, attributeSet: attributes)
        }
        let index = CSSearchableIndex.default()
        index.deleteSearchableItems(withDomainIdentifiers: [Self.domain]) { _ in
            index.indexSearchableItems(searchable) { error in
                if error == nil { UserDefaults.standard.set(version, forKey: Self.versionKey) }
                call.resolve(["indexed": error == nil ? searchable.count : 0])
            }
        }
    }
}
