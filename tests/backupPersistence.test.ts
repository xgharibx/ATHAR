// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { hydrateCustomReminders, hydrateHadithState, useNoorStore } from "@/store/noorStore";
import { addCustomDhikrItem, loadPacks, savePacks } from "@/data/packs";
import { loadCustomReminders, saveCustomReminders } from "@/lib/reminderStorage";
import { idbSetHadithNote } from "@/lib/hadithIDB";
import type { CustomReminder } from "@/data/reminderTypes";

const reminder: CustomReminder = {
  id: "restore-reminder", category: "custom", title: "Restored reminder", enabled: true,
  repeat: "daily", atTimeOfDay: "08:00", createdAt: "2026-10-01T08:00:00Z", updatedAt: "2026-10-01T08:00:00Z",
};

describe("complete backup restore", () => {
  beforeEach(async () => {
    localStorage.clear();
    savePacks([]);
    await saveCustomReminders([]);
    useNoorStore.setState({ customReminders: [], hadithBookmarks: {}, hadithProgress: {}, hadithNotes: {}, hadithMemoCards: {}, reviewedPagesToday: [] });
  });

  it("carries the adhkar created in My Adhkar onto a fresh install", async () => {
    addCustomDhikrItem({ text: "My personal dhikr", count: 3 });
    const backup = useNoorStore.getState().exportState();
    savePacks([]);
    await useNoorStore.getState().importState(backup);
    expect(loadPacks()[0]?.sections[0]?.content[0]?.text).toBe("My personal dhikr");
  });

  it("keeps restored custom reminders after startup hydration", async () => {
    const backup = { ...useNoorStore.getState().exportState(), customReminders: [reminder] };
    await useNoorStore.getState().importState(backup);
    useNoorStore.setState({ customReminders: [] });
    await hydrateCustomReminders();
    expect(useNoorStore.getState().customReminders.map((r) => r.id)).toEqual(["restore-reminder"]);
  });

  it("exposes imported hadith notes immediately to readers and the next sync", async () => {
    await useNoorStore.getState().importState({ ...useNoorStore.getState().exportState(), hadithNotes: { "bukhari:1": "Restored note" } });
    expect(useNoorStore.getState().hadithNotes).toEqual({ "bukhari:1": "Restored note" });
    expect(useNoorStore.getState().exportState().hadithNotes).toEqual({ "bukhari:1": "Restored note" });
  });

  it("does not resurrect hadith notes removed from a restored snapshot", async () => {
    await idbSetHadithNote("old:1", "Obsolete note");
    await useNoorStore.getState().importState({ ...useNoorStore.getState().exportState(), hadithNotes: {} });
    await hydrateHadithState();
    expect(useNoorStore.getState().hadithNotes).toEqual({});
  });

  it("restores today's Quran reviewed pages", async () => {
    useNoorStore.setState({ reviewedPagesToday: ["3", "4"] });
    const backup = useNoorStore.getState().exportState();
    useNoorStore.setState({ reviewedPagesToday: [] });
    await useNoorStore.getState().importState(backup);
    expect(useNoorStore.getState().reviewedPagesToday).toEqual(["3", "4"]);
  });

  it("persists companion-created reminders through the store action", async () => {
    useNoorStore.getState().addCustomReminder({ category: "custom", title: "Companion reminder", repeat: "daily", atTimeOfDay: "09:00" });
    // The IDB read is queued after the mutation's immediate write.
    expect((await loadCustomReminders()).map((r) => r.title)).toEqual(["Companion reminder"]);
  });
});
