import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Users, Search, X, Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { COMPANIONS, COMPANION_CATEGORIES, type Companion } from "@/data/companions";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const COMPANION_BOOKMARKS_KEY = "noor_companion_bookmarks";

function loadCompanionBookmarks(): Set<string> {
  try {
    const v = localStorage.getItem(COMPANION_BOOKMARKS_KEY);
    return v ? new Set(JSON.parse(v) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveCompanionBookmarks(s: Set<string>) {
  localStorage.setItem(COMPANION_BOOKMARKS_KEY, JSON.stringify([...s]));
}

export default function Companions() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [activeCategory, setActiveCategory] = useState<Companion["category"] | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => loadCompanionBookmarks());

  const toggleBookmark = React.useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success("تمت إزالة الحفظ"); }
      else { next.add(id); toast.success("تم الحفظ ✓"); }
      saveCompanionBookmarks(next);
      return next;
    });
  }, []);

  const filtered = React.useMemo(() => {
    let list = activeCategory === "all" ? COMPANIONS : COMPANIONS.filter((c) => c.category === activeCategory);
    if (showBookmarksOnly) list = list.filter((c) => bookmarks.has(c.id));
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((c) =>
        c.name.includes(q) ||
        c.brief.includes(q) ||
        (c.title ?? "").includes(q)
      );
    }
    return list;
  }, [activeCategory, query, showBookmarksOnly, bookmarks]);

  return (
    <div className="relative min-h-screen-safe overflow-hidden pb-24 page-enter" dir="rtl">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" aria-hidden />
      {/* Header Card */}
      <div className="relative z-10 px-4 pt-4">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          <div className="flex items-center gap-3 mb-4">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Users size={19} className="text-[var(--accent)]" />
                <h1 className="text-lg font-bold">الصحابة الكرام</h1>
              </div>
              <div className="text-xs opacity-55 mt-1" aria-live="polite" aria-atomic="true">{filtered.length} من {COMPANIONS.length} صحابي</div>
            </div>
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((v) => !v)}
              className="rounded-2xl border border-[var(--stroke)] p-2 transition glass-hover press-effect"
              style={showBookmarksOnly
                ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }
                : { background: "var(--card)", color: "var(--fg)" }}
              aria-label="المحفوظة"
              aria-pressed={showBookmarksOnly}
            >
              <Bookmark size={16} />
            </button>
          </div>
          {/* Category filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="تصفية الصحابة" style={{ scrollbarWidth: "none" }}>
            <button type="button"
              role="tab"
              aria-selected={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-arabic transition glass-hover press-effect"
              style={{
                background: activeCategory === "all" ? "var(--accent)" : "var(--card)",
                color: activeCategory === "all" ? "var(--on-accent)" : "var(--muted)",
                border: activeCategory === "all" ? "1px solid transparent" : "1px solid var(--stroke)",
              }}
            >
              الجميع ({COMPANIONS.length})
            </button>
            {COMPANION_CATEGORIES.map((cat) => {
              const count = COMPANIONS.filter((c) => c.category === cat.key).length;
              const isActive = activeCategory === cat.key;
              return (
                <button type="button"
                  key={cat.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(cat.key)}
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-arabic transition whitespace-nowrap glass-hover press-effect"
                  style={{
                    background: isActive ? "var(--accent)" : "var(--card)",
                    color: isActive ? "var(--on-accent)" : "var(--muted)",
                    border: isActive ? "1px solid transparent" : "1px solid var(--stroke)",
                  }}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
            <input
              type="search"
              dir="rtl"
              placeholder="ابحث في الصحابة…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              className="h-9 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] pr-8 pl-8 text-sm outline-none focus:border-accent-45"
              style={{ color: "var(--fg)" }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 transition-opacity" aria-label="مسح البحث">
                <X size={13} />
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Cards grid */}
      <div className="relative z-10 grid grid-cols-1 gap-3 p-4">
        {filtered.length === 0 && (
          <div className="text-center py-10 opacity-50 text-sm font-arabic" style={{ color: "var(--fg)" }}>
            {showBookmarksOnly ? "لا توجد صحابة محفوظون" : "لا توجد نتائج"}
          </div>
        )}
        {filtered.map((companion) => {
          const isOpen = expanded === companion.id;
          return (
            <div
              key={companion.id}
              className="relative overflow-hidden rounded-3xl glass cv-auto"
              style={{ border: "1px solid var(--stroke)" }}
            >
              <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
              {/* Toggle button — top row only */}
              <button type="button"
                onClick={() => setExpanded(isOpen ? null : companion.id)}
                aria-expanded={isOpen}
                aria-controls={`companion-panel-${companion.id}`}
                className="relative w-full p-4 text-right transition glass-hover press-effect"
              >
              {/* Top row */}
              <div className="relative flex items-start gap-3">
                {/* Icon avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
                >
                  {companion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-arabic text-sm leading-6" style={{ color: "var(--fg)" }}>
                    {companion.name}
                  </p>
                  {companion.title && (
                    <p className="text-xs font-arabic" style={{ color: "var(--accent)" }}>
                      {companion.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {companion.death && (
                      <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                        الوفاة: {companion.death}
                      </span>
                    )}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                    >
                      {COMPANION_CATEGORIES.find((cat) => cat.key === companion.category)?.label ?? companion.category}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 mt-1 transition-transform duration-200"
                  style={{
                    color: "var(--muted)",
                    transform: isOpen ? "rotate(90deg)" : "rotate(180deg)",
                  }}
                />
              </div>
              </button>

              {/* Expandable bio */}
              <div
                id={`companion-panel-${companion.id}`}
                hidden={!isOpen}
                className="relative px-4 pb-4 text-right font-arabic text-sm leading-7"
                style={{
                  color: "var(--fg)",
                  borderTop: "1px solid var(--stroke)",
                }}
              >
                  {companion.brief}
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const text = `${companion.name}${companion.title ? ` — ${companion.title}` : ""}\n\n${companion.brief}`;
                        if (navigator.share) {
                          await navigator.share({ text }).catch(() => {});
                        } else {
                          await navigator.clipboard.writeText(text).catch(() => {});
                          toast.success("تم النسخ");
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--stroke)] bg-[var(--card)] px-3 py-1.5 text-xs transition-all glass-hover press-effect"
                      style={{ color: "var(--fg)" }}
                    >
                      <Share2 size={13} />
                      مشاركة
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(companion.id, e)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all glass-hover press-effect"
                      style={bookmarks.has(companion.id)
                        ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }
                        : { background: "var(--card)", color: "var(--fg)", borderColor: "var(--stroke)", opacity: 0.8 }}
                    >
                      {bookmarks.has(companion.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      {bookmarks.has(companion.id) ? "محفوظ" : "حفظ"}
                    </button>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
