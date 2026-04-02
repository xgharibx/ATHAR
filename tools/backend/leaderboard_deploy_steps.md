# Leaderboard Deploy Steps (PowerShell)

هذه الخطوات مبنية على هذا المشروع الحالي وعلى الـ project ref الموجود الآن في الرابط:
`ojstudhmcypoqfnwugbf`

إذا نقلت المشروع إلى Supabase آخر، غيّر الـ project ref فقط.

## 1) تأكد أن مشروع Supabase غير متوقف
- افتح لوحة Supabase الخاصة بالمشروع الحالي.
- إذا كانت الحالة `Paused` فقم بعمل Resume أولًا.

## 2) ثبّت Supabase CLI إذا لم يكن موجودًا
```powershell
npm install -g supabase
```

## 3) سجّل الدخول واربط المشروع
```powershell
supabase login
supabase link --project-ref ojstudhmcypoqfnwugbf
```

## 4) نفّذ ملفات SQL من Supabase Dashboard
نفّذ هذه الملفات بالترتيب من SQL Editor:

1. `tools/backend/leaderboard_supabase_schema.sql`
2. `tools/backend/leaderboard_supabase_moderation.sql`
3. `tools/backend/leaderboard_supabase_hardening.sql` فقط إذا كان عندك نشر قديم سبق اشتغل قبل التعديلات الأمنية

## 5) أنشئ سر الإدارة للخادم فقط
اختر قيمة طويلة وعشوائية. هذا السر لا يوضع داخل `.env.local` ولا داخل التطبيق.

```powershell
supabase secrets set LEADERBOARD_ADMIN_TOKEN="replace-with-a-long-random-secret" --project-ref ojstudhmcypoqfnwugbf
```

مثال سر جيد من PowerShell:
```powershell
[guid]::NewGuid().Guid + [guid]::NewGuid().Guid
```

## 6) انشر دالة leaderboard
```powershell
supabase functions deploy leaderboard --project-ref ojstudhmcypoqfnwugbf --no-verify-jwt
```

## 7) جهّز متغيرات الواجهة محليًا
انسخ `.env.example` إلى `.env.local` ثم ضع القيم التالية:

```dotenv
VITE_LEADERBOARD_ENDPOINT=https://ojstudhmcypoqfnwugbf.functions.supabase.co/leaderboard
VITE_LEADERBOARD_ANON_KEY=your_supabase_anon_key
```

## 8) شغّل التطبيق محليًا
```powershell
npm install
npm run dev
```

## 9) اختبر endpoint مباشرة
```powershell
$env:LEADERBOARD_ENDPOINT="https://ojstudhmcypoqfnwugbf.functions.supabase.co/leaderboard"
$env:LEADERBOARD_ANON_KEY="your_supabase_anon_key"
npm run leaderboard:health
```

## 10) كيف تستخدم لوحة الإدارة بعد ذلك؟
- افتح صفحة leaderboard داخل التطبيق.
- افتح قسم `إدارة المتصدرين`.
- الصق قيمة `LEADERBOARD_ADMIN_TOKEN` يدويًا داخل حقل رمز الإدارة.
- لا تحفظ هذا السر في ملفات الواجهة ولا في Git.

## ملاحظات مهمة
- `VITE_LEADERBOARD_ANON_KEY` آمن نسبيًا للمتصفح لأنه المفتاح العام.
- `LEADERBOARD_ADMIN_TOKEN` ليس آمنًا للمتصفح إذا وضعته في build env. أدخله يدويًا فقط من جهازك الإداري.
- `SUPABASE_SERVICE_ROLE_KEY` لا تضعه أبدًا في الواجهة. الدالة السحابية تقرأه من أسرار Supabase تلقائيًا.