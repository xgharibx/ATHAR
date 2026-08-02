# Athar accounts — setup checklist

> ## ✅ Setup is complete — all six steps verified against the live project
>
> - [x] **1. Keys** — `VITE_SUPABASE_URL` + publishable key in `.env.local`
> - [x] **2. Tables** — `athar_sync` + `athar_profiles` exist with RLS.
>       Verified externally: anonymous SELECT returns `[]`, anonymous INSERT is
>       refused with `42501`, so a user can only ever reach their own rows.
> - [x] **3. Google** — provider enabled, OAuth client resolving. `/auth/v1/authorize`
>       302s to `accounts.google.com` with `redirect_uri=…/auth/v1/callback`.
> - [x] **4. Redirect URLs** — `app.athar://auth` **is** allow-listed. Verified by
>       probe: an unlisted URL is rewritten to the Site URL, `app.athar://auth`
>       is preserved. (Note the authorize endpoint echoes *any* `redirect_to`;
>       the allow-list is only enforced at `/verify` and `/callback`, so that is
>       the endpoint to test against.)
> - [x] **5. Email provider** — enabled; magic-link sign-in works
> - [x] **6. delete-account function** — deployed
>
> **The only thing left before production web:** add `VITE_SUPABASE_URL` and
> `VITE_SUPABASE_ANON_KEY` to your hosting provider's environment variables.
> Without them the account card stays hidden on athark.org (by design — see
> `isAuthConfigured()`), even though it works locally and in the Android build.
>
> Project ref: **`ojstudhmcypoqfnwugbf`**

The steps below are kept as a reference for re-doing any of this, or for setting
up a second environment.

---

## 1. Supabase: get the project keys

Supabase dashboard → your project → **Project Settings → API**

Copy:
- **Project URL** (e.g. `https://ojstud….supabase.co`)
- **anon / public key**

Add to `.env.local` (and to your hosting provider's env vars for production):

```
VITE_SUPABASE_URL=https://ojstud….supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi…
```

> The anon key is safe in the client — it's designed to be public. What
> protects user data is the row-level security in step 2, not key secrecy.

---

## 2. Supabase: create the tables

Dashboard → **SQL Editor** → paste the contents of
`supabase/migrations/0001_accounts_sync.sql` → **Run**.

This creates `athar_sync` and `athar_profiles` with row-level security so a
signed-in user can only ever read and write **their own** rows.

Verify: Dashboard → **Table Editor** → both tables exist and each shows
"RLS enabled".

---

## 3. Google sign-in

**3a. Google Cloud Console** → <https://console.cloud.google.com/>

1. Create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name,
   support email, developer email. Add your domain under *Authorized domains*.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   **Web application**.
4. Under **Authorized redirect URIs** add exactly:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client secret**.

**3b. Supabase** → **Authentication → Providers → Google** → enable, paste the
Client ID and Secret → Save.

---

## 4. Redirect URLs (this is what usually breaks)

Supabase → **Authentication → URL Configuration**

- **Site URL**: `https://www.athark.org`
- **Redirect URLs** — add all of these:
  ```
  https://www.athark.org
  https://www.athark.org/
  http://localhost:5173
  app.athar://auth
  ```

That last one is the Android app. Google won't render its consent screen inside
a WebView, so on Android sign-in opens the system browser and returns through
the `app.athar://auth` custom scheme, which is already registered in
`AndroidManifest.xml`. Without it in this list, Android sign-in completes in the
browser and never comes back to the app.

---

## 5. Email magic link

Supabase → **Authentication → Providers → Email** → ensure **Enable email
provider** is on.

The built-in mailer is rate-limited and fine for testing, but it will land in
spam at real volume. Before launch set up SMTP under
**Project Settings → Auth → SMTP Settings** (Resend, Postmark, SendGrid…).

---

## 6. Deploy the account-deletion function

Google Play **requires** an in-app way to delete an account for any app that
offers accounts. The function is written; deploy it:

```bash
supabase functions deploy delete-account
```

It uses the service-role key, which Supabase injects automatically — do **not**
put that key in `.env.local` or anywhere client-side.

---

## 7. Play Console / App Store disclosure

Once accounts ship you are collecting personal data, so:

- **Play Console → App content → Data safety**: declare email address +
  user-generated content, and link the account-deletion path.
- Update the privacy policy to say what's stored (adhkar progress, favorites,
  bookmarks, reminders, settings) and how to delete it.

> **iOS note:** offering Google/email sign-in means the App Store build will
> need **Sign in with Apple** (App Store rule 4.8) before it can be approved.
> This does not affect the website or the iOS add-to-home-screen web app —
> only a native App Store submission.

---

## Verifying it works

1. `npm run dev`, open Settings — an **الحساب والمزامنة** card should now appear
   (it's hidden without the env vars).
2. Sign in with Google → you should land back signed in.
3. Supabase → **Authentication → Users** → your account is listed.
4. Sign out, sign back in — you stay you.
5. Supabase → **Table Editor → athar_sync** → six rows for your user, one per
   `kind`. That's sync working.

---

## How sync behaves

`src/lib/syncMerge.ts` (rules) and `src/lib/syncClient.ts` (I/O).

Sync is **full-state reconciliation**, not a queue of operations: each run reads
all local state, reads your six server documents, three-way merges, and writes
back only what changed. That is what makes it safe offline — however many
changes pile up in flight mode, the next successful run reconciles all of them,
and a run that dies half-way just retries.

The rule that drove the design: **sync must never lose data the user can see.**
Plain last-write-wins would break that — read ten ayahs on the phone, open the
tablet, and the tablet's older snapshot wins. So every field is merged against
`base`, the snapshot this device last agreed with the server:

- both sides agree → nothing to decide
- only the other device moved → take theirs
- only this device moved → keep ours
- **both** moved → resolve by type: larger wins for counters and streaks, union
  for favourites and lists, later writer for plain settings

`base` is also what makes deletion work. Without it, "un-favourite on the phone"
is indistinguishable from "the tablet hasn't heard about this favourite yet",
and a union merge resurrects it forever.

On a device with no base — the first sign-in — the rules degrade to pure
union/max. **An empty or partial cloud can never blank existing local data.**

Two consequences worth knowing:

- **Signing out keeps everything on the device.** Only account *deletion*
  removes cloud data.
- **Signing into a different account on the same device discards the old base**
  first. Skipping that would make every local key look like a deletion against
  a stranger's snapshot and wipe the device — `tests/syncClient.test.ts` pins
  this case specifically.

New fields added to `exportState()` sync automatically: anything not listed in
`FIELD_KIND` falls into the `settings` document rather than silently not
syncing.
