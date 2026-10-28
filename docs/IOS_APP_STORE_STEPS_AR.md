# رفع أثر على App Store — الخطوات بعد دفع الرسوم (بدون Mac)

كل شيء داخل المستودع جاهز: مشروع iOS بالإصدار نفسه (1.2.82 / 95)، وبناء macOS على GitHub Actions ينجح،
والتوقيع يتم تلقائيًا عبر مفتاح App Store Connect API (لا حاجة لشهادات ولا Xcode)، ونصوص المتجر ولقطات
الشاشة جاهزة في `ios/fastlane/`.

## أولًا: ما تحتاجه من حساب Apple (مرة واحدة)

1. **Team ID**: developer.apple.com/account ← Membership details ← «Team ID» (10 خانات).
2. **مفتاح API**: appstoreconnect.apple.com ← Users and Access ← Integrations ← App Store Connect API ←
   Team Keys ← «+» باسم `github` ودور **Admin** (الدور Admin ضروري ليُنشئ Xcode شهادة التوزيع سحابيًا).
   سيظهر **Issuer ID** أعلى الصفحة و**Key ID** بجوار المفتاح، ونزّل ملف `.p8` (يُنزَّل مرة واحدة فقط، احتفظ به).
3. **أنشئ التطبيق**: App Store Connect ← Apps ← «+» ← New App:
   - Platform: iOS — Name: `أثر — أذكار وقرآن وصلاة` — Primary language: Arabic
   - Bundle ID: `com.athar.adhkar` (إن لم يظهر في القائمة فسجّله من developer.apple.com ← Identifiers ← «+» ← App IDs)
   - SKU: `athar-ios` — User access: Full access

## ثانيًا: أسرار GitHub

المستودع ← Settings ← Secrets and variables ← Actions ← New repository secret، وأضف أربعة:

| الاسم | القيمة |
|---|---|
| `APPLE_TEAM_ID` | الـ Team ID |
| `APPSTORE_KEY_ID` | Key ID |
| `APPSTORE_ISSUER_ID` | Issuer ID |
| `APPSTORE_PRIVATE_KEY` | محتوى ملف `.p8` كاملًا (بما فيه سطور BEGIN/END) |

تأكد أن أسرار الإنتاج الأخرى موجودة أيضًا (وخاصةً `VITE_SUPABASE_ANON_KEY`)، وإلا بُني التطبيق بدون الحسابات
والمساعد الذكي. البناء يطبع تحذيرًا إن كان ناقصًا.

## ثالثًا: ابنِ وارفع

1. GitHub ← Actions ← **iOS Build** ← Run workflow ← فعّل **upload** ← Run.
2. بعد 15–30 دقيقة تظهر النسخة في App Store Connect ← TestFlight (حالة Processing ثم جاهزة).
3. GitHub ← Actions ← **iOS store listing** ← Run workflow؛ يرفع الوصف والكلمات المفتاحية ولقطات الشاشة
   (العربية والإنجليزية) إلى صفحة التطبيق. لا يرسل للمراجعة.

## رابعًا: ما يُملأ يدويًا في App Store Connect (لا يمكن أتمتته)

- **App Privacy** ← Get Started. التطبيق لا يتتبّع المستخدمين (Tracking: No). النوع المُجمَّع، ومطابق لملف
  `PrivacyInfo.xcprivacy`، ولكل بند الغرض **App Functionality**:

  | البند | مرتبط بالهوية؟ | من أين |
  |---|---|---|
  | Precise Location | لا | مواقيت الصلاة (Aladhan) والمساجد القريبة (Overpass) |
  | Email Address | نعم | تسجيل الدخول الاختياري (Supabase) |
  | User ID | نعم | الحساب والمزامنة |
  | Device ID | نعم | معرّف عشوائي للتثبيت (المزامنة والترتيب) |
  | Other User Content | لا | رسائل «اسأل أثر» والاسم المعروض في الترتيب |
  | Other Usage Data | نعم | عدادات النشاط في لوحة الترتيب |

- **Privacy Policy URL**: `https://www.athark.org/privacy.html` (مضبوط في ملفات المتجر أيضًا).
- **Age Rating**: أجب بـ «None» عن العنف والجنس والقمار وغيرها. للأسئلة الجديدة: يوجد مساعد ذكاء اصطناعي
  («اسأل أثر») وأسماء ظاهرة للآخرين في الترتيب؛ أجب بصدق، وقد ينتج 9+ أو 12+ وهذا مقبول.
- **Price**: Free. **Availability**: كل الدول (أو ما تختاره).
- **Export compliance**: مُعلنة في التطبيق (`ITSAppUsesNonExemptEncryption = false`)، ولن تُسأل.
- **App Review Information**: رقم هاتفك (إلزامي ولا أضعه عنك). الاسم والبريد والملاحظات مرفوعة من الملفات.
  لا حاجة لحساب تجريبي لأن الدخول اختياري وموضح في الملاحظات.
- **Content Rights**: لا يحتوي محتوى طرف ثالث يحتاج ترخيصًا خاصًا (القرآن والحديث نصوص عامة، والمصادر مذكورة).
- اختر النسخة (Build) المرفوعة ثم **Add for Review**.

## ما تغيّر في الكود من أجل iOS

- **تسجيل Google مخفي على iOS**: Apple (بند 4.8) تشترط «تسجيل الدخول بحساب Apple» مع أي تسجيل اجتماعي. على iOS
  يبقى الدخول بالبريد (رابط سحري) فقط وهو مستثنى. على Android والويب لم يتغير شيء.
- `UIRequiredDeviceCapabilities` صارت `arm64` (كانت `armv7`).
- `PrivacyInfo.xcprivacy` الآن يصرّح بالبيانات المجمّعة وبعدم التتبع.
- حذف الحساب داخل التطبيق موجود (الإعدادات ← الحساب والمزامنة ← حذف الحساب) وهو شرط لدى Apple.

## ما لم يمكن اختباره

لا يوجد Mac ولا iPhone: الاختبار الوحيد هو أن البناء على macOS ينجح، ولقطات الشاشة مأخوذة من الويب بمقاسات
iPhone وiPad. جرّب نسخة TestFlight على أي iPhone (حتى لدى صديق) قبل الإرسال للمراجعة: الإشعارات،
الموقع، المشاركة، وفتح الرابط السحري للدخول.
