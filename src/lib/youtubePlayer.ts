/**
 * A thin wrapper over YouTube's IFrame Player API.
 *
 * A plain `<iframe src=…>` embed can be shown and nothing more: you cannot ask
 * it where it is, pause it, or learn that it ended. That is the whole gap
 * between a video on a page and a feed — auto-advance, a progress bar and
 * tap-to-pause all need the real player object.
 *
 * The API script is a singleton loaded once and shared; loading it per card
 * would fetch it dozens of times over a session.
 */

import { Capacitor } from "@capacitor/core";

export type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
  getPlayerState: () => number;
};

/** YT.PlayerState, inlined so callers need no global types. */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

type YTNamespace = {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer;
};

let loader: Promise<YTNamespace> | null = null;

/** Load (once) and resolve with the YT namespace. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (loader) return loader;

  loader = new Promise<YTNamespace>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    const w = window as unknown as { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }

    // The API calls this global exactly once when it is ready. Chain any
    // handler that already exists so we never stomp another consumer.
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (w.YT?.Player) resolve(w.YT);
      else reject(new Error("YT namespace missing after ready"));
    };

    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.dataset.ytIframeApi = "1";
      s.onerror = () => reject(new Error("could not load the YouTube API"));
      document.head.appendChild(s);
    }

    // Offline or blocked: fail rather than hang the caller forever.
    window.setTimeout(() => reject(new Error("YouTube API timed out")), 12_000);
  }).catch((e) => {
    loader = null; // let a later attempt retry
    throw e;
  });

  return loader;
}

export type CreatePlayerOptions = {
  videoId: string;
  muted: boolean;
  /** Start playing immediately. False builds the player and cues the video
   *  without playing it — how the next clip is warmed up before it is reached,
   *  so arriving at it is instant instead of a cold ~400 ms start. */
  autoplay?: boolean;
  onEnded?: () => void;
  onStateChange?: (state: number) => void;
  onReady?: (player: YTPlayer) => void;
  /** The video cannot play here at all — deleted, private, region-locked, or
   *  embedding disabled by its owner. The feed must move on rather than sit on
   *  YouTube's error screen. */
  onUnplayable?: (code: number) => void;
};

/* ─── The apps play through athark.org ──────────────────────────────────────
   YouTube refuses an embedded player whose page sends no referrer it accepts,
   and the apps' pages have none (capacitor://localhost on iPhone): the player
   showed "Error 153" instead of the video. In the apps the player is held by
   a page on athark.org (public/embed/youtube.html), which YouTube accepts;
   BridgedPlayer below drives it with the same controls the YouTube player
   has, so every caller works unchanged. In a browser nothing changes. */

export const PLAYER_PAGE = "https://www.athark.org/embed/youtube.html";
const PLAYER_ORIGIN = new URL(PLAYER_PAGE).origin;

/** True where videos play through the athark.org player page (the apps). */
export function playsThroughAtharPage(): boolean {
  return Capacitor.isNativePlatform();
}

type PlayerVars = Record<string, string | number>;

/** The address of a plain embedded player, for when no controls are needed. */
export function embedSrc(videoId: string, vars: PlayerVars): string {
  if (playsThroughAtharPage()) {
    return `${PLAYER_PAGE}?v=${encodeURIComponent(videoId)}&vars=${encodeURIComponent(JSON.stringify(vars))}`;
  }
  const params = new URLSearchParams(Object.entries(vars).map(([key, value]) => [key, String(value)]));
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export type PlayerEvents = {
  onReady?: (event: { target: YTPlayer }) => void;
  onStateChange?: (event: { data: number; target: YTPlayer }) => void;
  onError?: (event: { data: number; target: YTPlayer }) => void;
};

type BridgeMessage = { source?: string; type?: string; time?: number; duration?: number; state?: number; code?: number };

/** The YouTube player held by the athark.org page, driven by messages. */
export class BridgedPlayer implements YTPlayer {
  private readonly frame: HTMLIFrameElement;
  private readonly listener: (event: MessageEvent) => void;
  private state: number = YT_STATE.UNSTARTED;
  private time = 0;
  private duration = 0;
  private reportedAt = 0;
  private ready = false;
  private readonly pending: Array<[string, Array<number | boolean>]> = [];

  constructor(host: HTMLElement, videoId: string, vars: PlayerVars, events: PlayerEvents = {}) {
    const frame = document.createElement("iframe");
    frame.src = embedSrc(videoId, vars);
    frame.title = "YouTube";
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.setAttribute("allowfullscreen", "");
    frame.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0";
    host.appendChild(frame);
    this.frame = frame;
    this.listener = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== PLAYER_ORIGIN) return;
      const data = event.data as BridgeMessage;
      if (!data || data.source !== "athar-yt") return;
      if (typeof data.time === "number") {
        this.time = data.time;
        this.reportedAt = performance.now();
      }
      if (typeof data.duration === "number" && data.duration > 0) this.duration = data.duration;
      const previous = this.state;
      if (typeof data.state === "number") this.state = data.state;
      if (data.type === "ready" && !this.ready) {
        this.ready = true;
        for (const [cmd, args] of this.pending.splice(0)) this.post(cmd, args);
        events.onReady?.({ target: this });
      } else if (data.type === "error") {
        events.onError?.({ data: data.code ?? 0, target: this });
      }
      if (this.state !== previous && data.type !== "ready") events.onStateChange?.({ data: this.state, target: this });
    };
    window.addEventListener("message", this.listener);
  }

  private post(cmd: string, args: Array<number | boolean>): void {
    this.frame.contentWindow?.postMessage({ source: "athar-yt-cmd", cmd, args }, PLAYER_ORIGIN);
  }

  private command(cmd: string, args: Array<number | boolean> = []): void {
    if (this.ready) this.post(cmd, args);
    else this.pending.push([cmd, args]);
  }

  playVideo(): void { this.command("playVideo"); }
  pauseVideo(): void { this.command("pauseVideo"); }
  mute(): void { this.command("mute"); }
  unMute(): void { this.command("unMute"); }
  seekTo(seconds: number, allowSeekAhead = true): void {
    this.time = seconds;
    this.reportedAt = performance.now();
    this.command("seekTo", [seconds, allowSeekAhead]);
  }
  getCurrentTime(): number {
    // The page reports twice a second; between reports, a playing video moves on.
    const drift = this.state === YT_STATE.PLAYING ? (performance.now() - this.reportedAt) / 1000 : 0;
    return this.duration > 0 ? Math.min(this.duration, this.time + drift) : this.time + drift;
  }
  getDuration(): number { return this.duration; }
  getPlayerState(): number { return this.state; }
  destroy(): void {
    window.removeEventListener("message", this.listener);
    this.frame.remove();
  }
}

/**
 * A YouTube player in `host`: YouTube's own in a browser, the athark.org one
 * in the apps. Same controls and the same events either way.
 */
export async function newYouTubePlayer(host: HTMLElement, videoId: string, vars: PlayerVars, events: PlayerEvents = {}): Promise<YTPlayer> {
  if (playsThroughAtharPage()) return new BridgedPlayer(host, videoId, vars, events);
  const YT = await loadYouTubeApi();
  let player: YTPlayer | null = null;
  const withTarget = <E extends object>(handler: ((event: E & { target: YTPlayer }) => void) | undefined) =>
    handler ? (event: E) => handler({ ...event, target: player! }) : undefined;
  player = new YT.Player(host, {
    // The privacy-preserving host, matching what the plain embed used.
    host: "https://www.youtube-nocookie.com",
    videoId,
    playerVars: {
      ...vars,
      // YouTube decides embed permission partly from the requesting origin.
      // Without an explicit one it can refuse with error 152 on some origins
      // and browsers — which is exactly what localhost was hitting while the
      // deployed site played the same clip fine.
      origin: window.location.origin,
      enablejsapi: 1,
    },
    events: {
      onReady: withTarget(events.onReady),
      onStateChange: withTarget(events.onStateChange),
      onError: withTarget(events.onError),
    },
  });
  return player;
}

/** Create a player inside `host`. Returns null if the API is unavailable. */
export async function createPlayer(
  host: HTMLElement,
  opts: CreatePlayerOptions,
): Promise<YTPlayer | null> {
  return new Promise<YTPlayer | null>((resolve) => {
    newYouTubePlayer(host, opts.videoId, {
      autoplay: opts.autoplay === false ? 0 : 1,
      mute: opts.muted ? 1 : 0,
      playsinline: 1,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
    }, {
      onReady: ({ target }) => {
        opts.onReady?.(target);
        resolve(target);
      },
      onError: ({ data }) => {
        // Swallowing this left the card frozen on "This video is
        // unavailable" with no way forward. Tell the caller so it can skip.
        opts.onUnplayable?.(data ?? 0);
        resolve(null);
      },
      onStateChange: ({ data }) => {
        opts.onStateChange?.(data);
        if (data === YT_STATE.ENDED) opts.onEnded?.();
      },
    }).catch(() => resolve(null)); // caller falls back to a plain embed
  });
}

/**
 * Start fetching the API before anyone asks for a player.
 *
 * `loadYouTubeApi` is already a shared singleton, so calling this early simply
 * means the promise is further along by the time a card needs it. Swallows its
 * own failure: a head start that fails must behave exactly like never having
 * been attempted, and the real call site retries on its own.
 */
export function warmYouTubeApi(): void {
  void loadYouTubeApi().catch(() => undefined);
}
