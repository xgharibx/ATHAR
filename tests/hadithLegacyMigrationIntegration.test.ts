// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";
import {
  idbGetAllHadithBookmarks,
  idbGetAllHadithMemoCards,
  idbGetAllHadithNotes,
  idbGetAllHadithProgress,
} from "@/lib/hadithIDB";
import { hydrateAccountStorageOwner, useNoorStore } from "@/store/noorStore";

const LEGACY_STATE = {
  hadithBookmarks: { "bukhari:legacy-migration": true },
  hadithProgress: { bukhari: 42 },
  hadithNotes: { "bukhari:legacy-migration": "ملاحظة محفوظة" },
  hadithMemoCards: {
    "bukhari:legacy-migration": { interval: 4, ease: 2.6, due: "2026-10-08", reviews: 3 },
  },
};

function seedLegacySnapshot(): void {
  localStorage.setItem("noor_store_v1", JSON.stringify({
    state: { ...LEGACY_STATE, prefs: {}, reminders: {} },
    version: 24,
  }));
}

describe("real legacy Hadith migration", () => {
  beforeEach(() => {
    localStorage.clear();
    setAccountStorageOwner("local");
    useNoorStore.setState(useNoorStore.getInitialState(), true);
    seedLegacySnapshot();
  });

  afterEach(() => {
    setAccountStorageOwner("local");
    useNoorStore.setState(useNoorStore.getInitialState(), true);
    localStorage.clear();
  });

  it("copies all four stores before replacing and hydrating the legacy snapshot", async () => {
    await hydrateAccountStorageOwner("local");

    const [bookmarks, progress, notes, memoCards] = await Promise.all([
      idbGetAllHadithBookmarks(),
      idbGetAllHadithProgress(),
      idbGetAllHadithNotes(),
      idbGetAllHadithMemoCards(),
    ]);

    expect(bookmarks).toEqual(LEGACY_STATE.hadithBookmarks);
    expect(progress).toEqual(LEGACY_STATE.hadithProgress);
    expect(notes).toEqual(LEGACY_STATE.hadithNotes);
    expect(memoCards).toEqual(LEGACY_STATE.hadithMemoCards);
    expect(useNoorStore.getState()).toMatchObject({
      hadithBookmarks: LEGACY_STATE.hadithBookmarks,
      hadithProgress: LEGACY_STATE.hadithProgress,
      hadithNotes: LEGACY_STATE.hadithNotes,
      hadithMemoCards: LEGACY_STATE.hadithMemoCards,
    });

    const saved = JSON.parse(localStorage.getItem("noor_store_v1") ?? "null") as {
      state: Record<string, unknown>;
      version: number;
    };
    expect(saved.version).toBe(33);
    expect(saved.state).not.toHaveProperty("hadithNotes");
  });
});
