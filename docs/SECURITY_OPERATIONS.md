# Security Operations

How Athar is protected, what is configured where, and what to do when something goes wrong. The public reporting policy is in [SECURITY.md](../SECURITY.md).

## Controls in place

| Area | Control |
|---|---|
| Source | Secret scanning with push protection; CodeQL analysis; dependency review on every pull request; Dependabot updates; workflow actions pinned to exact commits; workflows run with read-only tokens unless a job needs more |
| Web app | Content security policy with hashed inline scripts; no source maps; debug logging stripped; React DevTools hook disabled; no secrets in the bundle |
| API | Row-level security on every table; anonymous role has no table privileges; server-only tables carry an explicit deny policy; functions run with a fixed search path |
| Edge functions | Server-held provider keys; per-user, per-address and global quotas; request size limits; only known request fields forwarded to the model; account deletion verifies the caller's own session |
| Assistant | Verses and hadith verified against sources before display; links limited to an allow-list; spending ceiling enforced in the database |
| Auth | Refresh-token rotation; redirect addresses limited to the production site and the app scheme; confirmed email required |
| Database | SSL required for direct connections; daily pruning jobs for event data |

## Secrets

Names only. Values live in the service that uses them and are never committed.

| Secret | Where | Used for | Rotate |
|---|---|---|---|
| `MINIMAX_API_KEY` | Supabase function secrets | Assistant model calls | Yearly, and at once if exposed |
| `LEADERBOARD_ADMIN_TOKEN` | Supabase function secrets | Leaderboard moderation | Yearly, and whenever someone with access leaves |
| `QF_CLIENT_ID`, `QF_CLIENT_SECRET` | Supabase function secrets | Quran Foundation translations | As the provider requires |
| Supabase service-role and secret keys | Supabase | Server access to the database | At once if exposed |
| Supabase database password | Supabase | Direct database access | Yearly |
| `VITE_SUPABASE_ANON_KEY` and other `VITE_*` values | GitHub Actions secrets | Build-time client configuration; public by design | When the project keys change |
| `APPSTORE_*`, `APPLE_TEAM_ID`, `IOS_DIST_CERT_*` | GitHub Actions secrets | iOS signing and upload | Before the certificate expires |
| `ATHAR_KEYSTORE_PASSWORD`, `ATHAR_KEY_PASSWORD` and the Android keystore | Release machine | Android signing | Never lose; keep an offline backup |

## Settings to keep

**GitHub repository**

- Import `.github/rulesets/main-branch-protection.json` (see the README beside it).
- Code security: secret scanning, push protection, Dependabot alerts, Dependabot security updates and private vulnerability reporting all on.
- Actions: default workflow permissions read-only; do not allow Actions to approve pull requests.
- Features: turn off Wiki and Projects if unused; enable automatic deletion of merged branches.

**GitHub account**

- Two-factor authentication with a passkey or security key, and recovery codes stored offline.
- Review authorised OAuth apps, personal access tokens and SSH keys twice a year; remove what is unused.
- Own the repository through an organisation, with at least two owners, so access does not depend on one personal account.

**Supabase**

- Two-factor authentication on every member account.
- Auth: leaked-password protection on (available on paid plans); add a CAPTCHA provider before opening password sign-up.
- Database: restrict direct connections to known addresses if the plan allows; keep SSL enforcement on.
- Review the Security Advisor after every migration.

## Releasing safely

1. Every change goes through a pull request with green checks.
2. Database changes are migrations; apply them before the code that depends on them.
3. Deploy Edge Functions from `main` only.
4. After a release, check the function logs and the Security Advisor.

## If something goes wrong

**A key or token is exposed**

1. Rotate it in the service that issued it. Do this first.
2. Update the secret where it is stored and redeploy what uses it.
3. Check that service's logs for use you do not recognise.
4. Remove it from the repository history if it was committed.

**Suspicious activity or a reported vulnerability**

1. Acknowledge the report within three business days (see SECURITY.md).
2. Reproduce it with a test account, never with real user data.
3. If user data may be affected, limit the damage first: disable the affected function or revoke the affected sessions.
4. Fix, add a test that fails without the fix, and release.
5. Record what happened, what was affected and what changed. Tell affected users and the relevant authority where the law requires it.

**The assistant shows wrong religious content**

1. Capture the question and the answer.
2. If the wording of a verse or hadith was wrong, treat it as a defect in the verification guard and add a failing test.
3. If the cost ceiling or a provider failure is involved, the assistant can be stopped at once by removing `MINIMAX_API_KEY`; the rest of the app is unaffected.
