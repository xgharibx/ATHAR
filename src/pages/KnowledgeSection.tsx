import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, Search, X, Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

/** Shared shape for every knowledge-library entry (mirrors ProphetStory). */
export type KnowledgeEntry = {
  id: string;
  nameAr: string;
  period?: string;
  summary: string;
  fullStory?: string;
  chapters?: { title: string; content: string }[];
  quranRefs?: string[];
  sources?: string[];
  lessons: string[];
};

export type KnowledgeSectionConfig = {
  entries: KnowledgeEntry[];
  title: string;
  icon: string;
  accent: string;
  bookmarkKey: string;
  unitLabel: string; // e.g. "ملكًا", "ركنًا"
  searchPlaceholder: string;
};

function loadBookmarks(key: string): Set<string> {
  try {
    const v = localStorage.getItem(key);
    return v ? new Set(JSON.parse(v) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveBookmarks(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}

function EntryCard({
  entry,
  accent,
  bookmarked,
  onToggleBookmark,
}: {
  entry: KnowledgeEntry;
  accent: string;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [openChapter, setOpenChapter] = React.useState<number | null>(null);
  const chapterRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  const handleToggleChapter = React.useCallback((idx: number, isOpen: boolean) => {
    const next = isOpen ? null : idx;
    setOpenChapter(next);
    if (next === null) return;
    window.setTimeout(() => {
      const el = chapterRefs.current[idx];
      if (!el) return;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h") || "0");
      const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 0);
  }, []);

  React.useEffect(() => {
    if (!open) setOpenChapter(null);
  }, [open]);

  return (
    <div
      role="listitem"
      className={`rounded-2xl overflow-hidden transition-all duration-200${!open ? " cv-auto" : ""}`}
      style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
    >
      <button type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-right"
        aria-expanded={open}
        aria-controls={`entry-panel-${entry.id}`}
        style={{ color: "var(--fg)" }}
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronUp size={18} aria-hidden="true" style={{ color: accent }} />
            : <ChevronDown size={18} aria-hidden="true" style={{ color: accent }} />}
        </div>
        <div className="flex-1 text-right mr-2">
          <div className="font-bold text-base" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
            {entry.nameAr}
          </div>
          {entry.period && (
            <div className="text-xs opacity-50 mt-0.5">{entry.period}</div>
          )}
          {entry.chapters && entry.chapters.length > 0 && (
            <div className="text-[10px] font-semibold mt-1" style={{ color: accent }}>📚 {entry.chapters.length} فصول</div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: accent, color: "#fff" }}
        >
          {entry.nameAr.charAt(0)}
        </div>
      </button>

      <div
        id={`entry-panel-${entry.id}`}
        aria-hidden={!open}
        className={open ? "px-4 pb-4 space-y-4" : "hidden"}
      >
        <div className="h-px" style={{ background: "var(--stroke)" }} />
        {entry.chapters && entry.chapters.length > 0 ? (
          <div className="space-y-2">
            {entry.chapters.map((chapter, idx) => {
              const chOpen = openChapter === idx;
              return (
                <div
                  key={idx}
                  ref={(el) => {
                    chapterRefs.current[idx] = el;
                  }}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--stroke)" }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleChapter(idx, chOpen)}
                    className="w-full flex items-center justify-between px-3 py-3 text-right"
                    style={{ color: "var(--fg)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      {chOpen
                        ? <ChevronUp size={14} aria-hidden="true" style={{ color: accent }} />
                        : <ChevronDown size={14} aria-hidden="true" style={{ color: accent }} />}
                    </div>
                    <span className="flex-1 text-right text-sm font-semibold mr-2" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
                      {chapter.title}
                    </span>
                  </button>
                  <div className={chOpen ? "block" : "hidden"} aria-hidden={!chOpen}>
                    <div className="px-3 pb-3 space-y-3">
                      <div className="h-px" style={{ background: "var(--stroke)" }} />
                      {chapter.content.split("\n\n").map((para, i) => (
                        <p key={i} className="text-sm leading-loose text-right" style={{ color: "var(--fg)", opacity: 0.85 }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {(entry.fullStory ?? entry.summary).split("\n\n").map((para, i) => (
              <p key={i} className="text-sm leading-loose text-right" style={{ color: "var(--fg)", opacity: 0.85 }}>
                {para}
              </p>
            ))}
          </div>
        )}
        {entry.quranRefs && entry.quranRefs.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: accent }}>المراجع القرآنية:</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.quranRefs.map((ref) => (
                <span key={ref} className="text-xs px-2.5 py-0.5 rounded-full"
                  style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent, border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)` }}>
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}
        {entry.sources && entry.sources.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "var(--fg)", opacity: 0.6 }}>📚 المصادر:</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.sources.map((src) => (
                <span key={src} className="text-xs px-2.5 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--fg) 8%, transparent)", color: "var(--fg)", opacity: 0.75, border: "1px solid color-mix(in srgb, var(--fg) 15%, transparent)" }}>
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}
        {entry.lessons.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: accent }}>الدروس والفوائد:</p>
            <ul role="list" className="space-y-1.5">
              {entry.lessons.map((lesson) => (
                <li key={lesson} className="flex items-start gap-2 text-sm text-right" style={{ color: "var(--fg)" }}>
                  <span style={{ color: accent }} className="mt-0.5 flex-shrink-0">•</span>
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
              const lessons = entry.lessons.length > 0
                ? "\n\nالفوائد:\n" + entry.lessons.map((l) => `• ${l}`).join("\n")
                : "";
              const text = entry.chapters && entry.chapters.length > 0
                ? `${entry.nameAr}\n\n${entry.chapters.map((c) => `【${c.title}】\n${c.content}`).join("\n\n")}${lessons}`
                : `${entry.nameAr}\n\n${entry.fullStory ?? entry.summary}${lessons}`;
              if (navigator.share) {
                await navigator.share({ text }).catch(() => {});
              } else {
                try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
                catch { toast.error("تعذّر النسخ"); }
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[44px] rounded-full transition-all"
            style={{ background: "var(--stroke)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.7 }}
          >
            <Share2 size={13} aria-hidden="true" />
            مشاركة
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(entry.id); }}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "إلغاء الحفظ" : "حفظ"}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[44px] rounded-full transition-all"
            style={bookmarked
              ? { background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent, border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)` }
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

export function KnowledgeSectionPage({ config }: { config: KnowledgeSectionConfig }) {
  const navigate = useNavigate();
  useScrollRestoration();
  const { entries, title, icon, accent, bookmarkKey, unitLabel, searchPlaceholder } = config;
  const [query, setQuery] = React.useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = React.useState(false);
  const [bookmarks, setBookmarks] = React.useState<Set<string>>(() => loadBookmarks(bookmarkKey));

  const toggleBookmark = React.useCallback((id: string) => {
    const wasBookmarked = bookmarks.has(id);
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveBookmarks(bookmarkKey, next);
      return next;
    });
    toast.success(wasBookmarked ? "تمت إزالة الحفظ" : "تم الحفظ ✓");
  }, [bookmarks, bookmarkKey]);

  const filtered = React.useMemo(() => {
    let list = entries;
    if (showBookmarksOnly) list = list.filter((s) => bookmarks.has(s.id));
    if (!query.trim()) return list;
    const q = query.trim();
    return list.filter((s) =>
      s.nameAr.includes(q) ||
      s.summary.includes(q) ||
      (s.lessons ?? []).some((l) => l.includes(q))
    );
  }, [entries, query, showBookmarksOnly, bookmarks]);

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none opacity-55"
            style={{ borderRadius: "inherit", background: `linear-gradient(to bottom left, color-mix(in srgb, ${accent} 18%, transparent), color-mix(in srgb, ${accent} 8%, transparent))` }}
          />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="رجوع"
                className="mt-1 p-2 rounded-xl flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ background: "var(--card)", color: "var(--fg)" }}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg" aria-hidden="true">{icon}</span>
                  <div className="text-xs opacity-60">{title}</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: accent }}>{title}</h1>
                <div className="text-sm opacity-70 mt-1">{filtered.length} من {entries.length} {unitLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarksOnly((v) => !v)}
                aria-pressed={showBookmarksOnly}
                className="mt-1 p-2 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={showBookmarksOnly
                  ? { background: `color-mix(in srgb, ${accent} 20%, transparent)`, color: accent }
                  : { background: "var(--card)", color: "var(--fg)" }}
                aria-label="المحفوظة"
              >
                <Bookmark size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="relative" role="search" aria-label={`بحث في ${title}`}>
              <Search size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <input
                type="search"
                dir="rtl"
                placeholder={searchPlaceholder}
                aria-label={`بحث في ${title}`}
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

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {query ? `نتائج البحث: ${filtered.length}` : null}
      </div>
      <div className="px-4 pt-4 space-y-3" role="list" aria-label={title}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
            {showBookmarksOnly ? (
              <>
                <span>لا توجد عناصر محفوظة</span>
                <span className="text-xs opacity-70">انقر 🔖 على أي بطاقة لتحفظها</span>
              </>
            ) : (
              <span>لا توجد نتائج</span>
            )}
          </div>
        ) : filtered.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            accent={accent}
            bookmarked={bookmarks.has(entry.id)}
            onToggleBookmark={toggleBookmark}
          />
        ))}
      </div>
    </div>
  );
}
