// @vitest-environment jsdom
/**
 * Where a reader lands when they come back.
 *
 * Resuming is only right while there is something to resume INTO. Being
 * returned to the fifth dhikr is helpful when the first four are counted, and
 * plainly wrong when every counter reads zero — the section has been started
 * over, and the reader is being dropped into the middle of it.
 *
 * There is more than one way for that to happen: the Fajr reset, تصفير, the
 * danger-zone wipe, or a reset arriving from another device. Rather than teach
 * every one of those to clear the bookmark, the rule is the same for all of
 * them — no progress, no resume.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { getIbadahDateKey } from "@/lib/dayBoundaries";

const FAJR = "04:30";

const SECTION = "morning";
const DAY = "2026-09-06";

/** The check the list makes on the way in, kept in one place. */
function wouldResume(opts: { dayKey: string; progressKeys: Record<string, number> }): boolean {
  const saved = useNoorStore.getState().sectionResume[SECTION];
  if (!saved || saved.dayKey !== opts.dayKey) return false;
  return Object.entries(opts.progressKeys).some(
    ([k, v]) => k.startsWith(`${SECTION}:`) && v > 0,
  );
}

beforeEach(() => {
  // The day markers matter: resetSection runs ensureDailyResets first, and with
  // no marker set that clears every section rather than the one asked for —
  // which would make this file pass or fail for the wrong reason.
  const today = getIbadahDateKey(new Date(), FAJR);
  useNoorStore.setState({
    sectionResume: {},
    progress: {},
    lastKnownFajrTime: FAJR,
    lastIbadahResetISO: today,
    lastCivilResetISO: today,
  });
});

describe("resuming", () => {
  it("returns the reader to where they were", () => {
    useNoorStore.getState().setSectionResume(SECTION, 5, DAY);
    expect(wouldResume({ dayKey: DAY, progressKeys: { "morning:0": 3 } })).toBe(true);
  });

  it("starts at the top the next day", () => {
    useNoorStore.getState().setSectionResume(SECTION, 5, "2026-09-05");
    expect(wouldResume({ dayKey: DAY, progressKeys: { "morning:0": 3 } })).toBe(false);
  });

  it("starts at the top when nothing has been counted", () => {
    // The reported case: reach the fifth dhikr, press تصفير, come back — and
    // land on the fifth again with every counter at zero.
    useNoorStore.getState().setSectionResume(SECTION, 5, DAY);
    expect(wouldResume({ dayKey: DAY, progressKeys: {} })).toBe(false);
    expect(wouldResume({ dayKey: DAY, progressKeys: { "morning:0": 0 } })).toBe(false);
  });

  it("ignores another section's progress", () => {
    useNoorStore.getState().setSectionResume(SECTION, 5, DAY);
    expect(wouldResume({ dayKey: DAY, progressKeys: { "evening:0": 9 } })).toBe(false);
  });
});

describe("the resets clear it outright", () => {
  it("تصفير on a section drops that section's position", () => {
    useNoorStore.setState({ progress: { "morning:0": 4, "evening:0": 2 } });
    useNoorStore.getState().setSectionResume(SECTION, 5, DAY);
    useNoorStore.getState().setSectionResume("evening", 2, DAY);

    useNoorStore.getState().resetSection(SECTION);

    expect(useNoorStore.getState().sectionResume[SECTION]).toBeUndefined();
    // …and leaves other sections alone.
    expect(useNoorStore.getState().sectionResume.evening).toEqual({ index: 2, dayKey: DAY });
    expect(useNoorStore.getState().progress["morning:0"]).toBeUndefined();
    expect(useNoorStore.getState().progress["evening:0"]).toBe(2);
  });

  it("the full adhkar reset drops every position", () => {
    useNoorStore.getState().setSectionResume(SECTION, 5, DAY);
    useNoorStore.getState().setSectionResume("evening", 2, DAY);
    useNoorStore.getState().resetAdhkarProgress();
    expect(useNoorStore.getState().sectionResume).toEqual({});
  });
});
