# Contributing

Athar is proprietary software. This document describes how changes are made by the Athar team, and how others can help.

## If you are not on the Athar team

- **Bugs and content corrections:** open an issue using the templates. For a wrong verse, hadith or attribution, include the source.
- **Security problems:** do not open an issue. Follow [SECURITY.md](SECURITY.md).
- **Code:** pull requests from outside the team are not accepted, because the code is not open source. See [LICENSE](LICENSE).

## Development workflow

1. Create a branch from `main`. Name it for the work: `fix/prayer-time-rounding`, `feature/hifz-review`.
2. Make the change with tests. Keep each pull request to one purpose.
3. Run `npm run verify` before pushing. It runs the release checks, lint, the unit tests and a production build.
4. Open a pull request and fill in the template. `main` is protected: changes land through reviewed pull requests with passing checks.
5. Merging to `main` deploys the web app. Mobile releases follow the checklists in `docs/`.

## Standards

- **Language:** TypeScript in strict mode. No `any` without a comment explaining why.
- **Interface:** Arabic, right-to-left, first. Check every screen at phone width.
- **Religious content:** every verse, hadith and dhikr must come from a named source and carry its attribution. Never write religious text from memory.
- **Privacy:** anything that sends user data off the device needs a matching update to the privacy policy and the store data declarations in the same pull request.
- **Secrets:** never commit keys or tokens. Client configuration uses `VITE_*` variables; server credentials are Supabase secrets.
- **Database:** every schema change is a migration in `supabase/migrations/`, safe to apply to existing data.

## Commit messages

Write a short imperative summary line ("Fix prayer-time rounding at midnight"), then a body explaining why when the reason is not obvious.

## Releases

Versions follow `major.minor.patch` in `package.json`, kept in step with the native projects by `npm run version:bump`.
