// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));

import { claimMediaSession, currentMediaOwner, releaseMediaSession, setMediaPlaybackState, updateNowPlaying } from "@/lib/mediaSession";

class FakeMetadata {
  constructor(public init: { title: string; artist?: string; album?: string }) {}
}

const handlers = new Map<string, (() => void) | null>();
const session = {
  metadata: null as FakeMetadata | null,
  playbackState: "none" as MediaSessionPlaybackState,
  setActionHandler: (action: string, handler: (() => void) | null) => handlers.set(action, handler),
};

beforeEach(async () => {
  vi.stubGlobal("MediaMetadata", FakeMetadata);
  Object.defineProperty(navigator, "mediaSession", { configurable: true, value: session });
  handlers.clear();
  await releaseMediaSession("quran");
  await releaseMediaSession("radio");
});

describe("shared media controls", () => {
  it("shows the active player's title and routes its actions", async () => {
    const pause = vi.fn();
    await claimMediaSession("radio", { title: "راديو القرآن الكريم", artist: "إذاعة القرآن الكريم" }, { pause });
    await setMediaPlaybackState("radio", "playing");

    expect(currentMediaOwner()).toBe("radio");
    expect(session.metadata?.init.title).toBe("راديو القرآن الكريم");
    expect(session.playbackState).toBe("playing");
    handlers.get("pause")?.();
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it("does not let a player that lost the controls change or clear them", async () => {
    const radioPause = vi.fn();
    await claimMediaSession("radio", { title: "radio" }, { pause: radioPause });
    await claimMediaSession("quran", { title: "الفاتحة · آية 1" }, { pause: vi.fn() });

    await updateNowPlaying("radio", { title: "stale radio" });
    await setMediaPlaybackState("radio", "paused");
    await releaseMediaSession("radio");

    expect(currentMediaOwner()).toBe("quran");
    expect(session.metadata?.init.title).toBe("الفاتحة · آية 1");
    expect(radioPause).not.toHaveBeenCalled();
  });

  it("removes the controls when the owner stops", async () => {
    await claimMediaSession("quran", { title: "الفاتحة · آية 1" }, { pause: vi.fn() });
    await releaseMediaSession("quran");
    expect(currentMediaOwner()).toBeNull();
    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe("none");
    expect(handlers.get("pause")).toBeNull();
  });
});
