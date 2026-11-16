# ATHAR private feedback inbox

Public page: `https://www.athark.org/feedback` (and `/feedback/`).

The page can be opened from a WhatsApp link, including by people who do not use the ATHAR app or have an account. Both a standalone HTML page and a React route exist; the PWA service worker excludes `/feedback` navigation from the cached app shell.

## Owner inbox

Messages are stored privately in Supabase Studio → Table Editor → `public.athar_feedback_submissions`.

- The tables have RLS enabled, and public/anonymous/authenticated access is revoked.
- Users may provide a name/contact optionally.
- `share_consent` defaults to `false`; only `true` may be considered for manual sharing in a WhatsApp group.
- **Never automatically publish submissions.** Human-review every excerpt and redact names, contact details, and any personal information contained in the message itself.
- This is a private inbox for the project owner, not end-to-end encrypted communication. Avoid collecting secrets or sensitive personal data.

## Configure automatic owner email notifications

The feedback Edge Function sends a privacy-preserving notification (category + ID only; no message text, sender name, or contact).

This needs a transactional email provider. ATHAR uses Resend.

1. Create an account at https://resend.com, verify a sending domain (e.g. `athark.org`) and create a sending API key.
2. Open [ATHAR Edge Function Secrets](https://supabase.com/dashboard/project/ojstudhmcypoqfnwugbf/settings/functions).
3. Configure these three Supabase Edge Function secrets:
   - `RESEND_API_KEY`: private sending API key
   - `FEEDBACK_NOTIFY_TO`: the owner's inbox email
   - `FEEDBACK_NOTIFY_FROM`: sender authorized by Resend, e.g. `أثر <feedback@athark.org>` after domain verification
4. Submit a test message from the live feedback page. Confirm the email arrived and a new record is in the table with `email_status = 'queued'`. `queued` means the email service accepted the request, **not** proof of delivery.

If credentials are absent, the submission is still stored and `email_status = 'not_configured'`. If the provider rejects the request, `email_status = 'failed'`. Email failures do not lose users' feedback.

To find entries requiring follow-up:

```sql
select created_at, category, share_consent, email_status, message
from public.athar_feedback_submissions
where email_status <> 'queued'
order by created_at desc;
```

Never place the Resend key in a `VITE_*` setting, GitHub files, or publicly accessible JavaScript.

## Security notes

- The Edge Function protects anonymous submissions with input validation, a honeypot, daily HMAC rate limiting, and no publicly-readable messages.
- If spam becomes a problem, set up a provider-managed anti-bot challenge (e.g. Turnstile) with server-side token verification.
- For notification reliability at higher volume, add a scheduled retry for `email_status = 'failed'` and message retention/deletion policy.
