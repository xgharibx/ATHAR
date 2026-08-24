/**
 * Shorts — a full-screen vertical feed.
 *
 * The experience lives or dies on two things, and neither is visual:
 *
 * 1. **Only three players exist at a time.** One iframe per video would put
 *    hundreds of YouTube players in the DOM; the tab runs out of memory and
 *    scrolling stutters long before that. Previous / current / next get a real
 *    player, everything else is a plain poster image of identical size — so the
 *    scroller's geometry never changes and nothing shifts under a thumb
 *    mid-swipe.
 *
 * 2. **Snapping is CSS, not JavaScript.** `scroll-snap-type: y mandatory` runs
 *    on the compositor, so it stays smooth while React is busy. Driving snap
 *    from a scroll handler is exactly what makes home-made feeds feel heavy.
 *
 * The active index comes from an IntersectionObserver rather than scroll maths:
 * it is correct during momentum scrolling, where scrollTop-based guesses lag
 * behind the finger.
 *
 * No comments, no counts, no follower graph — one gesture that matters, which
 * is the like, and it reuses the favourites that already sync to the account.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Volume2, VolumeX, X, Play, Pause, Share2, EyeOff } from "lucide-react";

import { useShortsDB } from "@/data/useShortsDB";
import { useNoorStore, type ShortsChannelStat } from "@/store/noorStore";
import { buildShortsFeed, posterFor, type Short } from "@/lib/shortsFeed";
import { createPlayer, YT_STATE, type YTPlayer } from "@/lib/youtubePlayer";
import { shareText } from "@/lib/shareTargets";

/** How many neighbours around the active card get a real player. */
/** How far either side of the viewer a card still paints its poster. */
const WINDOW = 2;

/**
 * How far either side of the viewer a card is rendered at all.
 *
 * The slot itself always exists — it is what gives the scroller its height and
 * its snap points, and it is a single empty div. The card inside it is about
 * thirty nodes, which at 1,500 slots measured 53,000 nodes and a 96 MB heap on
 * a desktop, and would keep climbing for as long as someone kept scrolling.
 * Four either side is comfortably more than a snap-scroll can cross before
 * React catches up.
 */
const RENDER_WINDOW = 4;

/** How many clips to rank at a time, and how close to the end to extend. */
const PAGE_SIZE = 300;
const EXTEND_WITHIN = 12;

/**
 * Sound is a per-device choice — headphones on the phone, silent on the
 * tablet — so it lives in localStorage rather than syncing with the account.
 * It still has to open muted the very first time: browsers refuse to autoplay
 * with sound, and a feed whose first clip silently fails to start is worse
 * than one that starts quiet.
 */
const MUTE_KEY = "noor_shorts_muted_v1";

const NO_HIDDEN: Record<string, boolean> = {};

function readMutePreference(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) !== "0";
  } catch {
    return true;
  }
}

function embedUrl(id: string, muted: boolean) {
  const p = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    playsinline: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    loop: "1",
    playlist: id, // `loop` needs an explicit playlist to repeat a single video
    iv_load_policy: "3",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}

function ShortCard({
  short,
  active,
  preload,
  mounted,
  muted,
  liked,
  onToggleLike,
  onToggleMute,
  onEnded,
  unplayable,
  onUnplayable,
  hidden,
  onHideChannel,
  onWatched,
}: {
  short: Short;
  active: boolean;
  /** Build the player ahead of time, without playing it. */
  preload: boolean;
  mounted: boolean;
  muted: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onToggleMute: () => void;
  onEnded: () => void;
  unplayable: boolean;
  onUnplayable: () => void;
  hidden: boolean;
  onHideChannel: () => void;
  onWatched: (fraction: number) => void;
}) {
  const [burst, setBurst] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  // Set when the IFrame API itself could not be loaded — offline, or blocked by
  // an extension. Distinct from `unplayable`, which is one bad video.
  const [apiFailed, setApiFailed] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const lastTap = React.useRef(0);
  // Latest callback without re-creating the player on every render.
  const endedRef = React.useRef(onEnded);
  endedRef.current = onEnded;
  const unplayableRef = React.useRef(onUnplayable);
  unplayableRef.current = onUnplayable;
  // The furthest point reached, not the position at the moment of leaving:
  // a viewer who watches to the end and then scrubs back has still watched it.
  const watchedRef = React.useRef(0);
  const reportRef = React.useRef(onWatched);
  reportRef.current = onWatched;

  // Whether this card should own a player at all: the one being watched, and
  // the one about to be. Everything else is torn down — players left alive
  // off-screen are what turn a feed into a memory leak.
  const wantsPlayer = mounted && !unplayable && !hidden && (active || preload);

  // Deliberately NOT keyed on `active`. A preloaded card becoming the active
  // one must keep the player it already warmed up; rebuilding it there would
  // throw away the entire point and put the cold start back.
  const activeAtBuild = React.useRef(active);
  activeAtBuild.current = active;

  React.useEffect(() => {
    if (!wantsPlayer || !hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    const mountPoint = document.createElement("div");
    host.appendChild(mountPoint);

    // Distinguishes "this one video is refused" from "the API never loaded".
    let refused = false;

    void createPlayer(mountPoint, {
      videoId: short.youtubeId,
      // ALWAYS built muted, whatever the viewer's preference. Browsers refuse
      // to autoplay with sound, so a player created unmuted may simply never
      // start. The preference is applied by the effect below, once it is
      // running — a moment of silence, rather than a clip that never plays.
      muted: true,
      // Warmed-up cards build the player and cue the video without playing it.
      autoplay: activeAtBuild.current,
      onEnded: () => endedRef.current(),
      onUnplayable: () => {
        refused = true;
        if (!cancelled) unplayableRef.current();
      },
      onStateChange: (st) => {
        if (cancelled) return;
        if (st === YT_STATE.PLAYING) setPaused(false);
        if (st === YT_STATE.PAUSED) setPaused(true);
      },
    }).then((pl) => {
      if (cancelled) {
        pl?.destroy();
        return;
      }
      playerRef.current = pl;
      setReady(!!pl);
      // No player and no refusal means the API never loaded. Skipping would be
      // wrong — every clip would fail and the feed would race through the whole
      // library. Show a plain embed instead: no progress bar or auto-advance,
      // but it plays, which beats a poster that does nothing forever.
      if (!pl && !refused) setApiFailed(true);
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
      host.replaceChildren();
      setReady(false);
      setProgress(0);
      setPaused(false);
      setApiFailed(false);
    };
    // `muted` deliberately omitted: handled below without a rebuild, because
    // re-creating the player would restart the clip from zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsPlayer, short.youtubeId]);

  // Report how much of it was watched on the way out. Doing this when the card
  // stops being active rather than on unmount catches the ordinary case — a
  // swipe — while the card is still mounted and its numbers still exist.
  React.useEffect(() => {
    if (!active) return;
    return () => {
      const f = watchedRef.current;
      watchedRef.current = 0;
      if (f > 0) reportRef.current(f);
    };
  }, [active]);

  // Play/pause follows which card is on screen, using the player that already
  // exists rather than building a new one.
  React.useEffect(() => {
    const pl = playerRef.current;
    if (!pl || !ready) return;
    try {
      if (active) pl.playVideo();
      else pl.pauseVideo();
    } catch {
      /* mid-teardown */
    }
  }, [active, ready]);

  // Changing mute must never restart the video. Also runs when the player
  // becomes ready, which is what applies a remembered "sound on" preference to
  // a player that was necessarily created muted.
  React.useEffect(() => {
    const pl = playerRef.current;
    if (!pl || !ready) return;
    try {
      if (muted) pl.mute();
      else pl.unMute();
    } catch {
      /* mid-teardown */
    }
  }, [muted, ready]);

  // A real progress bar — impossible with a plain embed.
  React.useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const pl = playerRef.current;
      if (!pl) return;
      try {
        if (scrubbingRef.current !== null) return; // the thumb wins while held
        const d = pl.getDuration();
        if (d > 0) {
          const at = Math.min(1, pl.getCurrentTime() / d);
          setProgress(at);
          if (at > watchedRef.current) watchedRef.current = at;
        }
      } catch {
        /* mid-teardown */
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  // Dragging the bar seeks. The fill grows from the right in RTL, so the
  // fraction is measured from whichever edge the text direction starts at —
  // reading it off `clientX` alone would run the scrub backwards in Arabic.
  const [scrubbing, setScrubbing] = React.useState<number | null>(null);
  // The progress ticker runs on an interval and closes over its own snapshot,
  // so it needs the live value rather than the one captured when it started.
  const scrubbingRef = React.useRef<number | null>(null);
  scrubbingRef.current = scrubbing;

  const fractionAt = (el: HTMLElement, clientX: number) => {
    const r = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const raw = rtl ? (r.right - clientX) / r.width : (clientX - r.left) / r.width;
    return Math.min(1, Math.max(0, raw));
  };

  const beginScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(fractionAt(e.currentTarget, e.clientX));
  };

  const continueScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbing === null) return;
    e.stopPropagation();
    setScrubbing(fractionAt(e.currentTarget, e.clientX));
  };

  const endScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const at = scrubbing;
    setScrubbing(null);
    const pl = playerRef.current;
    if (at === null || !pl) return;
    try {
      const d = pl.getDuration();
      if (d > 0) {
        pl.seekTo(d * at, true);
        setProgress(at);
      }
    } catch {
      /* mid-teardown */
    }
  };

  const togglePlay = () => {
    const pl = playerRef.current;
    if (!pl) return;
    try {
      if (pl.getPlayerState() === YT_STATE.PLAYING) pl.pauseVideo();
      else pl.playVideo();
    } catch {
      /* ignore */
    }
  };

  // Double-tap likes, single tap plays/pauses. The single tap waits out the
  // double-tap window so one gesture never fires both.
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) onToggleLike();
      setBurst(true);
      window.setTimeout(() => setBurst(false), 650);
      if (navigator.vibrate) navigator.vibrate(12);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    window.setTimeout(() => {
      if (lastTap.current === now) togglePlay();
    }, 300);
  };

  return (
    <section className="shorts-card" onPointerUp={onTap} aria-label={short.title}>
      {/* Painted underneath always, so a slow player never shows a black
          rectangle — the frame is on screen before the video is. */}
      <img
        className="shorts-poster"
        src={posterFor(short)}
        alt=""
        aria-hidden="true"
        // The cards around the viewer fetch their frame ahead of time; a lazy
        // poster only starts loading once it is already on screen, which is
        // exactly when it is too late and the swipe shows black.
        loading={mounted ? "eager" : "lazy"}
        fetchPriority={active ? "high" : mounted ? "auto" : "low"}
      />
      <div className="shorts-scrim" aria-hidden="true" />

      <div ref={hostRef} className="shorts-frame" />

      {apiFailed && !unplayable && (
        <iframe
          className="shorts-frame"
          src={embedUrl(short.youtubeId, muted)}
          title={short.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}

      {unplayable && !hidden && (
        <div className="shorts-gone" dir="rtl" role="status">
          <p>هذا المقطع لم يعد متاحًا</p>
          <span>ننتقل إلى التالي…</span>
        </div>
      )}

      {hidden && (
        <div className="shorts-gone" dir="rtl" role="status">
          <p>لن تظهر مقاطع {short.channelName}</p>
          <span>يمكنك التراجع من الإعدادات</span>
        </div>
      )}

      {!active && !unplayable && !hidden && (
        <div className="shorts-idle" aria-hidden="true">
          <Play size={40} strokeWidth={1.5} />
        </div>
      )}

      {active && paused && !unplayable && !hidden && (
        <div className="shorts-idle" aria-hidden="true">
          <Pause size={44} strokeWidth={1.5} />
        </div>
      )}

      {burst && (
        <div className="shorts-burst" aria-hidden="true">
          <Heart size={110} fill="currentColor" />
        </div>
      )}

      <div className="shorts-meta" dir="rtl">
        {/* Tapping the channel opens the clip on YouTube — where it can be
            saved, or the speaker followed. A button rather than another icon in
            the rail: the rail is already four deep, and this is the one action
            that already has an obvious thing to press. */}
        <button
          type="button"
          className="shorts-channel"
          onClick={(e) => {
            e.stopPropagation();
            window.open(
              `https://www.youtube.com/watch?v=${short.youtubeId}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
          aria-label={`فتح المقطع في يوتيوب — ${short.channelName}`}
        >
          {short.channelAvatar ? (
            <img src={short.channelAvatar} alt="" className="shorts-avatar" loading="lazy" />
          ) : (
            <span
              className="shorts-avatar shorts-avatar-fallback"
              style={{ background: short.accent ?? "var(--accent)" }}
            />
          )}
          <span className="shorts-channel-name">{short.channelName}</span>
        </button>
        <p className="shorts-title">{short.title}</p>
      </div>

      <div className="shorts-actions">
        <button
          type="button"
          className={`shorts-action ${liked ? "liked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          aria-label={liked ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
          aria-pressed={liked}
        >
          <Heart size={26} fill={liked ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          className="shorts-action"
          onClick={(e) => {
            e.stopPropagation();
            void shareText(
              `${short.title}
https://www.youtube.com/watch?v=${short.youtubeId}`,
              short.title,
            );
          }}
          aria-label="مشاركة"
        >
          <Share2 size={24} />
        </button>
        <button
          type="button"
          className="shorts-action"
          onClick={(e) => {
            e.stopPropagation();
            onHideChannel();
          }}
          aria-label={`عدم عرض مقاطع ${short.channelName}`}
        >
          <EyeOff size={23} />
        </button>
        <button
          type="button"
          className="shorts-action"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {active && !unplayable && !hidden && (
        <div
          className="shorts-playbar"
          data-scrubbing={scrubbing !== null ? "1" : undefined}
          role="slider"
          tabIndex={-1}
          aria-label="موضع التشغيل"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onPointerDown={beginScrub}
          onPointerMove={continueScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          <div style={{ width: `${(scrubbing ?? progress) * 100}%` }} />
        </div>
      )}
    </section>
  );
}

export function ShortsPage() {
  const navigate = useNavigate();
  const { data, isError, refetch } = useShortsDB();
  const bookmarks = useNoorStore((s) => s.videoLibraryBookmarks);
  const toggleBookmark = useNoorStore((s) => s.toggleVideoBookmark);
  const markSeen = useNoorStore((s) => s.markShortSeen);
  // A stable empty object: returning a fresh `{}` from the selector would give
  // a new reference every render and spin the store's change detection.
  const hiddenChannels = useNoorStore((s) => s.shortsHiddenChannels) ?? NO_HIDDEN;
  const hideChannel = useNoorStore((s) => s.toggleShortsChannelHidden);
  const recordWatch = useNoorStore((s) => s.recordShortWatch);

  // Read ONCE. Watch history updates as you scroll, and re-ranking on every
  // change would rebuild the feed under the viewer's thumb — the current clip
  // would jump elsewhere the moment it was marked as seen.
  const seenAtMountRef = React.useRef<Record<string, number> | null>(null);
  if (seenAtMountRef.current === null) {
    seenAtMountRef.current = useNoorStore.getState().shortsSeen ?? {};
  }
  const seedRef = React.useRef(Date.now());

  // Read once, like watch history: hiding a channel must not re-rank the feed
  // under the viewer's thumb. Clips already in the list are skipped instead
  // (see below), and the next visit is built without that channel at all.
  const hiddenChannelsAtMountRef = React.useRef<Record<string, boolean> | null>(null);
  if (hiddenChannelsAtMountRef.current === null) {
    hiddenChannelsAtMountRef.current = useNoorStore.getState().shortsHiddenChannels ?? {};
  }

  // Learned taste, also read once. It updates continuously as you watch, and
  // re-ranking on every clip would reshuffle the feed under the viewer — the
  // next visit is where what was learned shows up.
  const signalsAtMountRef = React.useRef<{
    stats: Record<string, ShortsChannelStat>;
    topics: Record<string, number>;
  } | null>(null);
  if (signalsAtMountRef.current === null) {
    const st = useNoorStore.getState();
    signalsAtMountRef.current = {
      stats: st.shortsChannelStats ?? {},
      topics: st.shortsTopicAffinity ?? {},
    };
  }

  // The feed grows instead of ending. The ranking is deterministic for a given
  // seed, so asking for a larger limit returns the SAME clips in the same order
  // plus more on the end — the viewer's position never moves underneath them.
  const [pages, setPages] = React.useState(1);

  const feed = React.useMemo(
    () =>
      buildShortsFeed(data ?? null, {
        seen: seenAtMountRef.current ?? {},
        liked: bookmarks,
        hiddenChannels: hiddenChannelsAtMountRef.current ?? {},
        channelStats: signalsAtMountRef.current?.stats ?? {},
        topicAffinity: signalsAtMountRef.current?.topics ?? {},
        seed: seedRef.current,
        limit: PAGE_SIZE * pages,
      }),
    // `bookmarks` deliberately omitted: liking a video must not re-rank the
    // feed you are currently scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, pages],
  );

  // Passed down so the recorder can keep the channels' own names out of the
  // topic vocabulary — they sign nearly every title.
  const channelNames = React.useMemo(
    () => (data?.channels ?? []).map((c) => c.name),
    [data],
  );

  const [index, setIndex] = React.useState(0);
  const [gone, setGone] = React.useState<ReadonlySet<string>>(() => new Set());
  const [muted, setMuted] = React.useState(readMutePreference);

  React.useEffect(() => {
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* private mode; the session still honours the choice */
    }
  }, [muted]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root || feed.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || e.intersectionRatio < 0.6) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          if (!Number.isNaN(i)) setIndex(i);
        }
      },
      { root, threshold: [0.6] },
    );
    for (const el of root.querySelectorAll("[data-index]")) io.observe(el);
    return () => io.disconnect();
  }, [feed.length]);

  // A card counts as watched only after it has held the screen for a moment.
  // Marking on arrival would burn through the library during a fast scroll and
  // leave nothing new for the next visit.
  React.useEffect(() => {
    const current = feed[index];
    if (!current) return;
    const t = window.setTimeout(() => markSeen(current.id), 2500);
    return () => window.clearTimeout(t);
  }, [index, feed, markSeen]);

  // When a clip finishes, move on by itself — the thing that makes a feed feel
  // like a feed rather than a page with a video on it. Guarded by index so a
  // stale player ending after a swipe cannot yank the viewer forward.
  const advance = React.useCallback(
    (from: number) => {
      const root = containerRef.current;
      if (!root || from !== index) return;
      root.scrollTo({ top: (from + 1) * root.clientHeight, behavior: "smooth" });
    },
    [index],
  );

  // Across 7,551 clips some will always be gone — deleted, made private,
  // region-locked, or embedding turned off by the owner. YouTube paints its own
  // "unavailable" frame and then simply stops, stranding the viewer with no way
  // forward. Mark it watched so the ranking stops offering it, and move on. The
  // card stays in the list rather than being spliced out, so the indices the
  // scroll container is built on never shift underneath a gesture.
  const skipUnplayable = React.useCallback(
    (id: string, from: number) => {
      setGone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      markSeen(id);
      advance(from);
    },
    [advance, markSeen],
  );

  // A channel hidden mid-scroll still has clips in the list that was built
  // before the viewer asked. Skip past them rather than rebuilding, which
  // would move everything under an in-flight gesture.
  React.useEffect(() => {
    const current = feed[index];
    if (!current) return;
    if (hiddenChannels[current.channelId]) advance(index);
  }, [index, feed, hiddenChannels, advance]);

  // Extend well before the viewer arrives, so there is never a visible stall.
  // A build that came back short means the library is exhausted, and asking for
  // more would spin forever.
  React.useEffect(() => {
    if (feed.length < PAGE_SIZE * pages) return;
    if (index >= feed.length - EXTEND_WITHIN) setPages((p) => p + 1);
  }, [index, feed.length, pages]);

  // Desktop: arrows move a card at a time, Escape leaves.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        root.scrollTo({ top: (index + dir) * root.clientHeight, behavior: "smooth" });
      } else if (e.key === "Escape") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, navigate]);

  // The tab bar and its dots would sit on top of a full-screen feed.
  React.useEffect(() => {
    document.body.classList.add("shorts-open");
    return () => document.body.classList.remove("shorts-open");
  }, []);

  // Without this the page sits on "loading" forever whenever the index fails to
  // fetch — offline, a bad deploy, a blocked request. Say so, and offer a retry.
  if (isError) {
    return (
      <div className="shorts-loading" dir="rtl">
        <p>تعذّر تحميل المقاطع القصيرة.</p>
        <button type="button" className="shorts-retry" onClick={() => void refetch()}>
          إعادة المحاولة
        </button>
      </div>
    );
  }
  if (!data) return <div className="shorts-loading" dir="rtl">جارٍ التحميل…</div>;
  if (feed.length === 0) {
    return <div className="shorts-loading" dir="rtl">لا توجد مقاطع قصيرة متاحة الآن.</div>;
  }

  return (
    <div className="shorts-root" dir="rtl">
      <button type="button" className="shorts-close" onClick={() => navigate(-1)} aria-label="إغلاق">
        <X size={22} />
      </button>

      <div className="shorts-scroller" ref={containerRef} tabIndex={-1}>
        {feed.map((short, i) => (
          <div className="shorts-slot" data-index={i} key={short.id}>
            {Math.abs(i - index) > RENDER_WINDOW ? null : (
            <ShortCard
              short={short}
              active={i === index}
              preload={i === index + 1}
              mounted={Math.abs(i - index) <= WINDOW}
              muted={muted}
              liked={!!bookmarks[short.id]}
              onToggleLike={() => toggleBookmark(short.id)}
              onToggleMute={() => setMuted((m) => !m)}
              onEnded={() => advance(i)}
              unplayable={gone.has(short.id)}
              onUnplayable={() => skipUnplayable(short.id, i)}
              hidden={!!hiddenChannels[short.channelId]}
              onHideChannel={() => hideChannel(short.channelId)}
              onWatched={(fraction) =>
                recordWatch({
                  channelId: short.channelId,
                  title: short.title,
                  fraction,
                  channelNames,
                })
              }
            />
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

export default ShortsPage;
