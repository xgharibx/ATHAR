import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, Search, X, Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { PROPHET_STORIES, type ProphetStory } from "@/data/prophetStories";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const STORY_BOOKMARKS_KEY = "noor_story_bookmarks";

function loadStoryBookmarks(): Set<string> {
  try {
    const v = localStorage.getItem(STORY_BOOKMARKS_KEY);
    return v ? new Set(JSON.parse(v) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveStoryBookmarks(s: Set<string>) {
  localStorage.setItem(STORY_BOOKMARKS_KEY, JSON.stringify([...s]));
}

function StoryCard({
  story,
  bookmarked,
  onToggleBookmark,
}: {
  story: ProphetStory;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      role="listitem"
      className="rounded-2xl overflow-hidden transition-all duration-200 cv-auto"
      style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
    >
      <button type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-right"
        aria-expanded={open}
        aria-controls={`story-panel-${story.id}`}
        style={{ color: "var(--fg)" }}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronUp size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
          ) : (
            <ChevronDown size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
          )}
        </div>
        <div className="flex-1 text-right mr-2">
          <div className="font-bold text-base" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
            {story.nameAr}
          </div>
          {story.period && (
            <div className="text-xs opacity-50 mt-0.5">{story.period}</div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {story.nameAr.charAt(0)}
        </div>
      </button>

      <div id={`story-panel-${story.id}`} hidden={!open} className="px-4 pb-4 space-y-4">
          <div className="h-px" style={{ background: "var(--stroke)" }} />
          <p
            className="text-sm leading-loose text-right"
            style={{ color: "var(--fg)", opacity: 0.85 }}
          >
            {story.summary}
          </p>
          {story.lessons.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--accent)" }}>
                الدروس المستفادة:
              </p>
              <ul className="space-y-1.5">
                {story.lessons.map((lesson, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-right" style={{ color: "var(--fg)" }}>
                    <span style={{ color: "var(--accent)" }} className="mt-0.5 flex-shrink-0">•</span>
                    <span className="opacity-80">{lesson}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const lessons = story.lessons.length > 0
                  ? "\n\nالدروس المستفادة:\n" + story.lessons.map((l) => `• ${l}`).join("\n")
                  : "";
                const text = `${story.nameAr}\n\n${story.summary}${lessons}`;
                if (navigator.share) {
                  await navigator.share({ text }).catch(() => {});
                } else {
                  await navigator.clipboard.writeText(text).catch(() => {});
                  toast.success("تم النسخ");
                }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
              style={{ background: "var(--stroke)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.7 }}
            >
              <Share2 size={13} aria-hidden="true" />
              مشاركة
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(story.id); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
              style={bookmarked
                ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }
                : { background: "var(--stroke)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.7 }}
            >
              {bookmarked ? <BookmarkCheck size={13} aria-hidden="true" /> : <Bookmark size={13} aria-hidden="true" />}
              {bookmarked ? "محفوظة" : "حفظ"}
            </button>
          </div>
        </div>
    </div>
  );
}

export function ProphetStoriesPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [query, setQuery] = React.useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = React.useState(false);
  const [bookmarks, setBookmarks] = React.useState<Set<string>>(() => loadStoryBookmarks());

  const toggleBookmark = React.useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success("تمت إزالة الحفظ"); }
      else { next.add(id); toast.success("تم الحفظ ✓"); }
      saveStoryBookmarks(next);
      return next;
    });
  }, []);

  const filtered = React.useMemo(() => {
    let list = PROPHET_STORIES;
    if (showBookmarksOnly) list = list.filter((s) => bookmarks.has(s.id));
    if (!query.trim()) return list;
    const q = query.trim();
    return list.filter((s) =>
      s.nameAr.includes(q) ||
      s.summary.includes(q) ||
      (s.lessons ?? []).some((l) => l.includes(q))
    );
  }, [query, showBookmarksOnly, bookmarks]);

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-gradient-to-bl from-amber-500/15 to-orange-400/10 pointer-events-none opacity-55"
            style={{ borderRadius: "inherit" }}
          />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="رجوع"
                className="mt-1 p-2 rounded-xl flex-shrink-0"
                style={{ background: "var(--card)", color: "var(--fg)" }}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📜</span>
                  <div className="text-xs opacity-60">قصص الأنبياء</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#f59e0b" }}>قصص الأنبياء</h1>
                <div className="text-sm opacity-70 mt-1">{filtered.length} من {PROPHET_STORIES.length} نبيًا</div>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarksOnly((v) => !v)}
                aria-pressed={showBookmarksOnly}
                className="mt-1 p-2 rounded-xl transition-all"
                style={showBookmarksOnly
                  ? { background: "rgba(245,158,11,0.2)", color: "#f59e0b" }
                  : { background: "var(--card)", color: "var(--fg)" }}
                aria-label="المحفوظة"
              >
                <Bookmark size={17} aria-hidden="true" />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <input
                type="search"
                dir="rtl"
                placeholder="ابحث باسم النبي أو الدرس…"
                aria-label="بحث في قصص الأنبياء"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="none"
                className="w-full h-9 pr-8 pl-8 rounded-2xl text-sm outline-none"
                style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
              />
              {query && (
                <button type="button" aria-label="مسح البحث" onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Visually hidden live region for search count */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {query ? `نتائج البحث: ${filtered.length} قصة` : null}
      </div>
      {/* Stories */}
      <div className="px-4 pt-4 space-y-3" role="list" aria-label="قائمة قصص الأنبياء">
        {filtered.length === 0 ? (
          <div className="text-center py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
            {showBookmarksOnly ? "لا توجد قصص محفوظة" : "لا توجد نتائج"}
          </div>
        ) : filtered.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            bookmarked={bookmarks.has(story.id)}
            onToggleBookmark={toggleBookmark}
          />
        ))}
      </div>
    </div>
  );
}
