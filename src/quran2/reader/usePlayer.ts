/**
 * «القرآن ٢» — the reader's player: one whole-surah recitation, with the
 * reciter's word timings telling which word is being said.
 *
 * Two backends behind one logic:
 *  - web: an audio element, read every frame;
 *  - phone: the app's native player (AVPlayer / ExoPlayer), so the recitation
 *    carries on with the screen locked, with lock-screen and headphone
 *    controls; its position is read several times a second while the app is
 *    on screen, and the highlight picks up again when it comes back.
 *
 * The current word does not go through React state: the reader's text can be
 * thousands of words, so the highlight is moved on the DOM directly (onWord),
 * and React only hears when the ayah changes.
 */
import * as React from "react";
import { locate, wordSpan, type Q2SurahTiming } from "../data/timings";
import { hasNativeRecitation, nativePlaybackPosition, nativeSeek, startNativeRecitation, type NativeRecitationSession } from "@/lib/nativeRecitation";

export type RepeatMode = 0 | 3 | -1; // off، three times، until stopped

export type PlayerView = {
  playing: boolean;
  waiting: boolean;
  ayah: number | null;
  rate: number;
  repeat: RepeatMode;
  error: boolean;
  /** Playing through the phone's own player (background and lock screen). */
  native: boolean;
};

type Backend = {
  play(fromMs?: number): Promise<void>;
  pause(): void;
  seek(ms: number): void;
  setRate(rate: number): void;
  playing(): boolean;
  dispose(): void;
};

export function useQ2Player(options: {
  timing: Q2SurahTiming | undefined;
  title: string;
  artist: string;
  onWord: (ayah: number | null, word: number | null) => void;
}) {
  const { timing, title, artist, onWord } = options;
  const stopAt = React.useRef<number | null>(null);
  const repeatLeft = React.useRef<{ ayah: number; left: number } | null>(null);
  const last = React.useRef<{ a: number | null; w: number | null; ms: number }>({ a: null, w: null, ms: 0 });
  const onWordRef = React.useRef(onWord);
  const timingRef = React.useRef(timing);
  const meta = React.useRef({ title, artist });
  const [view, setView] = React.useState<PlayerView>({
    playing: false, waiting: false, ayah: null, rate: 1, repeat: 0, error: false, native: hasNativeRecitation(),
  });
  const viewRef = React.useRef(view);
  const [progress, setProgress] = React.useState(0);
  const backend = React.useRef<Backend | null>(null);

  React.useLayoutEffect(() => {
    onWordRef.current = onWord;
    timingRef.current = timing;
    viewRef.current = view;
    meta.current = { title, artist };
  });

  /** Everything that follows from where the recitation is: shared by both backends. */
  const onPosition = React.useCallback((ms: number) => {
    const t = timingRef.current;
    const b = backend.current;
    if (!t || !b) return;
    last.current.ms = ms;
    if (stopAt.current != null && ms >= stopAt.current) {
      // A single word was asked for: stop on it, with it still marked.
      stopAt.current = null;
      b.pause();
      return;
    }
    const rep = repeatLeft.current;
    if (rep) {
      const verse = t.verses.find((v) => v.a === rep.ayah);
      if (verse && ms >= verse.to - 40) {
        if (rep.left !== 0) {
          if (rep.left > 0) rep.left -= 1;
          b.seek(verse.from);
          return;
        }
        repeatLeft.current = null;
      }
    }
    const where = locate(t, ms);
    const a = where?.a ?? last.current.a;
    const w = where?.w ?? null;
    if (a !== last.current.a || w !== last.current.w) {
      const ayahChanged = a !== last.current.a;
      last.current.a = a;
      last.current.w = w;
      onWordRef.current(a, w);
      if (ayahChanged) {
        setView((v) => ({ ...v, ayah: a }));
        const mode = viewRef.current.repeat;
        if (a != null && mode !== 0 && repeatLeft.current?.ayah !== a) repeatLeft.current = { ayah: a, left: mode === -1 ? -1 : mode - 1 };
      }
    }
    setProgress(t.durationMs ? ms / t.durationMs : 0);
  }, []);

  const onEnded = React.useCallback(() => {
    last.current = { a: null, w: null, ms: 0 };
    onWordRef.current(null, null);
    setView((v) => ({ ...v, ayah: null, playing: false, waiting: false }));
  }, []);

  // The web backend: an audio element read every frame.
  const makeWebBackend = React.useCallback((): Backend => {
    const audio = new Audio();
    audio.preload = "none";
    let frame = 0;
    const loop = () => {
      onPosition(audio.currentTime * 1000);
      frame = requestAnimationFrame(loop);
    };
    audio.addEventListener("play", () => {
      setView((v) => ({ ...v, playing: true, error: false }));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    });
    audio.addEventListener("pause", () => {
      setView((v) => ({ ...v, playing: false, waiting: false }));
      cancelAnimationFrame(frame);
    });
    audio.addEventListener("waiting", () => setView((v) => ({ ...v, waiting: true })));
    audio.addEventListener("playing", () => setView((v) => ({ ...v, waiting: false })));
    audio.addEventListener("error", () => setView((v) => ({ ...v, playing: false, waiting: false, error: true })));
    audio.addEventListener("ended", onEnded);
    return {
      async play(fromMs) {
        const t = timingRef.current;
        if (!t) return;
        if (audio.src !== t.audioUrl) audio.src = t.audioUrl;
        if (fromMs != null) audio.currentTime = fromMs / 1000;
        audio.playbackRate = viewRef.current.rate;
        try {
          await audio.play();
        } catch {
          setView((v) => ({ ...v, error: true }));
        }
      },
      pause: () => audio.pause(),
      seek: (ms) => {
        audio.currentTime = ms / 1000;
      },
      setRate: (rate) => {
        audio.playbackRate = rate;
      },
      playing: () => !audio.paused,
      dispose() {
        cancelAnimationFrame(frame);
        audio.pause();
        audio.removeAttribute("src");
      },
    };
  }, [onPosition, onEnded]);

  // The phone backend: the native player, polled while the page is on screen.
  const makeNativeBackend = React.useCallback((): Backend => {
    let session: NativeRecitationSession | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    let active = false;
    // After a jump the player can still report the old place for a moment:
    // those readings are skipped, so a repeat is not counted twice.
    let seekTarget: number | null = null;
    let seekDeadline = 0;
    const jump = (ms: number) => {
      seekTarget = ms;
      seekDeadline = Date.now() + 1200;
      return nativeSeek(ms);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = undefined;
    };
    const startPolling = () => {
      stopPolling();
      poll = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void nativePlaybackPosition().then((pos) => {
          if (!pos || !active) return;
          if (seekTarget != null) {
            if (Math.abs(pos.positionMs - seekTarget) > 1500 && Date.now() < seekDeadline) return;
            seekTarget = null;
          }
          onPosition(pos.positionMs);
        });
      }, 120);
    };
    const end = () => {
      active = false;
      stopPolling();
      const s = session;
      session = null;
      s?.pause();
    };
    return {
      async play(fromMs) {
        const t = timingRef.current;
        if (!t) return;
        const start = fromMs ?? last.current.ms;
        if (session && active) {
          // Paused from the lock screen or headphones: carry on from there.
          if (fromMs != null) await jump(fromMs);
          if (session.paused) session.resume();
          return;
        }
        setView((v) => ({ ...v, waiting: true, error: false }));
        session = await startNativeRecitation(
          {
            verses: [{ id: `q2:${t.audioUrl}`, url: t.audioUrl, title: meta.current.title, artist: meta.current.artist, album: "القرآن ٢ — أثر" }],
            startIndex: 0,
            rate: viewRef.current.rate,
            volume: 1,
            repeat: "none",
            startPositionMs: start > 0 ? start : undefined,
          },
          {
            onVerse: () => {},
            onState: (state) => {
              setView((v) => ({ ...v, playing: state === "playing" || state === "buffering", waiting: state === "buffering" }));
            },
            onEnded: () => {
              active = false;
              session = null;
              stopPolling();
              onEnded();
            },
            onError: () => setView((v) => ({ ...v, error: true, playing: false, waiting: false })),
            onInterrupted: () => {
              // The radio or another recitation took the player.
              active = false;
              session = null;
              stopPolling();
              setView((v) => ({ ...v, playing: false, waiting: false }));
            },
          },
        );
        if (!session) {
          // An app build from before the native player: use the web one.
          backend.current = makeWebBackend();
          setView((v) => ({ ...v, native: false }));
          await backend.current.play(start);
          return;
        }
        active = true;
        setView((v) => ({ ...v, playing: true }));
        startPolling();
      },
      pause() {
        end();
        setView((v) => ({ ...v, playing: false, waiting: false }));
      },
      seek: (ms) => {
        void jump(ms);
      },
      setRate: (rate) => session?.setRate(rate),
      playing: () => active && !session?.paused,
      dispose: end,
    };
  }, [onPosition, onEnded, makeWebBackend]);

  React.useEffect(() => {
    backend.current = hasNativeRecitation() ? makeNativeBackend() : makeWebBackend();
    return () => {
      backend.current?.dispose();
      backend.current = null;
    };
  }, [makeNativeBackend, makeWebBackend]);

  // A new surah or reciter: start from the beginning next time.
  React.useEffect(() => {
    if (!timing) return;
    backend.current?.pause();
    last.current = { a: null, w: null, ms: 0 };
  }, [timing]);

  React.useEffect(() => {
    if (!("mediaSession" in navigator) || !view.playing || view.native) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: "القرآن ٢ — أثر" });
    } catch {
      // Not supported here.
    }
  }, [title, artist, view.playing, view.native]);

  const api = React.useMemo(() => ({
    toggle() {
      const b = backend.current;
      if (!b) return;
      if (b.playing()) b.pause();
      else void b.play();
    },
    playFrom(ayah: number) {
      const verse = timingRef.current?.verses.find((v) => v.a === ayah);
      stopAt.current = null;
      repeatLeft.current = null;
      if (verse) void backend.current?.play(verse.from);
    },
    /** Say one word in the reciter's voice, then stop. */
    playWord(ayah: number, word: number) {
      const t = timingRef.current;
      const span = t ? wordSpan(t, ayah, word) : null;
      if (!span) return false;
      repeatLeft.current = null;
      stopAt.current = span[1] + 60;
      void backend.current?.play(Math.max(0, span[0] - 20));
      return true;
    },
    step(delta: 1 | -1) {
      const t = timingRef.current;
      const current = last.current.a ?? viewRef.current.ayah ?? 0;
      const target = t?.verses.find((v) => v.a === current + delta);
      if (target) {
        repeatLeft.current = null;
        void backend.current?.play(target.from);
      }
    },
    setRate(rate: number) {
      backend.current?.setRate(rate);
      setView((v) => ({ ...v, rate }));
    },
    setRepeat(repeat: RepeatMode) {
      repeatLeft.current = null;
      setView((v) => ({ ...v, repeat }));
      const a = last.current.a;
      if (a != null && repeat !== 0) repeatLeft.current = { ayah: a, left: repeat === -1 ? -1 : repeat - 1 };
    },
    pause() {
      backend.current?.pause();
    },
  }), []);

  return { view, progress, ...api };
}
