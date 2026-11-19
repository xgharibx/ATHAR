// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));

import { BridgedPlayer, PLAYER_PAGE, YT_STATE, embedSrc, newYouTubePlayer } from "@/lib/youtubePlayer";

function fromPage(frame: HTMLIFrameElement, data: Record<string, unknown>, origin = "https://www.athark.org") {
  window.dispatchEvent(new MessageEvent("message", { data: { source: "athar-yt", ...data }, origin, source: frame.contentWindow }));
}

describe("videos in the apps play through athark.org", () => {
  it("points every player at the athark.org page, never at YouTube directly", () => {
    expect(embedSrc("7IkPGkdpw4o", { autoplay: 1, mute: 1 })).toBe(`${PLAYER_PAGE}?v=7IkPGkdpw4o&vars=${encodeURIComponent('{"autoplay":1,"mute":1}')}`);
  });

  it("drives the page's player with the same controls and events as YouTube's", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onReady = vi.fn();
    const onStateChange = vi.fn();
    const onError = vi.fn();
    const player = await newYouTubePlayer(host, "7IkPGkdpw4o", { controls: 0 }, { onReady, onStateChange, onError });
    expect(player).toBeInstanceOf(BridgedPlayer);
    const frame = host.querySelector("iframe")!;
    expect(frame.src.startsWith(PLAYER_PAGE)).toBe(true);
    const sent = vi.spyOn(frame.contentWindow!, "postMessage");

    // Commands given before the page is ready wait for it.
    player.seekTo(42, true);
    expect(sent).not.toHaveBeenCalled();
    fromPage(frame, { type: "ready", time: 0, duration: 109, state: YT_STATE.CUED });
    expect(onReady).toHaveBeenCalledWith({ target: player });
    expect(sent).toHaveBeenCalledWith({ source: "athar-yt-cmd", cmd: "seekTo", args: [42, true] }, "https://www.athark.org");
    expect(player.getDuration()).toBe(109);

    fromPage(frame, { type: "state", time: 42, duration: 109, state: YT_STATE.PLAYING });
    expect(onStateChange).toHaveBeenCalledWith({ data: YT_STATE.PLAYING, target: player });
    expect(player.getPlayerState()).toBe(YT_STATE.PLAYING);
    expect(player.getCurrentTime()).toBeGreaterThanOrEqual(42);

    fromPage(frame, { type: "error", code: 150 });
    expect(onError).toHaveBeenCalledWith({ data: 150, target: player });

    player.destroy();
    expect(host.querySelector("iframe")).toBeNull();
  });

  it("ignores messages that do not come from its own page", async () => {
    const host = document.createElement("div");
    const onReady = vi.fn();
    const player = await newYouTubePlayer(host, "7IkPGkdpw4o", {}, { onReady });
    const frame = host.querySelector("iframe")!;
    fromPage(frame, { type: "ready", duration: 5 }, "https://evil.example");
    window.dispatchEvent(new MessageEvent("message", { data: { source: "athar-yt", type: "ready" }, origin: "https://www.athark.org", source: window }));
    expect(onReady).not.toHaveBeenCalled();
    player.destroy();
  });
});

describe("the athark.org player page", () => {
  const script = fs.readFileSync("public/embed/youtube.js", "utf8");
  it("accepts only playback commands, from the page that holds it", () => {
    expect(script).toContain('var COMMANDS = { playVideo: 1, pauseVideo: 1, seekTo: 1, mute: 1, unMute: 1 };');
    expect(script).toContain("if (event.source !== app) return;");
  });
  it("passes only known player settings and a well-formed video id", () => {
    expect(script).toMatch(/\/\^\[A-Za-z0-9_-\]\{6,20\}\$\/\.test\(id\)/);
    expect(script).toContain("ALLOWED_VARS");
  });
  it("is allowed as a frame in the app", () => {
    expect(fs.readFileSync("tools/build/hardenHtml.ts", "utf8")).toMatch(/"frame-src", \[[^\]]*"https:\/\/www\.athark\.org"/);
  });
});

it("is never replaced by the website's offline app shell", () => {
  expect(fs.readFileSync("src/sw.ts", "utf8")).toMatch(/denylist: \[[^\]]*\/\^\\\/embed\\\/\//);
});
