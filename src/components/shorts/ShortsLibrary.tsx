/**
 * Everything the feed remembers, in one place.
 *
 * Two things were saved where nobody could reach them. Liking a clip wrote to
 * `videoLibraryBookmarks`, which no screen in the app displayed, so the heart
 * appeared to do nothing. And hiding a channel was permanent in practice: there
 * was no way to take it back, which makes the button feel dangerous to press.
 *
 * This is the page that answers both, and it lives inside the feed rather than
 * in the app-wide Favourites — that screen is built around adhkar, and this is
 * where someone would look for the clip they just saved.
 */
import React from "react";
import { Heart, History, EyeOff, X, Play, RotateCcw } from "lucide-react";

import { useNoorStore } from "@/store/noorStore";
import { shortsByIds, type Short, type ShortsIndex } from "@/lib/shortsFeed";

type Tab = "liked" | "history" | "hidden";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "liked", label: "المفضلة", icon: <Heart size={15} /> },
  { id: "history", label: "شاهدتها", icon: <History size={15} /> },
  { id: "hidden", label: "المخفية", icon: <EyeOff size={15} /> },
];

function Row({
  short,
  onPlay,
  action,
}: {
  short: Short;
  onPlay: () => void;
  action: React.ReactNode;
}) {
  return (
    <li className="shorts-lib-row">
      <button type="button" className="shorts-lib-open" onClick={onPlay}>
        <span className="shorts-lib-thumb">
          <img src={`https://i.ytimg.com/vi/${short.youtubeId}/default.jpg`} alt="" loading="lazy" />
          <Play size={14} fill="currentColor" />
        </span>
        <span className="shorts-lib-text">
          <span className="shorts-lib-title">{short.title}</span>
          <span className="shorts-lib-channel">{short.channelName}</span>
        </span>
      </button>
      {action}
    </li>
  );
}

export function ShortsLibrary({
  index,
  onPlay,
  onClose,
}: {
  index: ShortsIndex | null;
  onPlay: (short: Short) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>("liked");

  const bookmarks = useNoorStore((s) => s.videoLibraryBookmarks);
  const toggleBookmark = useNoorStore((s) => s.toggleVideoBookmark);
  const seen = useNoorStore((s) => s.shortsSeen);
  const hidden = useNoorStore((s) => s.shortsHiddenChannels);
  const toggleHidden = useNoorStore((s) => s.toggleShortsChannelHidden);

  const liked = React.useMemo(() => {
    const ids = Object.entries(bookmarks ?? {})
      .filter(([, on]) => on)
      .map(([id]) => id);
    return shortsByIds(index, ids);
  }, [bookmarks, index]);

  const history = React.useMemo(() => {
    // Most recently watched first — the order someone actually looks for.
    const ids = Object.entries(seen ?? {})
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 200)
      .map(([id]) => id);
    return shortsByIds(index, ids);
  }, [seen, index]);

  const hiddenChannels = React.useMemo(() => {
    const ids = Object.entries(hidden ?? {})
      .filter(([, on]) => on)
      .map(([id]) => id);
    return ids
      .map((id) => index?.channels.find((c) => c.id === id) ?? { id, name: id, avatar: undefined })
      .filter(Boolean);
  }, [hidden, index]);

  const empty = {
    liked: "لم تُضِف أي مقطع إلى المفضلة بعد.",
    history: "لم تشاهد أي مقطع بعد.",
    hidden: "لم تُخفِ أي قناة.",
  }[tab];

  const count = tab === "liked" ? liked.length : tab === "history" ? history.length : hiddenChannels.length;

  return (
    <div className="shorts-lib" dir="rtl" role="dialog" aria-label="مكتبة المقاطع">
      <header className="shorts-lib-head">
        <h2>مكتبة المقاطع</h2>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="shorts-lib-close">
          <X size={18} />
        </button>
      </header>

      <div className="shorts-lib-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`shorts-lib-tab ${tab === t.id ? "is-on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="shorts-lib-body">
        {count === 0 ? (
          <p className="shorts-lib-empty">{empty}</p>
        ) : tab === "hidden" ? (
          <ul className="shorts-lib-list">
            {hiddenChannels.map((c) => (
              <li key={c.id} className="shorts-lib-row">
                <span className="shorts-lib-open as-static">
                  <span className="shorts-lib-text">
                    <span className="shorts-lib-title">{c.name}</span>
                    <span className="shorts-lib-channel">قناة مخفية</span>
                  </span>
                </span>
                <button
                  type="button"
                  className="shorts-lib-action"
                  onClick={() => toggleHidden(c.id)}
                  aria-label={`إظهار ${c.name}`}
                >
                  <RotateCcw size={15} />
                  <span>إظهار</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="shorts-lib-list">
            {(tab === "liked" ? liked : history).map((s) => (
              <Row
                key={s.id}
                short={s}
                onPlay={() => onPlay(s)}
                action={
                  tab === "liked" ? (
                    <button
                      type="button"
                      className="shorts-lib-action"
                      onClick={() => toggleBookmark(s.id)}
                      aria-label="إزالة من المفضلة"
                    >
                      <Heart size={15} fill="currentColor" />
                    </button>
                  ) : null
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ShortsLibrary;
