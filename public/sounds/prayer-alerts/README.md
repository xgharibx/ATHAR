# Adhan sounds

Each file here becomes a choice in Settings → تنبيهات الصلاة. Adding one is a
data change, not a code change:

1. Drop `<id>.mp3` in this folder (mono, ~128 kbps, ideally under ~1.5 MB —
   every file ships inside the APK and the IPA).
2. Add the id to `PrayerSoundProfile` in `src/store/noorStore.ts`.
3. Add an entry to `PRAYER_SOUND_OPTIONS` in `src/lib/reminders.ts`.
4. For iOS, add a `<id>.caf` to the Xcode target — `toIosSoundFile()` maps
   `.mp3` to `.caf`, and iOS silently falls back to the default notification
   sound if the file is missing.

Android creates one notification channel per sound id, so a new id gets its own
channel automatically. Channels are immutable once created: changing the audio
for an EXISTING id will not take effect on a device that already has it. Ship a
new id instead.

## Licensing — read before adding

These files are redistributed inside a published app, so each one needs a
licence that permits that. The well-known recordings (Makkah, Madinah, and the
famous reciters) are generally **not** openly licensed, and the copies of them
on archive.org are mostly uploads without rights — bundling one is a real
takedown risk.

Sources that are safe to draw from, licence stated per item:

- Freesound, filtered to CC0 — https://freesound.org/search/?q=adhan&f=license:%22Creative+Commons+0%22
- Creazilla public domain audio — https://creazilla.com/search/audio/azan
- Internet Archive — https://archive.org/details/adhan.recordings.from.doha.qatar
  (check the licence field on the individual item, not the collection)

Field recordings from these sources are genuine and free, but vary a lot in
quality; listen before shipping. For a specific well-known muezzin, the clean
route is a licensed recording rather than a re-upload.
