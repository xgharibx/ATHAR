# Backend Setup (Phase 2)

هذا المجلد يحتوي تجهيزات المرحلة الثانية الخاصة بـ leaderboard الإنتاجي.

## الملفات
- `leaderboard_supabase_schema.sql`: مخطط قاعدة البيانات الأساسي (events + rollups + indexes + RLS baseline).
- `leaderboard_supabase_hardening.sql`: ترقيع أمني/منطقي للمشاريع التي نفذت السكيمة قبل إضافة checksum/idempotency.
- `leaderboard_supabase_moderation.sql`: جداول إدارة الأسماء والحظر والإخفاء وتدقيق قرارات التصفية.
- `check-leaderboard-endpoint.mjs`: سكربت فحص endpoint بعد النشر.

## خطوات سريعة (Supabase)
1. افتح SQL Editor في مشروع Supabase.
2. نفّذ محتوى `leaderboard_supabase_schema.sql`.
3. نفّذ محتوى `leaderboard_supabase_moderation.sql` إذا كنت تريد أسماء مخصّصة + أدوات إدارة وحظر.
4. أنشئ Edge Function (أو API وسيط) يستقبل:
   - `POST` لتسجيل score events + تحديث rollups.
   - `GET` لإرجاع top rows حسب `board`, `period`, `day`, `sectionId`.
   - القالب المعتمد موجود ضمن `supabase/functions/leaderboard` في جذر المشروع.
5. اضبط متغير البيئة في التطبيق:
   - `VITE_LEADERBOARD_ENDPOINT=https://<your-function-url>`

## إدارة الأسماء والمراجعة
- العميل يسمح للمستخدم باختيار اسم ظاهر، لكن الخادم هو المرجع النهائي.
- إذا خالف الاسم قواعد العميل أو وُجد ضمن `leaderboard_name_blocklist` فسيتم استبداله تلقائيًا باسم آمن.
- إذا أردت تعديل اسم مستخدم بعينه من طرفك استخدم `leaderboard_user_moderation.forced_alias`.
- إذا أردت إخفاء مستخدم بالكامل من اللوحة استخدم `leaderboard_user_moderation.hidden = true`.
- كل قرار اسم يُسجَّل في `leaderboard_alias_audit` لتتبع ما دخل من العميل وما الذي عُرض فعليًا.

## ما الذي تحتاجه للإدارة الفعلية؟
- تنفيذ ملفي SQL: الأساسي + moderation.
- نشر دالة `supabase/functions/leaderboard` بعد التحديث.
- حفظ `VITE_LEADERBOARD_ENDPOINT` في بيئة التطبيق.
- اختياريًا: حفظ `VITE_LEADERBOARD_ANON_KEY` إذا كانت القراءة أو الاستدعاء يحتاجان مفتاحًا عامًا.
- قائمة الكلمات الممنوعة التي تريدها أنت داخل جدول `leaderboard_name_blocklist`.
- طريقة وصول إداري لك إلى SQL Editor أو لوحة تحكم صغيرة لاحقًا إذا أردت إدارة الأسماء بدون كتابة SQL يدويًا.

## ملاحظات أمان
- لا تسمح بالكتابة المباشرة من العميل إلى جداول rollups.
- طبّق rate limiting على endpoint.
- تحقّق من payload checksum/day-skew/score caps قبل الإدخال.
- لا تعتمد على فحص العميل للأسماء وحده؛ راجع الأسماء في الخادم دائمًا.
- نفّذ reconciliation job دوري لإعادة حساب rollups من events.
