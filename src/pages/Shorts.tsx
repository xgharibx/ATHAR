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
import { Heart, Volume2, VolumeX, X, Play } from "lucide-react";

import { useVideoLibraryDB } from "@/data/useVideoLibraryDB";
import { useNoorStore } from "@/store/noorStore";
import { buildShortsFeed, posterFor, type Short } from "@/lib/shortsFeed";

/** How many neighbours around the active card get a real player. */
const WINDOW = 1;

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
}: {
  short: Short;
  active: boolean;
  mounted: boolean;
  muted: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onToggleMute: () => void;
}) {
  const [burst, setBurst] = React.useState(false);
  const lastTap = React.useRef(0);

  // Double-tap to like — the gesture everyone already knows. A single tap must
  // still reach the player, so only the second tap is claimed.
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
  };

  return (
    <section className="shorts-card" onPointerUp={onTap} aria-label={short.title}>
      {/* Painted underneath always, so a slow player never shows a black
          rectangle — the frame is on screen before the video is. */}
      <img className="shorts-poster" src={posterFor(short)} alt="" aria-hidden="true" loading="lazy" />
      <div className="shorts-scrim" aria-hidden="true" />

      {mounted && active ? (
        <iframe
          className="shorts-frame"
          src={embedUrl(short.youtubeId, muted)}
          title={short.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}

      {!active && (
        <div className="shorts-idle" aria-hidden="true">
          <Play size={40} strokeWidth={1.5} />
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
    </section>
  );
}

export function ShortsPage() {
  const navigate = useNavigate();
  const { data } = useVideoLibraryDB();
  const bookmarks = useNoorStore((s) => s.videoLibraryBookmarks);
  const toggleBookmark = useNoorStore((s) => s.toggleVideoBookmark);

  // Seeded once per visit: a stable order while scrolling, a different one next
  // time. Re-shuffling on render would teleport the viewer mid-swipe.
  const seedRef = React.useRef(Date.now());
  const feed = React.useMemo(() => {
    if (!data) return [];
    return buildShortsFeed(data.db.videos ?? [], data.db.channels ?? [], seedRef.current);
  }, [data]);

  const [index, setIndex] = React.useState(0);
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
