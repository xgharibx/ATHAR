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
import { Heart, Volume2, VolumeX, X, Play, Pause } from "lucide-react";

import { useShortsDB } from "@/data/useShortsDB";
import { useNoorStore } from "@/store/noorStore";
import { buildShortsFeed, posterFor, type Short } from "@/lib/shortsFeed";
import { createPlayer, YT_STATE, type YTPlayer } from "@/lib/youtubePlayer";

/** How many neighbours around the active card get a real player. */
const WINDOW = 1;

/** How many clips to rank at a time, and how close to the end to extend. */
const PAGE_SIZE = 300;
const EXTEND_WITHIN = 12;

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
  mounted,
  muted,
  liked,
  onToggleLike,
  onToggleMute,
  onEnded,
  unplayable,
  onUnplayable,
}: {
  short: Short;
  active: boolean;
  mounted: boolean;
  muted: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onToggleMute: () => void;
  onEnded: () => void;
  unplayable: boolean;
  onUnplayable: () => void;
}) {
  const [burst, setBurst] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  // Set when the IFrame API itself could not be loaded — offline, or blocked by
  // an extension. Distinct from `unplayable`, which is one bad video.
  const [apiFailed, setApiFailed] = React.useState(false);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const lastTap = React.useRef(0);
  // Latest callback without re-creating the player on every render.
  const endedRef = React.useRef(onEnded);
  endedRef.current = onEnded;
  const unplayableRef = React.useRef(onUnplayable);
  unplayableRef.current = onUnplayable;

  // Build a player only for the ACTIVE card and tear it down on the way out.
  // Players left alive off-screen are what turn a feed into a memory leak.
  React.useEffect(() => {
    if (!mounted || !active || unplayable || !hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    const mountPoint = document.createElement("div");
    host.appendChild(mountPoint);

    // Distinguishes "this one video is refused" from "the API never loaded".
    let refused = false;

    void createPlayer(mountPoint, {
      videoId: short.youtubeId,
      muted,
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
      setProgress(0);
      setPaused(false);
      setApiFailed(false);
    };
    // `muted` deliberately omitted: handled below without a rebuild, because
    // re-creating the player would restart the clip from zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, active, unplayable, short.youtubeId]);

  // Changing mute must never restart the video.
  React.useEffect(() => {
    const pl = playerRef.current;
    if (!pl) return;
    try {
      if (muted) pl.mute();
      else pl.unMute();
    } catch {
      /* not ready yet; it was created with the right value anyway */
    }
  }, [muted]);

  // A real progress bar — impossible with a plain embed.
  React.useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const pl = playerRef.current;
      if (!pl) return;
      try {
        const d = pl.getDuration();
        if (d > 0) setProgress(Math.min(1, pl.getCurrentTime() / d));
      } catch {
        /* mid-teardown */
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

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
      <img className="shorts-poster" src={posterFor(short)} alt="" aria-hidden="true" loading="lazy" />
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

      {unplayable && (
        <div className="shorts-gone" dir="rtl" role="status">
          <p>هذا المقطع لم يعد متاحًا</p>
          <span>ننتقل إلى التالي…</span>
        </div>
      )}

      {!active && !unplayable && (
        <div className="shorts-idle" aria-hidden="true">
          <Play size={40} strokeWidth={1.5} />
        </div>
      )}

      {active && paused && !unplayable && (
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
        <div className="shorts-channel">
          {short.channelAvatar ? (
            <img src={short.channelAvatar} alt="" className="shorts-avatar" loading="lazy" />
          ) : (
            <span
              className="shorts-avatar shorts-avatar-fallback"
              style={{ background: short.accent ?? "var(--accent)" }}
            />
          )}
          <span className="shorts-channel-name">{short.channelName}</span>
        </div>
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
            onToggleMute();
          }}
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {active && (
        <div className="shorts-playbar" aria-hidden="true">
          <div style={{ width: `${progress * 100}%` }} />
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

  // Read ONCE. Watch history updates as you scroll, and re-ranking on every
  // change would rebuild the feed under the viewer's thumb — the current clip
  // would jump elsewhere the moment it was marked as seen.
  const seenAtMountRef = React.useRef<Record<string, number> | null>(null);
  if (seenAtMountRef.current === null) {
    seenAtMountRef.current = useNoorStore.getState().shortsSeen ?? {};
  }
  const seedRef = React.useRef(Date.now());

  // The feed grows instead of ending. The ranking is deterministic for a given
  // seed, so asking for a larger limit returns the SAME clips in the same order
  // plus more on the end — the viewer's position never moves underneath them.
  const [pages, setPages] = React.useState(1);

  const feed = React.useMemo(
    () =>
      buildShortsFeed(data ?? null, {
        seen: seenAtMountRef.current ?? {},
        liked: bookmarks,
        seed: seedRef.current,
        limit: PAGE_SIZE * pages,
      }),
    // `bookmarks` deliberately omitted: liking a video must not re-rank the
    // feed you are currently scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, pages],
  );

  const [index, setIndex] = React.useState(0);
  const [gone, setGone] = React.useState<ReadonlySet<string>>(() => new Set());
  const [muted, setMuted] = React.useState(true); // browsers block unmuted autoplay
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
            <ShortCard
              short={short}
              active={i === index}
              mounted={Math.abs(i - index) <= WINDOW}
              muted={muted}
              liked={!!bookmarks[short.id]}
              onToggleLike={() => toggleBookmark(short.id)}
              onToggleMute={() => setMuted((m) => !m)}
              onEnded={() => advance(i)}
              unplayable={gone.has(short.id)}
              onUnplayable={() => skipUnplayable(short.id, i)}
            />
          </div>
        ))}
      </div>

      <div className="shorts-progress" aria-hidden="true">
        <div style={{ width: `${((index + 1) / feed.length) * 100}%` }} />
      </div>
    </div>
  );
}

export default ShortsPage;
