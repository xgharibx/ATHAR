# Quran Foundation translation proxy

ATHAR loads Yusuf Ali (translation ID `22`) and Jalandhry (`234`) one surah at a time through the `quran-translations` Supabase Edge Function. Saheeh International remains bundled locally. Quran Foundation OAuth credentials stay on the server; the browser receives only validated chapter text.

## Configure a Supabase project

Create a backend application in the Quran Foundation developer portal and obtain its client ID and client secret. Then configure the matching Supabase project's Edge Function secrets:

```sh
npx supabase secrets set QF_CLIENT_ID=<client-id> QF_CLIENT_SECRET=<client-secret> QF_ENV=production
npx supabase functions deploy quran-translations
```

The production quota migration is recorded as `20261109045550 quran_translation_rate_limits`, and `quran-translations` is deployed as version 1 with JWT verification enabled. The checked-in migration versions match the production ledger as of 9 November 2026. Setting the provider secrets and deploying the function does not require `supabase db push`; that command applies every pending migration in the project. Use `QF_ENV=prelive` only with Quran Foundation's pre-live credentials. Never put either credential in `.env.local`, a `VITE_*` variable, source code, or a client bundle. The function fails closed with HTTP 503 when credentials or the shared quota service are unavailable.

## Provider requirements

- The client can request only translation IDs `22` and `234` and one surah (1–114) per call.
- A database-backed atomic token bucket gives each keyed client hash a 60-request burst capacity and refills at one token per second, with a 2,000-request UTC-day cap. The shared global bucket has a 1,200-request burst capacity, refills at 20 tokens per second, and has a 50,000-request UTC-day cap. The Edge Function uses the source address transiently for its per-isolate burst check; the durable database stores only a server-keyed HMAC, never a raw address. Quran text is not stored by the quota system.
- Provider text is cached in memory and IndexedDB for at most seven days. Expired and legacy whole-book cache entries are deleted; stale text is not an offline fallback.
- Browser auto-translation is disabled for Quran content. When a provider translation is shown or shared, ATHAR credits `Quran data provided by Quran Foundation` and names the selected translation.
- The provider must approve each translation for production access. Confirm both IDs and all 114 chapters are enabled before release.

## Current verification boundary

The function and client are covered by mocked tests, including OAuth, allowlisting, CORS, shared-quota decisions, response validation, and expiry. On 9 November 2026, the migration and function were deployed to the ATHAR production project, and read-only checks confirmed the table's RLS/ACLs and service-role-only RPC access. One live request passed function authorization and quota reservation but returned HTTP 503 `translation-service-unavailable`; Quran Foundation client credentials are not configured. That smoke request stored only the normal global and keyed quota counters, with no account data or Quran text. A successful provider response, credential approval for both translation IDs, and real client UI flow remain unverified until those server secrets are configured.
