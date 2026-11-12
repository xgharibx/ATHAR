# Active App Store upload set

Fastlane reads the listing and screenshots from this release directory. Arabic (Saudi Arabia) is the sole active listing localization. English files are retained as an archive and are not uploaded. The active metadata also includes the app categories, copyright, and review contact/notes.

## Screenshots

- Eight iPhone 6.9-inch screenshots: `1320 × 2868` JPEG.
- Eight iPad 13-inch screenshots: `2064 × 2752` JPEG.
- Order: existing Athar logo/splash, home, morning adhkar, Quran, prayer times, tasbeeh, hadith, then Sadaqah Jariyah.
- The first image uses the existing Athar splash/logo asset. Screenshots 02–08 are captures of the running app in an Android 16 emulator, then sized for the corresponding App Store slots. No app screen content was generated or retouched; these are not captures from physical iPhone/iPad devices.
- System status indicators (time, battery, and notification icons) are hidden. Floating add-dhikr and quick-tasbeeh shortcuts are suppressed only in the morning-adhkar capture where they cover featured content; the app itself is unchanged.

Review these images before uploading. The metadata workflow uploads the listing text and screenshots only; it does not upload a build or submit the app for review.

## Checks required before App Review

- Core features and Ask Athar are available without sign-in. Optional cloud sync and account deletion require account access through an email magic link. App Review notes explain the no-sign-in path; check the iOS build for any unexpected account gate before submission. Do not commit credentials here.
- Screenshots 02–08 currently come from an Android 16 emulator and are resized for Apple’s device slots. Check them against the iOS TestFlight build before submission; replace any image that does not accurately represent the iOS app. The existing logo cover is intentionally first, as requested.
- App Review requires a working phone contact in App Store Connect. The phone number is intentionally entered manually and is not stored in this repository.


## Support URL

The bilingual support page is `https://www.athark.org/support.html`; it uses the confirmed support email and links to the privacy policy. The App Store metadata points to this page.
