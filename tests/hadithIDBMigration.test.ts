// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import {
  idbGetAllHadithBookmarks,
  idbGetAllHadithMemoCards,
  idbGetAllHadithNotes,
  idbGetAllHadithProgress,
  migrateHadithStateToIDB,
} from "@/lib/hadithIDB";

describe("migrateHadithStateToIDB", () => {
  it("propagates IndexedDB write failures so the source snapshot is retained", async () => {
    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });

    try {
      await expect(migrateHadithStateToIDB({
        bookmarks: {},
        progress: {},
        notes: { "bukhari:1": "ملاحظة محفوظة" },
        memoCards: {},
      })).rejects.toThrow();
    } finally {
      put.mockRestore();
    }
  });

  it("rolls back rows in every store when a later store write fails", async () => {
    const originalPut = IDBObjectStore.prototype.put;
    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      value: any,
      key?: IDBValidKey,
    ) {
      if (this.name === "notes") {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      return originalPut.call(this, value, key);
    });

    try {
      await expect(migrateHadithStateToIDB({
        bookmarks: { "bukhari:rollback-check": true },
        progress: { rollbackCheck: 9 },
        notes: { "bukhari:rollback-check": "يجب ألا تحفظ جزئياً" },
        memoCards: {
          "bukhari:rollback-check": { interval: 1, ease: 2.5, due: "2026-10-04", reviews: 1 },
        },
      })).rejects.toThrow("Storage quota exceeded");
    } finally {
      put.mockRestore();
    }

    const [bookmarks, progress, notes, memoCards] = await Promise.all([
      idbGetAllHadithBookmarks(),
      idbGetAllHadithProgress(),
      idbGetAllHadithNotes(),
      idbGetAllHadithMemoCards(),
    ]);

    expect(bookmarks).not.toHaveProperty("bukhari:rollback-check");
    expect(progress).not.toHaveProperty("rollbackCheck");
    expect(notes).not.toHaveProperty("bukhari:rollback-check");
    expect(memoCards).not.toHaveProperty("bukhari:rollback-check");
  });
});
