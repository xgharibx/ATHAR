// @vitest-environment jsdom
/**
 * Pass A — `prefs.enableSounds` gates every sound preview produced by the
 * reminders module. Settings already exposes the toggle, but no consumer
 * was reading it, so preview sounds would play even after the user muted
 * athar. These tests pin the new behaviour.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useNoorStore } from "@/store/noorStore";

describe("prefs.enableSounds audio gate (Pass A)", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    // Default the user preference explicitly so the test is order-independent.
    useNoorStore.setState((s) => ({
      prefs: { ...s.prefs, enableSounds: false },
    }));
  });

  it("does NOT construct an HTMLAudioElement when enableSounds is false", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    await playReminderSoundPreview("rain_calm");
    expect(ctorSpy).not.toHaveBeenCalled();
    ctorSpy.mockRestore();
  });

  it("does NOT construct an HTMLAudioElement when enableSounds is false for prayer sound", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playPrayerSoundPreview } = await import("@/lib/reminders");
    await playPrayerSoundPreview("adhan_haram");
    expect(ctorSpy).not.toHaveBeenCalled();
    ctorSpy.mockRestore();
  });

  it("invokes the onDone callback even when audio is muted (so UI can stop its spinner)", async () => {
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    const onDone = vi.fn();
    await playReminderSoundPreview("rain_calm", onDone);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("DOES construct an HTMLAudioElement when enableSounds is true", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, enableSounds: true } }));
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playReminderSoundPreview } = await import("@/lib/reminders");
    await playReminderSoundPreview("rain_calm");
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    ctorSpy.mockRestore();
  });

  it("also blocks the prayer-sound preview when enableSounds is off", async () => {
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    const { playPrayerSoundPreview } = await import("@/lib/reminders");
    await playPrayerSoundPreview("adhan_haram");
    expect(ctorSpy).not.toHaveBeenCalled();
    ctorSpy.mockRestore();
  });

  it("stops a previously-playing preview if a muted preview is requested after", async () => {
    const { playReminderSoundPreview, stopSoundPreview } = await import("@/lib/reminders");
    // First play (enabled) — store starts the audio element
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, enableSounds: true } }));
    const ctorSpy = vi.spyOn(globalThis, "Audio");
    await playReminderSoundPreview("rain_calm");
    expect(ctorSpy).toHaveBeenCalled();
    // Then disable — next call must short-circuit without creating new audio
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, enableSounds: false } }));
    const before = ctorSpy.mock.calls.length;
    await playReminderSoundPreview("rain_calm");
    expect(ctorSpy.mock.calls.length).toBe(before);
    stopSoundPreview();
    ctorSpy.mockRestore();
  });
});