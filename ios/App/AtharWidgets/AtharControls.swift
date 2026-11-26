//
//  AtharControls.swift
//  Controls (iOS 18 and later) for Control Center, the Lock Screen and the
//  Action button: one tap into the tasbeeh, the prayer times, the Mushaf or
//  the Qibla. Each opens the app through OpenAtharScreenIntent.
//

import AppIntents
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct AtharSebhaControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.athar.adhkar.control.sebha") {
            ControlWidgetButton(action: OpenAtharScreenIntent(route: "/sebha")) {
                Label("السبحة", systemImage: "circle.dotted")
            }
        }
        .displayName("السبحة")
        .description("افتح السبحة بلمسة")
    }
}

@available(iOS 18.0, *)
struct AtharPrayerControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.athar.adhkar.control.prayer") {
            ControlWidgetButton(action: OpenAtharScreenIntent(route: "/prayer-times")) {
                Label("مواقيت الصلاة", systemImage: "moon.stars")
            }
        }
        .displayName("مواقيت الصلاة")
        .description("افتح مواقيت الصلاة بلمسة")
    }
}

@available(iOS 18.0, *)
struct AtharMushafControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.athar.adhkar.control.mushaf") {
            ControlWidgetButton(action: OpenAtharScreenIntent(route: "/quran/page")) {
                Label("المصحف", systemImage: "book")
            }
        }
        .displayName("المصحف")
        .description("تابع القراءة من حيث توقفت")
    }
}

@available(iOS 18.0, *)
struct AtharQiblaControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.athar.adhkar.control.qibla") {
            ControlWidgetButton(action: OpenAtharScreenIntent(route: "/qibla")) {
                Label("القبلة", systemImage: "location.north.circle")
            }
        }
        .displayName("القبلة")
        .description("افتح بوصلة القبلة بلمسة")
    }
}
