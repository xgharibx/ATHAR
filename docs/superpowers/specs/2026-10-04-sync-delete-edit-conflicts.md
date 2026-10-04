# Sync delete-versus-edit conflict design

## User outcome

Cloud sync must not permanently discard a user-visible change just because another device deleted the same item from an older shared snapshot. A deliberate deletion must still propagate when the other device has only an unchanged copy. Preserve the current interface, `forest` visual default, and all existing designs.

## Current behavior and cause

`mergeDoc` and its helpers use a shared three-way base to distinguish deletions from data unknown to the other device. For any base key absent from either the local or remote map, `keyDecision` currently drops the key without comparing the surviving value to the base. The same unconditional rule appears in top-level fields and ID-keyed list, pack, section, and adhkar-item merges. This makes deletion win even when the other side independently changed the surviving value. Revision-checked commits correctly reject stale writes, but retrying reaches this same merge rule, so the surviving edit can be removed from both devices and the server.

## Conflict policy

For a value represented in the shared base and absent on one side:

1. If the side retaining it has the same value as the base, treat that copy as stale and let the deletion win.
2. If the retained value differs from the base, preserve the concurrent edit. When the retained value is a mergeable container, recurse so unrelated unchanged children can still follow ordinary deletion rules.
3. For identity-only sets such as string lists, where an element has no editable payload, keep deletion-wins behavior.
4. With no common base, preserve the existing conservative merge behavior; do not infer a deletion.

This rule applies consistently to whole fields, keyed maps and counters, nested maps, ID-keyed lists, and custom packs/sections/adhkar items. It is symmetric with respect to which device deleted or edited first. Concurrent edits to an item that one device deleted resolve in favor of the recoverable changed value; the user can delete it again after the devices converge.

## Compatibility and scope

Use the existing client-side base snapshots and revision/retry protocol. Do not change RPC interfaces, database schema, auth, stored data formats, screens, prompts, notification behavior, or platform APIs. The existing cross-device sync protocol and ordinary deletion behavior remain intact except for the explicit concurrent edit-versus-delete tie-break above. Backend migration and signed-in staging verification remain separate release gates.

## Verification

- Pure merge tests prove unchanged stale copies are deleted and changed values survive for top-level fields, maps, flags, counters, nested maps, ID-keyed lists, and custom pack content.
- A deterministic two-device test makes one device delete a reminder while the other edits it, forces the edit to commit before the stale deletion batch, and verifies revision conflict/retry converges both clients and the server on the edit.
- Existing deletion, conflict retry, and cross-device addition tests remain green.
- Run focused sync tests, then `npm run verify`. Database-backed staging behavior remains unverified unless a no-cost local or already-authorized environment is available; do not create a paid branch.
