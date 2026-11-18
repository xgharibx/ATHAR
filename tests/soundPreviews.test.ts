// @vitest-environment jsdom
/**
 * A sound preview is a deliberate tap: it always plays, and a new preview
 * stops the one before it.
 */
import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";

describe("sound previews", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  afterEach(() => vi.restoreAllMocks());

  it("plays the requested reminder preview", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    await playReminderSoundPreview("birds");
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    ctorSpy.mockRestore();
  });

  it("plays the requested prayer preview", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playPrayerSoundPreview } = await import("@/lib/reminders");
    await playPrayerSoundPreview("adhan_ahmad_al_nafees");
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    ctorSpy.mockRestore();
  });

  it("invokes the onDone callback when the preview ends", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    const onDone = vi.fn();
    await playReminderSoundPreview("birds", onDone);
    (ctorSpy.mock.results[0]?.value as HTMLAudioElement).dispatchEvent(new Event("ended"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("stops the previous preview before playing another", async () => {
    const { playReminderSoundPreview, stopSoundPreview } = await import("@/lib/reminders");
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    await playReminderSoundPreview("birds");
    const before = ctorSpy.mock.calls.length;
    await playReminderSoundPreview("birds");
    expect(ctorSpy.mock.calls.length).toBe(before + 1);
    stopSoundPreview();
    ctorSpy.mockRestore();
  });
});
