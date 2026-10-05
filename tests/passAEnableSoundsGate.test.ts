// @vitest-environment jsdom
/**
 * A preview is a deliberate user action and must play even when notification
 * sounds are disabled. Muting scheduled sounds must not make preview buttons
 * silently do nothing.
 */
import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
import { useNoorStore } from "@/store/noorStore";

describe("sound previews are independent of notification sound settings", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    try { localStorage.clear(); } catch { /* ignore */ }
    // Default the user preference explicitly so the test is order-independent.
    useNoorStore.setState((s) => ({
      prefs: { ...s.prefs, enableSounds: false },
    }));
  });

  afterEach(() => vi.restoreAllMocks());

  it("plays the requested reminder preview when enableSounds is false", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    await playReminderSoundPreview("birds");
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    ctorSpy.mockRestore();
  });

  it("plays the requested prayer preview when enableSounds is false", async () => {
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

  it("DOES construct an HTMLAudioElement when enableSounds is true", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, enableSounds: true } }));
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    await playReminderSoundPreview("birds");
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    ctorSpy.mockRestore();
  });

  it("stops the previous preview before playing another with sounds disabled", async () => {
    const { playReminderSoundPreview, stopSoundPreview } = await import("@/lib/reminders");
    // First play (enabled) — store starts the audio element
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, enableSounds: true } }));
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    await playReminderSoundPreview("birds");
    expect(ctorSpy).toHaveBeenCalled();
    // Then disable — an explicit preview click still plays the new selection
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, enableSounds: false } }));
    const before = ctorSpy.mock.calls.length;
    await playReminderSoundPreview("birds");
    expect(ctorSpy.mock.calls.length).toBe(before + 1);
    stopSoundPreview();
    ctorSpy.mockRestore();
  });
});
