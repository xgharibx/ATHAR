import AppIntents
import Foundation

/**
 * Siri, Shortcuts and Spotlight actions that open a part of Athar:
 * «سبّح في أثر», «أذكار الصباح في أثر», «اقرأ سورة الكهف في أثر»,
 * «تابع القرآن في أثر», «القبلة في أثر». Each opens the app on that screen.
 *
 * The English phrases are below; the Arabic ones are in
 * ar.lproj/AppShortcuts.strings.
 */
private enum OpenInApp {
    @MainActor
    static func route(_ route: String) {
        AppDelegate.deliverRoute(route)
    }
}

struct OpenSebhaIntent: AppIntent {
    static let title: LocalizedStringResource = "Tasbeeh"
    static let description: IntentDescription? = IntentDescription("Opens the tasbeeh counter.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        OpenInApp.route("/sebha")
        return .result()
    }
}

struct MorningAdhkarIntent: AppIntent {
    static let title: LocalizedStringResource = "Morning adhkar"
    static let description: IntentDescription? = IntentDescription("Opens the morning adhkar.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        OpenInApp.route("/c/morning")
        return .result()
    }
}

struct EveningAdhkarIntent: AppIntent {
    static let title: LocalizedStringResource = "Evening adhkar"
    static let description: IntentDescription? = IntentDescription("Opens the evening adhkar.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        OpenInApp.route("/c/evening")
        return .result()
    }
}

struct ContinueQuranIntent: AppIntent {
    static let title: LocalizedStringResource = "Continue the Quran"
    static let description: IntentDescription? = IntentDescription("Opens the Mushaf on the page you were reading.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        // The Mushaf without a page number opens the last page read.
        OpenInApp.route("/quran/page")
        return .result()
    }
}

struct QiblaIntent: AppIntent {
    static let title: LocalizedStringResource = "Qibla"
    static let description: IntentDescription? = IntentDescription("Opens the Qibla compass.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        OpenInApp.route("/qibla")
        return .result()
    }
}

/// A surah, for «اقرأ سورة الكهف في أثر».
struct SurahEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Surah"
    static let defaultQuery = SurahQuery()

    let id: Int
    let arabic: String
    let english: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(arabic)", subtitle: "\(english)")
    }

    static let all: [SurahEntity] = SurahNames.all.enumerated().map { index, names in
        SurahEntity(id: index + 1, arabic: names.arabic, english: names.english)
    }
}

struct SurahQuery: EntityStringQuery {
    func entities(for identifiers: [Int]) async throws -> [SurahEntity] {
        identifiers.compactMap { id in SurahEntity.all.first { $0.id == id } }
    }

    func entities(matching string: String) async throws -> [SurahEntity] {
        let wanted = Self.simplify(string)
        guard !wanted.isEmpty else { return SurahEntity.all }
        return SurahEntity.all.filter {
            Self.simplify($0.arabic).contains(wanted) || Self.simplify($0.english).contains(wanted)
        }
    }

    func suggestedEntities() async throws -> [SurahEntity] {
        SurahEntity.all
    }

    /// Spoken and written forms agree once hamza seats, ta marbuta and «سورة» are set aside.
    private static func simplify(_ text: String) -> String {
        var value = text.lowercased()
            .folding(options: [.diacriticInsensitive], locale: nil)
            .replacingOccurrences(of: "سورة", with: "")
            .replacingOccurrences(of: "surat", with: "")
            .replacingOccurrences(of: "surah", with: "")
        for (from, to) in [("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ة", "ه"), ("ى", "ي"), ("-", ""), ("'", ""), (" ", "")] {
            value = value.replacingOccurrences(of: from, with: to)
        }
        return value
    }
}

struct OpenSurahIntent: AppIntent {
    static let title: LocalizedStringResource = "Read a surah"
    static let description: IntentDescription? = IntentDescription("Opens a surah in the Mushaf.")
    static let openAppWhenRun = true

    @Parameter(title: "Surah")
    var surah: SurahEntity

    @MainActor
    func perform() async throws -> some IntentResult {
        OpenInApp.route("/quran/read/\(surah.id)")
        return .result()
    }
}

struct AtharShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: NextPrayerIntent(),
            phrases: [
                "When is the next prayer in \(.applicationName)",
                "Next prayer in \(.applicationName)",
                "\(.applicationName) next prayer",
            ]
        )
        AppShortcut(
            intent: OpenSurahIntent(),
            phrases: [
                "Read \(\.$surah) in \(.applicationName)",
                "Open \(\.$surah) in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: ContinueQuranIntent(),
            phrases: [
                "Continue the Quran in \(.applicationName)",
                "Continue reading in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: OpenSebhaIntent(),
            phrases: [
                "Start tasbeeh in \(.applicationName)",
                "Open the tasbeeh in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: MorningAdhkarIntent(),
            phrases: [
                "Morning adhkar in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: EveningAdhkarIntent(),
            phrases: [
                "Evening adhkar in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: QiblaIntent(),
            phrases: [
                "Find the Qibla in \(.applicationName)",
                "Qibla in \(.applicationName)",
            ]
        )
    }
}
