import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users, Search, X, Bookmark, BookmarkCheck } from "lucide-react";
import { COMPANIONS, COMPANION_CATEGORIES, type Companion } from "@/data/companions";
import toast from "react-hot-toast";

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
    <div className="min-h-screen-safe pb-24" style={{ background: "var(--bg)" }} dir="rtl">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90"
            style={{ background: "var(--card-bg)" }}
            aria-label="رجوع"
          >
            <ChevronRight size={18} style={{ color: "var(--fg)" }} />
          </button>
          <div className="flex items-center gap-2">
            <Users size={20} style={{ color: "var(--accent)" }} />
            <h1 className="text-lg font-bold font-arabic" style={{ color: "var(--fg)" }}>
              الصحابة الكرام
            </h1>
          </div>
          <span
            className="mr-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--card-bg)", color: "var(--muted)" }}
          >
            {filtered.length}
          </span>
          <button
            type="button"
            onClick={() => setShowBookmarksOnly((v) => !v)}
            className="p-1.5 rounded-xl transition-all"
            style={showBookmarksOnly
              ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }
              : { background: "var(--card-bg)", color: "var(--fg)" }}
            aria-label="المحفوظة"
          >
            <Bookmark size={16} />
          </button>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          <button type="button"
            onClick={() => setActiveCategory("all")}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-arabic transition"
            style={{
              background: activeCategory === "all" ? "var(--accent)" : "var(--card-bg)",
              color: activeCategory === "all" ? "#fff" : "var(--muted)",
              border: "1px solid var(--card-border)",
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
                onClick={() => setActiveCategory(cat.key)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-arabic transition whitespace-nowrap"
                style={{
                  background: isActive ? "var(--accent)" : "var(--card-bg)",
                  color: isActive ? "#fff" : "var(--muted)",
                  border: "1px solid var(--card-border)",
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
            className="w-full h-9 pr-8 pl-8 rounded-2xl text-sm outline-none border"
            style={{ background: "var(--card-bg)", color: "var(--fg)", borderColor: "var(--card-border)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div className="p-4 grid grid-cols-1 gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 opacity-50 text-sm font-arabic" style={{ color: "var(--fg)" }}>
            {showBookmarksOnly ? "لا توجد صحابة محفوظون" : "لا توجد نتائج"}
          </div>
        )}
        {filtered.map((companion) => {
          const isOpen = expanded === companion.id;
          return (
            <button type="button"
              key={companion.id}
              onClick={() => setExpanded(isOpen ? null : companion.id)}
              className="w-full text-right rounded-2xl p-4 transition active:scale-[0.98]"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              {/* Top row */}
              <div className="flex items-start gap-3">
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

              {/* Expandable bio */}
              {isOpen && (
                <div
                  className="mt-3 pt-3 text-right font-arabic text-sm leading-7"
                  style={{
                    color: "var(--fg)",
                    borderTop: "1px solid var(--card-border)",
                  }}
                >
                  {companion.brief}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(companion.id, e)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                      style={bookmarks.has(companion.id)
                        ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }
                        : { background: "var(--card-border)", color: "var(--fg)", border: "1px solid var(--card-border)", opacity: 0.7 }}
                    >
                      {bookmarks.has(companion.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      {bookmarks.has(companion.id) ? "محفوظ" : "حفظ"}
                    </button>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
