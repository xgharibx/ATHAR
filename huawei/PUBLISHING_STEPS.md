# Publishing Athar on Huawei AppGallery — step by step

Your packages are in **`huawei/out/`** after you run the build (see Part 1).
Everything here is written for someone doing it for the first time.

> **Honest limits, up front**
> - I can build and verify the *package*. I cannot open your Huawei account, so
>   Part 3 is the AppGallery Connect flow **as I know it** — Huawei changes its
>   screens often, so if a button is named differently, follow the intent.
> - This package runs on **EMUI and HarmonyOS 2 – 4** (these run Android apps).
>   **HarmonyOS NEXT (5.0+) cannot run Android apps at all** — see Part 5.

---

## What was verified about the package

| Check | Result |
|---|---|
| Google Play Services / Firebase in the release build | **None** — checked the full dependency graph. The app works on phones without Google services. |
| Package id | `com.athar.adhkar` (same as Play) |
| Update prompt + notification | Point to **AppGallery**, not Play, in this build (verified on a device: reports `huawei`) |
| Share invite link | Uses the AppGallery link once you set the App ID (Part 4); the website until then |
| Sign-in with Google | Works — it runs in the phone's browser, not through Google Play Services |
| Notifications / alarms | Local only — no push service needed |

---

## Part 1 — Build the package (2 minutes)

From the project folder:

```bash
npm run release:huawei
```

That builds the web app, syncs it into the Android project, and produces:

```
huawei/out/athar-<version>-<build>-huawei-UNSIGNED.aab
huawei/out/athar-<version>-<build>-huawei-UNSIGNED.apk
huawei/out/BUILD_INFO.txt        (version, build number, SHA-256)
```

To build for **Google Play and Huawei together** (same source, one command):

```bash
npm run release:stores
```

### Signing (do this before you upload)

The build is **unsigned** unless you give it your keystore. I never see or store
your password — you set these in **your own** terminal, then build:

PowerShell:
```powershell
$env:ATHAR_KEYSTORE          = "C:\path\to\your-release.jks"
$env:ATHAR_KEYSTORE_PASSWORD = "..."
$env:ATHAR_KEY_ALIAS         = "your-alias"
$env:ATHAR_KEY_PASSWORD      = "..."      # optional; defaults to the store password
npm run release:huawei
```

Use the **same keystore you use for Google Play.** The file name then ends
`-huawei.aab` instead of `-huawei-UNSIGNED.aab`.

> Android Studio's *Generate Signed Bundle* **cannot** produce the Huawei
> package — it has no way to pass the store switch, so it would build a Play
> package. Use the command above.

---

## Part 2 — Create your Huawei developer account

1. Go to **developer.huawei.com** and register a **HUAWEI ID** (an email works).
2. Complete **identity verification** — choose **Individual** or **Enterprise**.
   Individual needs a government ID and takes anywhere from a day to about a
   week. **Start this first; everything else waits on it.**
3. Sign in to **AppGallery Connect** (`developer.huawei.com/consumer/en/service/josp/agc/index.html`).

---

## Part 3 — Create and submit the app

1. **My apps → Add app** (or *Add project* first, then *Add app*).
2. Fill in:
   - **Platform:** Android (APK / AAB)
   - **Package name:** `com.athar.adhkar` — exactly this, it cannot be changed later
   - **App name:** `أثر` (add the English name you prefer)
   - **Category:** Lifestyle or Books/Education, whichever AppGallery offers
   - **Default language:** Arabic
3. **App information**
   - **Description** — see "Listing text" below.
   - **Icon** — use `public/pwa-512x512.png` (resize if asked for 216×216).
   - **Screenshots** — at least three phone screenshots. Take them from a real
     phone or the emulator; don't use screenshots with the system bars if the
     console objects.
4. **Privacy** — Privacy policy URL: **`https://www.athark.org/privacy.html`**
   (already live). Complete the data/permissions declaration. The permissions
   the app uses, and why:
   - *Location* — prayer times, Qibla and nearby mosques; the app asks explicitly first, never silently
   - *Notifications* + *Exact alarms* — prayer and dhikr reminders
   - *Microphone* — voice counting in the Sebha, only when the user turns it on
   - *Internet* — Quran text/audio, leaderboard, sync
5. **Age rating** — answer the questionnaire; the app is religious/educational
   with no violence or purchases.
6. **Countries / regions → Distribute** — **do not select Mainland China**
   (see "Mainland China" below). Pick the markets you actually want: Gulf states,
   Egypt, Europe, etc.
7. **Software versions / Version information → Upload package**
   - Upload the **signed `.aab`** (or `.apk` if the console asks for APK).
   - AppGallery Connect may prompt you to enrol in **App Signing**. Accept it.
     You can let Huawei generate the signing key, or import your own; either is
     fine, but **keep your own keystore backed up** — it is what you sign
     uploads with.
8. **Submit for review.** Typical review is **1 – 3 days**, sometimes up to a week.
   The first review is the slowest. If it is rejected the console tells you
   why — send me the message and I'll fix it.

### Listing text (draft — edit freely)

**Short description (≤ 80 chars):**
`أذكار وقرآن ومواقيت صلاة وسبحة — رفيقك اليومي بدون إعلانات`

**Full description:**
```
أثر تطبيق إسلامي شامل يرافقك طوال اليوم:

• أذكار الصباح والمساء والنوم وبعد الصلاة، مع عدّاد لكل ذكر وتذكيرات
• المصحف الكامل مع التفسير والاستماع بأصوات عدد من القرّاء، ويعمل دون إنترنت
• مواقيت الصلاة بدقة حسب موقعك، واتجاه القبلة
• سبحة إلكترونية وأذكار سريعة وأذكار مخصّصة تضيفها بنفسك
• الأحاديث وشرحها، والأربعون النووية، وأسماء الله الحسنى
• مقاطع قصيرة ودروس علمية مختارة
• لوحة ترتيب اختيارية وتزامن بين أجهزتك عند تسجيل الدخول

بدون إعلانات، وبياناتك تبقى معك.
```

### Mainland China — read this before choosing regions

Distributing inside Mainland China needs an **ICP filing, a software copyright
registration, and (because of the AI companion feature) generative-AI
filings** — a long process that is separate from AppGallery itself. The app also
relies on YouTube (shorts) and Google/Supabase services that are restricted
there. Leave Mainland China **unticked**; you lose nothing in the other
regions Huawei sells in.

---

## Part 4 — After you get the App ID (one small follow-up release)

AppGallery gives your app an **App ID** (looks like `C115412345`) when you
create it. Putting it in the code makes the update prompt and the share links
point at your real AppGallery page:

1. Open `src/lib/storeIdentity.ts` and set
   `HUAWEI_APPGALLERY_APP_ID = "C115412345"` (your number).
2. `npm run version:bump` then `npm run release:huawei`, upload that build as the
   next version.

Until you do this nothing is broken — Huawei users are simply sent to
`www.athark.org` instead of the store page.

### Telling Huawei users an update exists

Google Play's version is read automatically. AppGallery has no public page to
read, so you set it yourself, **after AppGallery has approved and released** a
version: edit `package.json` → `"released": { "huawei": "1.2.80" }`, commit and
push. The site republishes `version.json` and Huawei users on older builds see
the update pill and notification. **Leave it `null` until the release is live** —
setting it early sends people to a store page that doesn't have the update yet.

---

## Part 5 — HarmonyOS NEXT (the part the APK cannot do)

- **EMUI / HarmonyOS 2–4**: runs this Android package. This is the large
  majority of Huawei phones outside China.
- **HarmonyOS NEXT (5.0 and newer)**: Huawei removed Android compatibility. An
  Android APK will not install and AppGallery will not offer it to those
  phones. Reaching them needs a native **HarmonyOS app (a `.hap`)**, built in
  Huawei's DevEco Studio with ArkTS.

The practical option when you want it: a small HarmonyOS app that hosts
`https://www.athark.org` in its web component — a thin shell around what you
already have. It would need DevEco Studio (which I can't run here), would not get
the same native alarms/widgets, and needs its own AppGallery listing. It is a
separate, smaller project; tell me when you want it and I'll scaffold it.

---

## Part 6 — Every future update (this is the "don't start over" part)

You change the app once. Then:

```bash
npm run version:bump        # moves package.json, Android and iOS together
npm run release:stores      # builds Play + Huawei packages from the same source
```

Then upload:

| Where | What |
|---|---|
| Google Play Console | `play/out/…-play.aab` |
| Huawei AppGallery Connect | `huawei/out/…-huawei.aab` |
| App Store (on a Mac) | `npx cap sync ios`, then Archive in Xcode — the version is already in step |

`npm run version:check` tells you if the three version files ever disagree. The
build refuses to run if they do.
