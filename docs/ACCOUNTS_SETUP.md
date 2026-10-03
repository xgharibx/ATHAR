# Athar accounts — setup checklist

> ## Current verification status — 2026-10-03
>
> The production Supabase project is reachable and the migration ledger is
> current through `20261003051933_companion_global_budget`. Read-only checks
> confirm that `athar_sync` still has no revision column or batch RPC. The
> revision protocol is prepared in the active migration directory but has not
> been applied. The later write-cutoff SQL is staged under
> `supabase/release-gates/`, outside the directory consumed by routine
> `supabase db push`. There is no Supabase development branch or local
> PostgreSQL runtime available for staging tests yet.
>
> **Before applying the sync protocol:** run both pgTAP files against a
> disposable staging branch and verify two synthetic accounts and competing
> devices. Run `supabase db push --dry-run` and confirm that it lists only
> `20261003061000_athar_sync_revision_protocol.sql` before pushing. Supabase
> `db push` applies every pending file under `supabase/migrations`; see the
> [official CLI reference](https://supabase.com/docs/reference/cli/v1/supabase-db-push).
> Keep the cutoff outside that directory until the replacement web, Android, and iOS
> clients are available and the rollout is checked.
>
> Historical project ref: **`ojstudhmcypoqfnwugbf`**. Verify the active project
> before changing its settings.

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

## 2. Supabase: apply database migrations

For a new project, apply the tracked migrations in version order so the schema,
functions, grants, and RLS policies stay together. For an existing project,
check its migration ledger first and apply only versions that are absent; do not
re-run the initial accounts migration over a live project.

The current production account schema includes `athar_sync` and
`athar_profiles` with owner-scoped RLS. This branch prepares the revision
protocol and a later write cutoff:

- `20261003061000_athar_sync_revision_protocol.sql` adds revisions, a private
  idempotency table and SECURITY DEFINER implementations behind authenticated
  SECURITY INVOKER RPC wrappers. It retains the
  existing direct-write grants for the bridge rollout.
- `supabase/release-gates/20261003061100_athar_sync_write_cutoff.sql` revokes
  direct table writes and retains owner-scoped authenticated reads. It is
  intentionally outside `supabase/migrations`, because routine `supabase db
  push` applies all pending migration files. **Do not move it into the active
  migration directory** until updated web, Android, and iOS clients are
  available and the rollout has been checked. At that point, give it a new
  migration timestamp after all already-pending migrations and review
  `supabase db push --dry-run` before applying it as a separate release gate.

Verify: Dashboard → **Table Editor** → both tables exist and each shows
"RLS enabled". Also inspect the migration ledger and the RPC/table grants; a
successful SQL response alone does not prove the grants are correct.

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

## 7. Protect the paid Companion endpoint

The Companion now requires a signed-in account for AI replies. Quran, adhkar,
and locally stored data remain available to guests. Its Edge Function validates
the Supabase session and reserves a maximum of 30 requests per UTC day and 5 per
rolling minute in a service-only table; it does not store prompt or response
content in that table.

Before deploying:

1. Apply `supabase/migrations/20261003042909_companion_usage_quota.sql` and
   `supabase/migrations/20261003051933_companion_global_budget.sql` in version
   order, if the project's migration ledger does not already include them. Then
   verify `companion_usage_counters` has RLS enabled
   and no `anon` or `authenticated` table grants.
2. Set `MINIMAX_API_KEY` as an Edge Function secret only. Never use a `VITE_`
   variable for the provider key.
3. Deploy with `supabase functions deploy companion`.
4. Test missing/invalid sessions, concurrent quota reservations, per-minute
   and per-day limits, and oversized request rejection against staging.

The production project already has the Companion quota and shared budget
migrations and deployed function updates. Use the project migration ledger and
current release evidence rather than re-running these steps blindly.

## 8. Play Console / App Store disclosure

Once accounts ship you are collecting personal data, so:

- **Play Console → App content → Data safety**: declare account identifiers,
  user content, synced progress, and each network data flow; link the account
  deletion path.
- Publish a user-facing privacy policy before store release. Companion sends
  conversation history and selected progress/profile context through Supabase
  to MiniMax. The current MiniMax API terms permit inputs and outputs to be
  used to improve services; confirm the terms and retention applicable to the
  project account before enabling this for users. Location coordinates are also
  sent to Aladhan when online prayer-time calculation is used.

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
all local state, reads your six server documents, three-way merges, and sends
changed documents through a revision-checked batch RPC. A durable IndexedDB
request record makes uncertain commits replayable, and a conflict forces a
fresh read and merge. That is what makes it safe offline — however many changes
pile up in flight mode, the next successful run reconciles all of them.

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

The legacy direct-write cutoff remains a separate release gate in
`supabase/release-gates/`, outside the files applied by routine `supabase db
push`. Old store builds cannot render UI added later; after cutoff their cloud
writes fail, while local data remains available. Do not promote the cutoff into
the active migration directory until all supported replacement builds are
available and the rollout has been checked.
