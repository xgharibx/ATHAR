// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";

import { setAccountStorageOwner } from "@/lib/accountStorageScope";
import { idbGetAllHadithBookmarks, idbSetHadithBookmark } from "@/lib/hadithIDB";

describe("Hadith personal IndexedDB scope", () => {
  afterEach(() => setAccountStorageOwner("local"));

  it("isolates bookmarks by owner while keeping legacy local bookmarks local", async () => {
    const ownerA = `user:hadith-test-a-${crypto.randomUUID()}`;
    const ownerB = `user:hadith-test-b-${crypto.randomUUID()}`;

    setAccountStorageOwner("local");
    await idbSetHadithBookmark("legacy-book:1", true);
    setAccountStorageOwner(ownerA);
    await idbSetHadithBookmark("private-book:2", true);
    setAccountStorageOwner(ownerB);
    expect(await idbGetAllHadithBookmarks()).toEqual({});
    await idbSetHadithBookmark("other-private-book:3", true);

    setAccountStorageOwner(ownerA);
    expect(await idbGetAllHadithBookmarks()).toEqual({ "private-book:2": true });
    setAccountStorageOwner("local");
    expect(await idbGetAllHadithBookmarks()).toEqual({ "legacy-book:1": true });
  });
});
