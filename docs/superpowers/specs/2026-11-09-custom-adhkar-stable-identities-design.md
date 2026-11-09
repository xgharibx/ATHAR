# Custom Adhkar Stable Identity Design

**Date:** 2026-11-09 · **Status:** Implemented and verified

## Problem

Adhkar progress and favorites are currently addressed by section ID and array
index. Deleting an item shifts the later indices. If another device was offline
and increments the deleted item before syncing, the additive progress merge can
apply that increment to the next item at the reused index. Stale state for
deleted custom items can also remain in leaderboard totals.

## Decision

Give user-created and imported adhkar items a persisted stable ID. Keep the
current index key for immutable bundled catalog items. Use the item ID for
progress and favorites on mutable items. Generate deterministic IDs for legacy
items from their owning pack/section and their original position and text, so
two devices upgrading the same old snapshot arrive at the same ID. New items
receive an ID once and preserve it during edits and list changes.

On upgrade, move existing index-keyed progress and favorites to ID-keyed state
before the item is used. Record each legacy key as migrated, including keys
whose counter/favorite is currently empty. This makes the migration one-way: a
stale client may still upload an old index key, but it cannot later be
mistakenly attached to a different item. Such late legacy counters are
orphaned and excluded from visible progress and scoring; they never change the
next item's count.

Deleting an item removes only its ID-keyed progress/favorite and updates the
separate display-order/resume state. It never moves one item's counter to
another item. Deleting a whole pack clears that section's state.

Leaderboard scoring will count counters only for active items. It will include
active custom packs explicitly, rather than awarding any unmatched progress
key. This removes points left behind by deleted items.

Sync merge will normalize legacy item records to the same deterministic IDs
before merging pack contents. Newer clients then merge progress by stable item
key. A delayed update for deleted item B can remain orphaned under B's ID, but
cannot become item C's progress or score.

## Scope

- Add optional item IDs to normalized adhkar data and custom pack item types.
- Normalize and persist IDs for local imported/user-created data packs and
  Zustand custom packs.
- Preserve IDs across add/edit/export/import/sync.
- Use stable item state keys in `DhikrCard`, `DhikrList`, Favorites, and
  leaderboard calculations.
- Migrate legacy progress/favorites once and persist a synced legacy-key
  migration map.
- Delete only the target item's ID-keyed state and separately repair display
  order and resume position.
- Cover legacy migration, repeated migration, deletion, favorites, two-device
  concurrent updates, pack deletion, and leaderboard filtering.

## Alternatives considered

1. **Reindex all maps after deletion.** Rejected because concurrent devices
   merge by numeric key and can attach the deleted item's late counter to its
   successor.
2. **Clear every counter after the deleted index.** Rejected because it loses
   unrelated user progress and an offline sync can restore the stale key.
3. **Stable IDs for all bundled items.** Deferred. Bundled content is
   immutable-by-index for this issue; changing all catalog keys creates a
   wider migration without improving custom-item deletion safety.

## Verification

The two-device regression will model a shared base, delete item B on device A,
increment B on device B, and merge. It must preserve C's original count, keep
B's late update isolated under B's ID, and exclude that orphan from the
leaderboard. Focused store, render, sync-merge, and score tests will cover the
remaining paths before the full repository verification.
