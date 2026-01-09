# Android APK (Android Studio) — NŪR Adhkar

This project is a **PWA** (Progressive Web App). The easiest way to publish it as an Android APK is to wrap it with **Capacitor**.

## 1) Build the web app

```bash
npm install
npm run build
```

This creates the production build in `dist/`.

## 2) Add Capacitor (one time)

```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android
npx cap init "NUR Adhkar" "com.noor.adhkar" --web-dir=dist
```

## 3) Add Android platform

```bash
npx cap add android
```

## 4) Sync and open Android Studio

```bash
npx cap sync android
npx cap open android
```

## 5) Notes

- The app works offline thanks to the service worker (PWA).
- You can enable full screen / theme colors in `android/app/src/main/AndroidManifest.xml`.
- If you want background notifications, you can add Capacitor plugins.
