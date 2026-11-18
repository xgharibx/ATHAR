import AppIntents
import Foundation

/**
 * Opens Athar on one screen. Used by the Control Center, Lock Screen and
 * Action button controls (AtharControls.swift). iOS runs a control's action
 * in the app when it opens the app, so this file is built into both the app
 * and the widget extension, and the app hands the screen to the web view
 * (AppDelegate sets `AtharScreenRouter.handler`).
 */
enum AtharScreenRouter {
    static var handler: ((String) -> Void)?
    static var pending: String?

    static func open(_ route: String) {
        if let handler {
            handler(route)
        } else {
            pending = route
        }
    }
}

struct OpenAtharScreenIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Athar"
    static let openAppWhenRun = true

    @Parameter(title: "Screen")
    var route: String

    init() {
        route = "/"
    }

    init(route: String) {
        self.route = route
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        AtharScreenRouter.open(route)
        return .result()
    }
}
