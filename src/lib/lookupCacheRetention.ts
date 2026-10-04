import type { Table } from "dexie";

export const LOOKUP_CACHE_STALE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/** Keep dynamic lookup stores small and remove long-expired rows after a refresh succeeds. */
export async function pruneLookupCacheRows<T extends { key: string; cachedAt: number }>(
  table: Table<T, string>,
  options: { maxAgeMs: number; maxEntries: number; now?: number },
): Promise<void> {
  const now = options.now ?? Date.now();
  const expiredBefore = now - options.maxAgeMs - LOOKUP_CACHE_STALE_GRACE_MS;

  await table.db.transaction("rw", table, async () => {
    const expiredKeys = await table.where("cachedAt").below(expiredBefore).primaryKeys();
    if (expiredKeys.length > 0) await table.bulkDelete(expiredKeys);

    const count = await table.count();
    const overflow = count - options.maxEntries;
    if (overflow > 0) {
      const oldestKeys = await table.orderBy("cachedAt").limit(overflow).primaryKeys();
      await table.bulkDelete(oldestKeys);
    }
  });
}
