# Android APK (Android Studio) — ATHAR

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
npx cap init "Athar" "com.athar.adhkar" --web-dir=dist
```

## 3) Add Android platform

```bash
npm run android:add
```

## 4) Sync and open Android Studio

```bash
npm run android:sync
npm run android:open
```

أو نفّذ كل شيء دفعة واحدة:

```bash
npm run android
```

## 5) Notes

- The app works offline thanks to the service worker (PWA).
- إذا لم يكن مجلد `android/` موجودًا بعد، فهذه خطوة طبيعية: أنشئه أولاً عبر `npm run android:add`.
- بعد أي تعديل على الواجهة أو الأصول، شغّل `npm run build` ثم `npm run android:sync` قبل فتح Android Studio.
- راجع أيضًا ملف الإطلاق العام [RELEASE_CHECKLIST_AR.md](c:\Users\Amrab\Downloads\noor-adhkar\RELEASE_CHECKLIST_AR.md) قبل التجهيز النهائي.
