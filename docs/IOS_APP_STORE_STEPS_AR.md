# رفع أثر على App Store — الخطوات بعد دفع الرسوم (بدون Mac)

المصدر الحالي للإصدار 1.2.84 هو Android versionCode 97 وiOS build 97. النسخة المصدرية 1.2.84 تستخدم build 97. تحقق من أحدث نتائج سيرَي [iOS Build](https://github.com/xgharibx/ATHAR/actions/workflows/ios-build.yml) و[Android validation](https://github.com/xgharibx/ATHAR/actions/workflows/android-validate.yml) بعد كل دفع. فحص iOS الآن يرفض Xcode أو iOS SDK أقدم من 26.
هذا لا يعني أن تطبيق iOS وُقّع أو رُفع إلى TestFlight؛ خطوات التوقيع والأرشفة والرفع لم تعمل لغياب إعداد Apple.
راجع مجموعة الرفع النشطة في `ios/fastlane/release/` قبل تشغيل سير عمل iOS. المجموعة العربية فقط؛ ملفات الإنجليزية القديمة
مسودات غير مفعّلة لأن واجهة التطبيق ما زالت عربية.

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
   العربية من `ios/fastlane/release/` إلى صفحة التطبيق. لا يرسل للمراجعة.

## رابعًا: ما يُملأ يدويًا في App Store Connect (لا يمكن أتمتته)

- **App Privacy** ← Get Started. التطبيق لا يتتبّع المستخدمين (Tracking: No). النوع المُجمَّع، ومطابق لملف
  `PrivacyInfo.xcprivacy`، ولكل بند الغرض **App Functionality**:

  | البند | مرتبط بالهوية؟ | من أين |
  |---|---|---|
  | Precise Location | لا | مواقيت الصلاة (Aladhan) والمساجد القريبة (Overpass) |
  | Email Address | نعم | تسجيل الدخول الاختياري (Supabase) |
  | User ID | نعم | الحساب والمزامنة |
  | Device ID | نعم | معرّف عشوائي للتثبيت (المزامنة والترتيب) |
  | Sensitive Info (المعتقدات الدينية) | نعم | أنشطة الصلاة والأذكار والقرآن المرسلة تلقائيًا ضمن لوحة الترتيب |
  | Other User Content | نعم | الملاحظات والتظليل والتذكيرات والمحتوى المخصص المتزامن مع الحساب، واسم الترتيب |
  | Other Usage Data | نعم | عدادات النشاط في لوحة الترتيب |

  **الصوت:** ميزتا العد بالصوت والتسميع اختياريتان. على iOS قد يرسل نظام التعرف الصوت إلى Apple؛ لا يستقبل أثر التسجيل ولا يحفظه. توضح Apple أن البيانات التي تجمعها خدمات Apple نفسها لا تقع على المطور مسؤولية الإفصاح عنها في ملصق التطبيق. لا تضف «Audio Data» لمجرد استخدام خدمة Apple؛ أضفه إذا كان أثر أو مزود آخر يخزن الصوت أو يتيحه بعد مدة المعالجة الفورية. راجع تدفق البيانات الفعلي وسياسة المزود قبل اعتماد الإجابات. راجع [تفاصيل خصوصية App Store](https://developer.apple.com/app-store/app-privacy-details/) و[إذن التعرف على الكلام من Apple](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition).

- **Privacy Policy URL**: `https://www.athark.org/privacy.html`. **Support URL**: `https://www.athark.org/support.html` (صفحة ثنائية اللغة، ومضبوطة في ملفات App Store).
- **Age Rating**: أجب عن كل سؤال وفق المحتوى والميزات الفعلية، ومنها المساعد الذكي («اسأل أثر») والأسماء الظاهرة في لوحة الترتيب. لا تعتمد تصنيفًا عمريًا متوقعًا؛ App Store Connect يحسبه من إجاباتك.
- **Price**: Free. **Availability**: كل الدول (أو ما تختاره).
- **Export compliance**: مُعلنة في التطبيق (`ITSAppUsesNonExemptEncryption = false`)، ولن تُسأل.
- **App Review Information**: الاسم والبريد وملاحظات المراجعة مرفوعة من `ios/fastlane/release/metadata/review_information/`.
  رقم الهاتف مطلوب ويُدخل يدويًا في App Store Connect. الميزات الأساسية متاحة دون حساب، لكن المزامنة السحابية وحذف الحساب تتطلبان الدخول عبر رابط سحري بالبريد؛ جهّز واختبر مسار دخول يستطيع فريق المراجعة استخدامه، أو وضعًا تجريبيًا كاملًا، قبل الإرسال. لا تفترض أن المراجع يستطيع فتح بريد شخصي، ولا تضع بيانات الدخول في GitHub.
- **Content Rights**: راجع حقوق الاستخدام أو التراخيص لكل تلاوة وأذان وصوت وصورة وخط وفيديو ومصدر خارجي قبل الإجابة؛ لا تفترض أن المحتوى متاح بلا قيود لمجرد ظهوره داخل التطبيق.
- اختر النسخة (Build) المرفوعة ثم **Add for Review**.

## ما تغيّر في الكود من أجل iOS

- **تسجيل Google مخفي على iOS**: Apple (بند 4.8) تشترط «تسجيل الدخول بحساب Apple» مع أي تسجيل اجتماعي. على iOS
  يبقى الدخول بالبريد (رابط سحري) فقط وهو مستثنى. على Android والويب لم يتغير شيء.
- `UIRequiredDeviceCapabilities` صارت `arm64` (كانت `armv7`).
- `PrivacyInfo.xcprivacy` يصرّح بالبيانات المجمّعة وبعدم التتبع، بما فيها الأنشطة الدينية المرتبطة بمعرّف مستعار في لوحة الترتيب.
- حذف الحساب داخل التطبيق موجود (الإعدادات ← الحساب والمزامنة ← حذف الحساب) وهو شرط لدى Apple.
- قبل أول رسالة في «اسأل أثر» على iOS تظهر موافقة واضحة على إرسال الرسالة والسياق عبر أثر إلى MiniMax؛ ويمكن سحب الموافقة من الإعدادات.
- يوضح إذنا الميكروفون والتعرف على الكلام أن الصوت الاختياري قد يُرسل إلى Apple للنسخ الصوتي، كما تشرح سياسة الخصوصية ذلك.

## ما لم يمكن اختباره

لا يوجد Mac ولا iPhone: لقطات 02–08 مأخوذة من التطبيق على محاكي Android 16 ثم أُعيد تحجيمها لمقاسات
iPhone وiPad؛ الغلاف الأول يستخدم صورة الشعار الحالية. ليست لقطات من جهاز iPhone أو iPad فعلي، لذلك
اختبر نسخة TestFlight على iPhone قبل الإرسال للمراجعة: الإشعارات،
الموقع، المشاركة، وفتح الرابط السحري للدخول.
