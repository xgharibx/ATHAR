# Repository rulesets

`main-branch-protection.json` is the protection applied to `main`. To apply or re-apply it:

1. Open the repository on GitHub, then **Settings → Rules → Rulesets**.
2. Choose **New ruleset → Import a ruleset** and select the JSON file.
3. Review and save.

What it enforces:

- `main` cannot be deleted or force-pushed.
- Every change arrives through a pull request with resolved review threads.
- The CI and CodeQL checks must pass. CI includes the audit of shipped dependencies and the licence test.

The scheduled store-version job commits to `main` directly. After importing, add **GitHub Actions** to the ruleset's bypass list so that job keeps working.
