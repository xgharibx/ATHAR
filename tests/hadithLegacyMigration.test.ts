// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { migrateHadithStateToIDBMock } = vi.hoisted(() => ({
  migrateHadithStateToIDBMock: vi.fn(),
}));

vi.mock("@/lib/hadithIDB", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hadithIDB")>();
  return { ...actual, migrateHadithStateToIDB: migrateHadithStateToIDBMock };
});

import { setAccountStorageOwner } from "@/lib/accountStorageScope";
import { hydrateAccountStorageOwner, useNoorStore } from "@/store/noorStore";

const LEGACY_HADITH_STATE = {
  hadithBookmarks: { "bukhari:1": true },
  hadithProgress: { bukhari: 12 },
  hadithNotes: { "bukhari:1": "ملاحظة محفوظة" },
  hadithMemoCards: {},
};

function seedLegacySnapshot(): void {
  localStorage.setItem("noor_store_v1", JSON.stringify({
    state: { ...LEGACY_HADITH_STATE, prefs: {}, reminders: {} },
    version: 24,
  }));
}

function readStoredSnapshot(): { state: Record<string, unknown>; version: number } {
  return JSON.parse(localStorage.getItem("noor_store_v1") ?? "null") as {
    state: Record<string, unknown>;
    version: number;
  };
}

describe("legacy Hadith state migration", () => {
  beforeEach(() => {
    localStorage.clear();
    setAccountStorageOwner("local");
    useNoorStore.setState(useNoorStore.getInitialState(), true);
    migrateHadithStateToIDBMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    setAccountStorageOwner("local");
    useNoorStore.setState(useNoorStore.getInitialState(), true);
  });

  it("keeps the legacy snapshot until the IndexedDB copy completes", async () => {
    seedLegacySnapshot();
    let finishCopy: () => void = () => undefined;
    migrateHadithStateToIDBMock.mockImplementation(() => new Promise<void>((resolve) => {
      finishCopy = resolve;
    }));

    const hydration = hydrateAccountStorageOwner("local");
    await vi.waitFor(() => expect(migrateHadithStateToIDBMock).toHaveBeenCalledOnce());

    try {
      expect(readStoredSnapshot().version).toBe(24);
      expect(readStoredSnapshot().state.hadithNotes).toEqual({ "bukhari:1": "ملاحظة محفوظة" });
    } finally {
      finishCopy();
    }

    await hydration;
    expect(readStoredSnapshot().version).toBe(34);
    expect(migrateHadithStateToIDBMock).toHaveBeenCalledWith({
      bookmarks: LEGACY_HADITH_STATE.hadithBookmarks,
      progress: LEGACY_HADITH_STATE.hadithProgress,
      notes: LEGACY_HADITH_STATE.hadithNotes,
      memoCards: LEGACY_HADITH_STATE.hadithMemoCards,
    });
  });

  it("keeps the legacy snapshot intact when the IndexedDB copy fails", async () => {
    seedLegacySnapshot();
    const failedCopy = Promise.reject(new Error("IndexedDB write failed"));
    // Mark the test double's rejection handled even against the old fire-and-forget caller.
    void failedCopy.catch(() => undefined);
    migrateHadithStateToIDBMock.mockReturnValue(failedCopy);

    await expect(hydrateAccountStorageOwner("local")).rejects.toThrow("IndexedDB write failed");

    expect(readStoredSnapshot().version).toBe(24);
    expect(readStoredSnapshot().state.hadithBookmarks).toEqual({ "bukhari:1": true });
    expect(readStoredSnapshot().state.hadithNotes).toEqual({ "bukhari:1": "ملاحظة محفوظة" });
  });
});
