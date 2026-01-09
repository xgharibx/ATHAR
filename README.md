# NŪR — Ultimate Adhkar PWA (React + Vite + TypeScript)

A high-end **Adhkar** web app with:
- **Beautiful glass UI**, smooth motion, and micro-interactions
- **Tasbeeh counter** (tap / press & hold), progress ring, and completion confetti
- **Favorites**, local progress tracking, and insights (streak)
- **Command Palette** (Ctrl/⌘ + K) for fast search and navigation
- **Offline-first PWA** (installable, works without internet)
- **3D Noor background** (Three.js / React Three Fiber)
- **Data packs**: import extra `JSON` packs and the app auto-merges them

> Data comes from: `public/data/adhkar.json` (from your GitHub repo).

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL.

## Build

```bash
npm run build
npm run preview
```

## Add your Adhkar data

Main dataset:
- `public/data/adhkar.json`

You can also import extra packs from:
- **Sources** page → “Import JSON pack”.

Supported JSON formats:
1) Full DB:
```json
{ "sections": [ { "id": "morning", "title": "...", "content": [ { "text": "...", "count": 1 } ] } ] }
```

2) Single section export (created by the app):
```json
{ "id": "evening", "title": "...", "items": [ { "text": "...", "count": 1 } ] }
```

---

## Android APK (Capacitor)

See: `tools/android/README.md`

---

## Notes / authenticity

Always verify text authenticity and sources before publishing. This project includes “Sources” + “Data pack import” features to help you maintain a clean and auditable dataset.

---

## License

Your choice — this repository is generated for you. If you include 3rd-party datasets, respect their licenses and attribution.
