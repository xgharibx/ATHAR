//
//  PrayerActivityAttributes.swift
//  Shared by the App target (which starts the Live Activity) and the
//  AtharWidgets extension (which draws it on the Lock Screen and in the
//  Dynamic Island). Both targets compile this file, so the two always agree
//  on the data they exchange.
//

import ActivityKit
import Foundation

struct PrayerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Stable English key of the prayer ("Fajr", "Dhuhr", ...).
        var prayerKey: String
        /// Arabic name shown to the user.
        var prayerNameAr: String
        /// When the adhan is due.
        var prayerTime: Date
        /// When the countdown began, for the progress bar.
        var countdownStart: Date
        /// The prayer after this one, shown once this one has arrived.
        var followingNameAr: String?
        var followingTime: Date?
    }
}
