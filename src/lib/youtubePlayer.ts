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

export type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
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

/** Create a player inside `host`. Returns null if the API is unavailable. */
export async function createPlayer(
  host: HTMLElement,
  opts: CreatePlayerOptions,
): Promise<YTPlayer | null> {
  let YT: YTNamespace;
  try {
    YT = await loadYouTubeApi();
  } catch {
    return null; // caller falls back to a plain embed
  }

  return new Promise<YTPlayer | null>((resolve) => {
    const player = new YT.Player(host, {
      // The privacy-preserving host, matching what the plain embed used.
      host: "https://www.youtube-nocookie.com",
      videoId: opts.videoId,
      playerVars: {
        autoplay: opts.autoplay === false ? 0 : 1,
        // YouTube decides embed permission partly from the requesting origin.
        // Without an explicit one it can refuse with error 152 on some origins
        // and browsers — which is exactly what localhost was hitting while the
        // deployed site played the same clip fine.
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
        enablejsapi: 1,
        mute: opts.muted ? 1 : 0,
        playsinline: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        fs: 0,
        disablekb: 1,
      },
      events: {
        onReady: () => {
          opts.onReady?.(player);
          resolve(player);
        },
        onError: (e: { data: number }) => {
          // Swallowing this left the card frozen on "This video is
          // unavailable" with no way forward. Tell the caller so it can skip.
          opts.onUnplayable?.(e?.data ?? 0);
          resolve(null);
        },
        onStateChange: (e: { data: number }) => {
          opts.onStateChange?.(e.data);
          if (e.data === YT_STATE.ENDED) opts.onEnded?.();
        },
      },
    });
  });
}
