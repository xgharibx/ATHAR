# Backend Setup (Phase 2)

هذا المجلد يحتوي تجهيزات المرحلة الثانية الخاصة بـ leaderboard الإنتاجي.

## الملفات
- `leaderboard_supabase_schema.sql`: مخطط قاعدة البيانات الأساسي (events + rollups + indexes + RLS baseline).
- `leaderboard_supabase_hardening.sql`: ترقيع أمني/منطقي للمشاريع التي نفذت السكيمة قبل إضافة checksum/idempotency.
- `check-leaderboard-endpoint.mjs`: سكربت فحص endpoint بعد النشر.

## خطوات سريعة (Supabase)
1. افتح SQL Editor في مشروع Supabase.
2. نفّذ محتوى `leaderboard_supabase_schema.sql`.
3. أنشئ Edge Function (أو API وسيط) يستقبل:
   - `POST` لتسجيل score events + تحديث rollups.
   - `GET` لإرجاع top rows حسب `board`, `period`, `day`, `sectionId`.
   - القالب المعتمد موجود ضمن `supabase/functions/leaderboard` في جذر المشروع.
4. اضبط متغير البيئة في التطبيق:
   - `VITE_LEADERBOARD_ENDPOINT=https://<your-function-url>`

## ملاحظات أمان
- لا تسمح بالكتابة المباشرة من العميل إلى جداول rollups.
- طبّق rate limiting على endpoint.
- تحقّق من payload checksum/day-skew/score caps قبل الإدخال.
- نفّذ reconciliation job دوري لإعادة حساب rollups من events.
