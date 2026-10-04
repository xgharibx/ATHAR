# Adhan sound

`adhan_ahmad_al_nafees.mp3` is the user-supplied أحمد النفيس recording.
Its source information is recorded in `../ATTRIBUTION.md`.

The same MP3 is packaged in Android's `res/raw` directory. The sound profile
`adhan_ahmad_al_nafees` creates a new notification channel, because Android
notification channel sounds cannot be changed after creation. Follow-up
notifications use a separate silent channel.

The web app previews the full MP3. Native prayer notifications are scheduled
only on phones. A full Adhan cannot be used as an iOS custom notification sound:
iOS requires a compatible AIFF/WAV/CAF file shorter than 30 seconds in the app
bundle or `Library/Sounds`. This release does not bundle an iOS conversion.
