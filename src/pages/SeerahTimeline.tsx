import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, Search, X, Bookmark, BookmarkCheck } from "lucide-react";
import {
  SEERAH_BOOKS,
  SEERAH_BOOK_CATEGORIES,
  getSeerahBookColor,
  type SeerahBook,
  type SeerahBookCategory,
} from "@/data/seerahTimeline";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const SEERAH_BOOKMARKS_KEY = "noor_seerah_bookmarks";

function loadBookmarks(): Set<string> {
  try {
    const v = localStorage.getItem(SEERAH_BOOKMARKS_KEY);
    return v ? new Set(JSON.parse(v) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveBookmarks(s: Set<string>) {
  localStorage.setItem(SEERAH_BOOKMARKS_KEY, JSON.stringify([...s]));
}

function BookCard({
  book,
  bookmarked,
  onToggleBookmark,
}: {
  book: SeerahBook;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [openChapter, setOpenChapter] = React.useState<number | null>(null);
  const color = getSeerahBookColor(book.category);

  React.useEffect(() => {
    if (!open) setOpenChapter(null);
  }, [open]);

  return (
    <div
      role="listitem"
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
    >
      {/* Book header row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-right"
        aria-expanded={open}
        aria-controls={`seerah-panel-${book.id}`}
        style={{ color: "var(--fg)" }}
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronUp size={18} aria-hidden="true" style={{ color }} />
            : <ChevronDown size={18} aria-hidden="true" style={{ color }} />}
        </div>
        <div className="flex-1 text-right mx-3">
          <div className="font-bold text-base leading-snug" style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--fg)" }}>
            {book.title}
          </div>
          {book.subtitle && (
            <div className="text-xs opacity-55 mt-0.5">{book.subtitle}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
            >
              {book.era}
            </span>
            {book.chapters.length > 0 && (
              <span className="text-[10px] font-semibold" style={{ color }}>
                📚 {book.chapters.length} فصول
              </span>
            )}
          </div>
        </div>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${color} 18%, var(--card))`,
            border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
          }}
          aria-hidden="true"
        >
          {book.icon}
        </div>
      </button>

      {/* Expanded content */}
      <div
        id={`seerah-panel-${book.id}`}
        aria-hidden={!open}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "6000px" : "0" }}
      >
        <div className="px-4 pb-4 space-y-4">
          <div className="h-px" style={{ background: "var(--stroke)" }} />

          {/* Summary */}
          <p className="text-sm leading-loose text-right opacity-80" style={{ color: "var(--fg)" }}>
            {book.summary}
          </p>

          {/* Chapters */}
          {book.chapters.length > 0 && (
            <div className="space-y-2">
              {book.chapters.map((chapter, idx) => {
                const chOpen = openChapter === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid color-mix(in srgb, ${color} 25%, var(--stroke))` }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenChapter(chOpen ? null : idx)}
                      className="w-full flex items-center justify-between px-3 py-3 text-right"
                      style={{ color: "var(--fg)" }}
                    >
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {chOpen
                          ? <ChevronUp size={14} aria-hidden="true" style={{ color }} />
                          : <ChevronDown size={14} aria-hidden="true" style={{ color }} />}
                        <span
                          className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
                        >
                          {idx + 1}
                        </span>
                      </div>
                      <span
                        className="flex-1 text-right text-sm font-semibold mr-2"
                        style={{ fontFamily: "var(--font-arabic, inherit)" }}
                      >
                        {chapter.title}
                      </span>
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{ maxHeight: chOpen ? "3000px" : "0" }}
                    >
                      <div className="px-3 pb-4 space-y-3">
                        <div className="h-px" style={{ background: "var(--stroke)" }} />
                        {chapter.content.split("\n\n").map((para, i) => (
                          <p
                            key={i}
                            className="text-sm leading-loose text-right"
                            style={{ color: "var(--fg)", opacity: 0.85 }}
                          >
                            {para}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lessons */}
          {book.lessons && book.lessons.length > 0 && (
            <div
              className="rounded-xl p-3"
              style={{ background: `color-mix(in srgb, ${color} 8%, var(--card))`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}
            >
              <p className="text-xs font-bold mb-2" style={{ color }}>💡 الدروس المستفادة</p>
              <ul role="list" className="space-y-1.5">
                {book.lessons.map((lesson) => (
                  <li key={lesson} className="flex items-start gap-2 text-sm text-right" style={{ color: "var(--fg)" }}>
                    <span style={{ color }} className="mt-0.5 flex-shrink-0">•</span>
                    <span className="opacity-80">{lesson}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quran refs */}
          {book.quranRefs && book.quranRefs.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color }}>📖 المراجع القرآنية</p>
              <div className="flex flex-wrap gap-1.5">
                {book.quranRefs.map((ref) => (
                  <span
                    key={ref}
                    className="text-xs px-2.5 py-0.5 rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${color} 15%, transparent)`,
                      color,
                      border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
                    }}
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {book.sources && book.sources.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--fg)", opacity: 0.6 }}>📚 المصادر</p>
              <div className="flex flex-wrap gap-1.5">
                {book.sources.map((src) => (
                  <span
                    key={src}
                    className="text-xs px-2.5 py-0.5 rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--fg) 8%, transparent)",
                      color: "var(--fg)",
                      opacity: 0.7,
                      border: "1px solid color-mix(in srgb, var(--fg) 15%, transparent)",
                    }}
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const chaptersText = book.chapters.length > 0
                  ? book.chapters.map((c) => `【${c.title}】\n${c.content}`).join("\n\n")
                  : book.summary;
                const text = `${book.icon} ${book.title}\n${book.era}\n\n${chaptersText}\n\n• ATHAR أثر`;
                if (navigator.share) {
                  await navigator.share({ text }).catch(() => {});
                } else {
                  try {
                    await navigator.clipboard.writeText(text);
                    toast.success("تم النسخ");
                  } catch {
                    toast.error("تعذّر النسخ");
                  }
                }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[44px] rounded-full transition-all"
              style={{ background: "var(--stroke)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.7 }}
            >
              <span className="text-sm" aria-hidden="true">↗</span>
              مشاركة
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(book.id); }}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "إلغاء حفظ الكتاب" : "حفظ الكتاب"}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[44px] rounded-full transition-all"
              style={bookmarked
                ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }
                : { background: "var(--stroke)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.7 }}
            >
              {bookmarked ? <BookmarkCheck size={13} aria-hidden="true" /> : <Bookmark size={13} aria-hidden="true" />}
              {bookmarked ? "محفوظ" : "حفظ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SeerahTimeline() {
  const navigate = useNavigate();
  useScrollRestoration();

  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<SeerahBookCategory | "all">("all");
  const [showBookmarksOnly, setShowBookmarksOnly] = React.useState(false);
  const [bookmarks, setBookmarks] = React.useState<Set<string>>(() => loadBookmarks());

  const toggleBookmark = React.useCallback((id: string) => {
    const wasBookmarked = bookmarks.has(id);
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      saveBookmarks(next);
      return next;
    });
    toast.success(wasBookmarked ? "تمت إزالة الحفظ" : "تم الحفظ ✓");
  }, [bookmarks]);

  const filtered = React.useMemo(() => {
    let list: SeerahBook[] = SEERAH_BOOKS;
    if (activeCategory !== "all") list = list.filter((b) => b.category === activeCategory);
    if (showBookmarksOnly) list = list.filter((b) => bookmarks.has(b.id));
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((b) =>
        b.title.includes(q) ||
        (b.subtitle ?? "").includes(q) ||
        b.summary.includes(q) ||
        b.chapters.some((c) => c.title.includes(q))
      );
    }
    return list;
  }, [activeCategory, showBookmarksOnly, query, bookmarks]);

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" aria-hidden />
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, #10b981 12%, transparent), color-mix(in srgb, #059669 8%, transparent))",
              borderRadius: "inherit",
            }}
          />
          <div className="relative">
            {/* Top row */}
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
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg" aria-hidden="true">🕌</span>
                  <div className="text-xs opacity-60">السيرة النبوية الشريفة</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#10b981" }}>السيرة النبوية</h1>
                <div className="text-sm opacity-70 mt-1">
                  {filtered.length} من {SEERAH_BOOKS.length} كتاباً
                  {bookmarks.size > 0 && (
                    <span className="mr-2 text-xs" style={{ color: "#10b981" }}>
                      • {bookmarks.size} محفوظ
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarksOnly((v) => !v)}
                aria-pressed={showBookmarksOnly}
                aria-label="المحفوظة"
                className="mt-1 p-2 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={showBookmarksOnly
                  ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                  : { background: "var(--card)", color: "var(--fg)" }}
              >
                <Bookmark size={17} aria-hidden="true" />
              </button>
            </div>

            {/* Category filter chips */}
            <div
              className="flex gap-2 overflow-x-auto pb-2 mb-2"
              style={{ scrollbarWidth: "none" }}
              role="group"
              aria-label="تصفية بالحقبة"
            >
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                aria-pressed={activeCategory === "all"}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-arabic transition press-effect"
                style={{
                  background: activeCategory === "all" ? "#10b981" : "var(--card)",
                  color: activeCategory === "all" ? "#fff" : "var(--muted)",
                  border: activeCategory === "all" ? "1px solid transparent" : "1px solid var(--stroke)",
                }}
              >
                الكل
              </button>
              {SEERAH_BOOK_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    type="button"
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    aria-pressed={isActive}
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-arabic transition whitespace-nowrap press-effect"
                    style={{
                      background: isActive ? cat.color : "var(--card)",
                      color: isActive ? "#fff" : "var(--muted)",
                      border: isActive ? "1px solid transparent" : "1px solid var(--stroke)",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative" role="search" aria-label="بحث في السيرة النبوية">
              <Search size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <input
                type="search"
                dir="rtl"
                placeholder="ابحث في كتب السيرة أو الفصول…"
                aria-label="بحث في السيرة النبوية"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="none"
                className="w-full h-9 pr-8 pl-8 rounded-2xl text-sm outline-none"
                style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => setQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {query ? `نتائج البحث: ${filtered.length} كتاب` : null}
      </div>

      {/* Book list */}
      <div className="px-4 pt-4 space-y-3" role="list" aria-label="كتب السيرة النبوية">
        {filtered.length === 0 ? (
          <div className="text-center py-16 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
            لا توجد نتائج
          </div>
        ) : (
          filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              bookmarked={bookmarks.has(book.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs font-arabic mt-8 mb-4 opacity-50" style={{ color: "var(--muted)" }}>
        ﷺ اللهم صلِّ وسلم على نبينا محمد
      </p>
    </div>
  );
}
