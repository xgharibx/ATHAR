# Quran Foundation translation proxy

ATHAR loads Yusuf Ali (translation ID `22`) and Jalandhry (`234`) one surah at a time through the `quran-translations` Supabase Edge Function. Saheeh International remains bundled locally. Quran Foundation OAuth credentials stay on the server; the browser receives only validated chapter text.

## Configure a Supabase project

Create a backend application in the Quran Foundation developer portal and obtain its client ID and client secret. Then configure the matching Supabase project's Edge Function secrets:

```sh
npx supabase secrets set QF_CLIENT_ID=<client-id> QF_CLIENT_SECRET=<client-secret> QF_ENV=production
npx supabase functions deploy quran-translations
```

Use `QF_ENV=prelive` only with Quran Foundation's pre-live credentials. Never put either credential in `.env.local`, a `VITE_*` variable, source code, or a client bundle. The function fails closed with HTTP 503 when credentials are missing.

## Provider requirements

- The client can request only translation IDs `22` and `234` and one surah (1–114) per call.
- Provider text is cached in memory and IndexedDB for at most seven days. Expired and legacy whole-book cache entries are deleted; stale text is not an offline fallback.
- Browser auto-translation is disabled for Quran content. When a provider translation is shown or shared, ATHAR credits `Quran data provided by Quran Foundation` and names the selected translation.
- The provider must approve each translation for production access. Confirm both IDs and all 114 chapters are enabled before release.

## Current verification boundary

The function and client are covered by mocked tests, including OAuth, allowlisting, CORS, response validation, and expiry. This repository phase has not set Supabase secrets or deployed the function. Until a maintainer configures an approved Quran Foundation application and the restricted Supabase project accepts deployment, production responses cannot be verified.
