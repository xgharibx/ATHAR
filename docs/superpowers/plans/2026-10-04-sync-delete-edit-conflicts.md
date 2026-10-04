# Sync delete-versus-edit conflict Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent revision-conflict retries from permanently deleting an item that another device changed from the same shared sync base, while retaining deletion for unchanged stale copies.

**Architecture:** Keep the existing client-side three-way merge and revision-checked RPC protocol. Compare a surviving base value with its base value before treating absence on the other side as a delete; preserve actual changes through all keyed merge structures and test a deterministic stale-batch retry.

**Tech Stack:** TypeScript, Vitest, existing Supabase sync RPC test harness.

**Spec:** `docs/superpowers/specs/2026-10-04-sync-delete-edit-conflicts.md`

## Global Constraints

- No RPC interface, database schema, auth, stored data format, or platform API changes.
- No screen, prompt, notification, theme, or existing design changes; keep `forest` as the existing default.
- Keep the clear-all-data feature untouched and do not create a paid Supabase branch.
- Ordinary deletion of an unchanged copy must still propagate; concurrent changed data must survive.

## Review Focus

- A top-level scalar changed from base while absent on the other side remains available — test `keeps a changed whole field when the other device deletes it`.
- A false flag or a counter reset is a real change rather than an unchanged copy — test `preserves a changed flag and counter when the other side removes the key`.
- A nested value changed under an otherwise deleted container survives while unchanged children still follow deletion rules — test `preserves a changed nested counter when the other device removes its parent key`.
- Identity-only string-list membership has no editable payload and must keep delete-wins semantics — test `does not restore an identity-only string when another device deletes it`.
- A stale in-flight batch retries after another device edits and commits, converging local clients and server on the edit — test `retries a stale deletion without erasing a concurrent reminder edit`.

---

### Task 1: Preserve concurrent edits during three-way deletion merges

**Files:**
- Modify: `src/lib/syncMerge.ts`
- Test: `tests/syncMerge.test.ts`
- Test: `tests/syncClient.test.ts`
- Modify: `AUDIT_REPORT_2026-10-02.md`

**Interfaces:**
- Consumes: existing `mergeDoc(local, remote, { remoteNewer, base })`, `mergeBuckets`, and `athar_sync_commit_batch` retry flow.
- Produces: the same merge interfaces with a deletion tie-break that prefers a surviving value changed from base and still deletes a surviving value equal to base.

- [x] **Step 1: Write pure merge regressions first**

In `tests/syncMerge.test.ts`, add focused cases for these exact behaviors:

```ts
it("keeps a changed whole field when the other device deletes it", () => {
  const merged = mergeDoc({}, { quranStreak: 5 }, {
    remoteNewer: true,
    base: { quranStreak: 4 },
  });
  expect(merged.quranStreak).toBe(5);
});

it("deletes an unchanged whole field when the other device removes it", () => {
  expect(mergeDoc({}, { quranStreak: 4 }, {
    remoteNewer: true,
    base: { quranStreak: 4 },
  })).toEqual({});
});

it("preserves a changed flag and counter when the other side removes the key", () => {
  const merged = mergeDoc(
    { favorites: { x: false }, activity: { count: 0 } },
    { favorites: {}, activity: {} },
    { remoteNewer: true, base: { favorites: { x: true }, activity: { count: 2 } } },
  );
  expect(merged.favorites).toEqual({ x: false });
  expect(merged.activity).toEqual({ count: 0 });
});

it("preserves a changed nested counter when the other device removes its parent key", () => {
  const merged = mergeDoc(
    { tasbeehDailyLog: { day: { subhanallah: 4 } } },
    { tasbeehDailyLog: {} },
    { remoteNewer: true, base: { tasbeehDailyLog: { day: { subhanallah: 3 } } } },
  );
  expect(merged.tasbeehDailyLog).toEqual({ day: { subhanallah: 4 } });
});

it("keeps an edited ID-keyed reminder when the other device deletes it", () => {
  const base = { customReminders: [{ id: "r1", title: "Old", updatedAt: 100 }] };
  const merged = mergeDoc(
    { customReminders: [{ id: "r1", title: "Edited", updatedAt: 200 }] },
    { customReminders: [] },
    { remoteNewer: true, base },
  );
  expect(merged.customReminders).toEqual([{ id: "r1", title: "Edited", updatedAt: 200 }]);
});

it("does not restore an identity-only string when another device deletes it", () => {
  expect(mergeDoc({ reviewedPagesToday: [] }, { reviewedPagesToday: ["page-1"] }, {
    remoteNewer: true,
    base: { reviewedPagesToday: ["page-1"] },
  }).reviewedPagesToday).toEqual([]);
});
```

Also cover the custom-pack path at each identity level: an edited pack and an edited section must survive deletion when their retained versions differ from base; inside a pack and section that remain on both sides, an edited same-text adhkar item must survive deletion while an unchanged sibling that was deleted on one side remains deleted.

- [x] **Step 2: Write a deterministic two-device retry regression**

In `tests/syncClient.test.ts`, seed a shared server with one `customReminders` row and synchronize clients A and B to establish the same base. Change A's local reminders to `[]` and pause its `athar_sync_commit_batch` before the RPC. Change B's same reminder title and `updatedAt`, allow B to commit, then release A. Assert A's stale request conflicts and retries, the server row contains B's edited reminder, and both clients converge to that reminder after one final sync.

- [x] **Step 3: Run tests and observe the intended RED result**

Run: `npm test -- tests/syncMerge.test.ts tests/syncClient.test.ts`

Expected: the new changed-field, changed-value, edited-list, nested-container, and stale-retry assertions fail because deletion currently wins unconditionally; existing deletion-only tests continue to pass. Observed: 10 intended failures (9 pure merge cases and the two-device server payload), while 70 existing/ordinary-deletion checks passed.

- [x] **Step 4: Implement base-aware delete decisions**

In `src/lib/syncMerge.ts`, make keyed deletion decisions compare the retained value to its corresponding base value. Drop a base key only when the surviving value is structurally equal to base; keep it when changed. Apply the same rule to whole-field removal and ID-keyed lists. In pack, section, and adhkar-item paths, preserve a changed surviving entry but keep deleting an unchanged surviving entry. Do not change identity-only string-list deletion, no-base behavior, merge interfaces, or revision retries.

- [x] **Step 5: Run focused tests and observe GREEN**

Run: `npm test -- tests/syncMerge.test.ts tests/syncClient.test.ts`

Expected: all sync merge/client tests pass, including both the existing delete propagation case and the new concurrent edit/delete retry regression. Observed: 81 tests passed in 2 files.

- [x] **Step 6: Run the full project verification**

Run: `npm run verify`

Expected: lint, all Vitest tests, TypeScript, and production/PWA build pass. Observed: 86 lint warnings / 0 errors; 1,321 tests in 173 files passed; TypeScript and production/PWA build passed. Existing externalized Anthropic SDK, `lottie-web` eval, mixed-import, stale Browserslist, and >900 kB chunk warnings remain.

- [x] **Step 7: Update the audit record and commit**

Update the unresolved sync checklist entry in `AUDIT_REPORT_2026-10-02.md` with the precise client-side behavior, regression coverage, and staging limitation. Commit the spec, plan, merge logic, tests, and report together as `fix: preserve concurrent sync edits during deletes`.

```powershell
git add docs/superpowers/specs/2026-10-04-sync-delete-edit-conflicts.md docs/superpowers/plans/2026-10-04-sync-delete-edit-conflicts.md src/lib/syncMerge.ts tests/syncMerge.test.ts tests/syncClient.test.ts AUDIT_REPORT_2026-10-02.md
git commit -m "fix: preserve concurrent sync edits during deletes"
```
