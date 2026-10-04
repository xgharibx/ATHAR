# أثر — الإصدار 1.2.66

Android version code: **78**. Google Play's highest uploaded code was **74** when checked on 4 October 2026. This update targets Android 16 / API 36.

## نص «ما الجديد» لمتجر Google Play

```text
• واجهة أبسط وأنظف مع إزالة النصوص التوضيحية الزائدة عند البداية وداخل الصفحات.
• أذان بصوت أحمد النفيس، وصوت طيور جديد للتذكيرات.
• تنبيه مسموع أولًا، ثم متابعة وتأجيل صامتان لتقليل الإزعاج.
• تحسين التعامل مع التذكيرات والصلاحيات والموقع.
• تحسين التحقق من مراجع إجابات «اسأل أثر».
• سياسة خصوصية واضحة ومتاحة من الإعدادات والموقع.
• إصلاحات لتحسين الثبات وسهولة الاستخدام.
```

## قبل وبعد

| الميزة | قبل | بعد |
|---|---|---|
| بداية التطبيق | رسالة تجهيز البيانات | بداية هادئة بلا الرسالة |
| نصوص الصفحات | شروح طويلة عن الخدمات والتخزين | صفحات أبسط؛ التفاصيل في سياسة الخصوصية |
| الأذان | التسجيل القديم | أحمد النفيس |
| صوت التذكيرات | التسجيل القديم | أصوات الطيور |
| التنبيهات المتتابعة | قد يتكرر الصوت عند التأجيل | صوت للتنبيه الأول؛ المتابعة والتأجيل صامتان |
| الخصوصية | سياسة قديمة خارج الموقع | سياسة عربية وإنجليزية على موقع أثر، مع طريقة طلب الحذف |
| بريد الدعم | خطأ في كتابة العنوان | amr@gharib.dev |
| صور المتجر | الصور السابقة | صور جديدة دون أشرطة النظام تُجهّز للرفع اليدوي؛ لم تُرفع بعد |

## الإصدار القادم وما يحتاج تحققًا إضافيًا

- اختيار المؤذن وتنزيل التسجيل عند المعاينة، مع دعم الصوت المحمّل عندما يكون التطبيق مغلقًا والتحقق من حقوق إعادة النشر.
- تجربة التنبيهات عمليًا على هواتف Samsung وغيرها أثناء توفير البطارية والنوم وإعادة التشغيل.
- استكمال اختبار مزامنة الحسابات وحذف بيانات الترتيب القديمة في بيئة قاعدة بيانات مخصصة؛ لم تُنشأ البيئة المدفوعة التي رفضها المستخدم.
- زيادة التحكم في المشاركة في لوحة الترتيب، والتحقق من شروط الاحتفاظ بالبيانات لدى الخدمات الخارجية.
- استكمال إعداد Apple واختبارات iPhone الفعلية؛ الموقع هو المسار الحالي لمستخدمي iOS.
- مواصلة التحقق من حقوق المصادر الدينية والتلاوات ومطابقة الاقتباسات.

## بناء النسخة الموقعة بنفسك

Open the existing project at `C:/Users/Amrab/Downloads/noor-adhkar/android` in Android Studio after the final source sync. Select **Build → Clean Project**, then **Build → Generate Signed Bundle / APK → Android App Bundle**, select the existing release keystore, and build the **release** variant. Upload the signed `.aab` as **1.2.66 (78)** and paste the Arabic notes above. Keep the existing keystore and alias so current users can update normally.

The agent's release bundle is unsigned validation output. Signing, uploading the app binary, and publishing its release remain with the owner, as requested.

## Verification and store evidence

The fresh web gate passed 1,349 tests across 175 files, TypeScript and the production/PWA build, with zero lint errors and 87 existing warnings. Android unit tests, debug build, instrumentation APK compilation, lint and unsigned release bundle generation passed. Independent review found one sound-migration issue that reset a saved Tajweed preference; it was fixed and re-reviewed.

The public policy and Play declaration are being updated; final live URLs, deployment status and screenshot paths are recorded in the delivery report. Screenshot upload requires Edge file-URL permission; the owner asked to leave that setting alone, so the images are prepared for manual upload. No signed app binary or release was submitted.

A production-dependency audit reports zero advisories. Five high-severity advisory paths remain in the development-only Tailwind 3 glob/watch toolchain; the suggested fix is a Tailwind 4 migration and is deferred to avoid changing the current design in this release.
