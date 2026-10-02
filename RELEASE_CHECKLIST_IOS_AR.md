# Checklist الإطلاق لـ iOS (App Store via Capacitor)

نفس فكرة Android تمامًا: كود الويب نفسه يُغلَّف داخل مشروع iOS أصلي (Xcode) عبر Capacitor.
مجلد `ios/` مُنشأ ومضبوط (المعرّف `com.athar.adhkar`، والإصدار الحالي في Xcode هو 1.2.62 / build 74،
الأيقونة، شاشة الإطلاق، أذونات Info.plist).

> ملاحظة مهمة: بناء ورفع تطبيق iOS يتطلب macOS + Xcode (شرط من Apple).
> لا تملك جهاز Mac؟ استخدم GitHub Actions — راجع قسم «البناء بدون Mac» بالأسفل.

## 0) المتطلبات (مرة واحدة)

- حساب [Apple Developer Program](https://developer.apple.com/programs/) (99$ سنويًا).
- على جهاز Mac: Xcode 15+ من App Store، و CocoaPods (`sudo gem install cocoapods`).
- أنشئ التطبيق في [App Store Connect](https://appstoreconnect.apple.com) بنفس المعرّف: `com.athar.adhkar`.

## 1) تحقق من التطبيق الويب أولاً

- `npm install`
- `npm run verify`

> لا تنتقل لخطوات iOS قبل نجاح التحقق الويب.

## 2) أنشئ منصة iOS مرة واحدة

إذا لم يكن مجلد `ios/` موجودًا:

```bash
npm run ios:add
```

## 3) حدّث ملفات الويب داخل المشروع المحمول

```bash
npm run build
npm run ios:sync
```

## 4) افتح Xcode (على Mac)

```bash
npm run ios:open
```

أو نفّذ المسار الكامل دفعة واحدة:

```bash
npm run ios
```

في Xcode → target «App» → تبويب **Signing & Capabilities**:

- فعّل «Automatically manage signing».
- اختر فريقك (Team).
- تأكد أن Bundle Identifier هو `com.athar.adhkar`.

## 5) فحوصات أساسية قبل الرفع

- افتح الشاشة الرئيسية وتأكد أن الشريط السفلي وزر التسبيح لا يتداخلان مع «النوتش» و «Home Indicator» (safe areas).
- اختبر صفحة القرآن على الجهاز: التمرير، البحث، الإشارات المرجعية، وضع الشاشة الكاملة.
- اختبر الإعدادات: النسخ الاحتياطي، الاستعادة، الثيمات.
- اختبر الإشعارات المحلية على جهاز فعلي (تذكيرات الأذكار + تنبيهات الصلاة).
- اختبر أوقات الصلاة والقبلة (سيطلب إذن الموقع أول مرة).
- تأكد من سلامة RTL والخط العربي.

## 6) خصوصيات iOS (مقابل Android)

- **الإشعارات**: لا توجد «قنوات» في iOS — التطبيق يتعامل مع ذلك تلقائيًا.
  الأصوات المخصّصة (أذان الحرم / صوت المطر) تعمل حاليًا بصوت النظام الافتراضي.
  لتفعيل الأصوات المخصصة لاحقًا: حوّل الملفات إلى صيغة `.caf` (أقل من 30 ثانية)
  بأسماء `adhan_haram.caf` و `rain_calm.caf` وأضفها إلى target «App» في Xcode.
- **ودجات الشاشة الرئيسية**: ودجات Android لا تُنقل تلقائيًا — تحتاج iOS إلى
  WidgetKit extension بلغة Swift (خطوة مستقبلية اختيارية). كود الويب يكتب البيانات
  اللازمة جاهزةً عبر Preferences إذا أُضيفت لاحقًا.
- **عدّاد السبحة الصوتي**: يعتمد على Web Speech API غير المتوفر داخل WKWebView —
  الميزة تتعطّل بهدوء دون أعطال (الأذونات مُصرَّح عنها في Info.plist احتياطًا).

## 7) رقم الإصدار

- قيم Xcode الحالية: **Marketing Version = 1.2.62** و **Build = 74**. تحقّق من
  `ios/App/App.xcodeproj/project.pbxproj` و`package.json` قبل كل إصدار؛ ليس مطلوبًا
  أن يتطابق رقم build في iOS دائمًا مع `versionCode` في Android.
- عند كل رفعة جديدة: زد رقم Build في iOS، وارفع `versionCode` في Android فوق
  آخر إصدار منشور على Google Play.

## 8) بناء ورفع للـ App Store

من Xcode:

- Product → **Archive**
- من نافذة Organizer → **Distribute App** → **App Store Connect** → Upload
- بعد معالجة الرفعة في App Store Connect: اختبر عبر TestFlight ثم أرسل للمراجعة.

## 9) البناء بدون Mac (GitHub Actions)

Workflow جاهز في `.github/workflows/ios-build.yml`:

- **تحقق فقط** (بدون توقيع): من تبويب Actions شغّل «iOS Build» يدويًا — يبني
  التطبيق على macOS للتأكد أن كل شيء سليم.
- **رفع إلى TestFlight**: فعّل خيار «upload» عند التشغيل بعد إضافة الأسرار التالية
  في Settings → Secrets and variables → Actions:
  - `APPLE_TEAM_ID` — معرّف الفريق من حساب المطور.
  - `IOS_DIST_CERT_P12` — شهادة Apple Distribution بصيغة base64.
  - `IOS_DIST_CERT_PASSWORD` — كلمة سر الشهادة.
  - `APPSTORE_KEY_ID` و `APPSTORE_ISSUER_ID` و `APPSTORE_PRIVATE_KEY` —
    مفتاح App Store Connect API (يُنشأ من Users and Access → Integrations).

## 10) قبل الإرسال النهائي للمراجعة

- صفحة التطبيق في App Store Connect: الوصف، الكلمات المفتاحية، لقطات الشاشة
  (iPhone 6.7" و 6.5" و iPad 12.9" إذا كان iPad مدعومًا).
- لا ترسل بيانات الخصوصية قبل مطابقتها مع السلوك الفعلي وممارسات الاحتفاظ لدى
  المزوّدين. الموقع الدقيق يُرسل إلى Aladhan لطلب مواقيت الصلاة عبر الإنترنت
  وإلى Overpass للبحث عن المساجد القريبة؛ وميزة Companion ترسل المحادثة والسياق
  عبر Supabase إلى MiniMax. راجع كذلك تسجيل الدخول والمزامنة وطلبات Dorar.
- صحّح سياسة الخصوصية ووصف التطبيق وإقرارات App Store وGoogle Play بعد التحقق من
  احتفاظ كل مزوّد بالبيانات واستخدامه لها. صفحة Google Play الحالية تقول إن الموقع
  لا يغادر الهاتف وتعلن عدم جمع البيانات أو مشاركتها، والسياسة المرتبطة تنفي جمع
  الموقع الدقيق واستخدام الذكاء الاصطناعي؛ هذه العبارات لا تطابق تدفقات التطبيق.
- جرّب نسخة TestFlight على جهاز فعلي واحد على الأقل قبل الإرسال.
