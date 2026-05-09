import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Clock, Search, X, Share2 } from "lucide-react";
import { SEERAH_EVENTS, SEERAH_CATEGORIES, type SeerahEvent } from "@/data/seerahTimeline";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function SeerahTimeline() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<SeerahEvent["category"] | "all">("all");
  const [query, setQuery] = useState("");

  const shareEvent = React.useCallback(async (event: SeerahEvent) => {
    const text = `${event.title} (${event.year})\n\n${event.description}\n\n• ATHAR أثر`;
    try {
      if (navigator.share) { await navigator.share({ text }); }
      else { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
    } catch {
      try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch {}
    }
  }, []);

  const filtered = React.useMemo(() => {
    let events = activeCategory === "all"
      ? SEERAH_EVENTS
      : SEERAH_EVENTS.filter((e) => e.category === activeCategory);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      events = events.filter((e) =>
        e.title.includes(query.trim()) ||
        e.description.includes(query.trim()) ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    return events;
  }, [activeCategory, query]);

  const getCategoryColor = (cat: SeerahEvent["category"]): string => {
    return SEERAH_CATEGORIES.find((c) => c.key === cat)?.color ?? "#6b7280";
  };

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
            <Clock size={20} style={{ color: "var(--accent)" }} />
            <h1 className="text-lg font-bold font-arabic" style={{ color: "var(--fg)" }}>
              السيرة النبوية
            </h1>
          </div>
          <span
            className="mr-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--card-bg)", color: "var(--muted)" }}
          >
            {filtered.length} حدث
          </span>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button type="button"
            onClick={() => setActiveCategory("all")}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-arabic transition"
            style={{
              background: activeCategory === "all" ? "var(--accent)" : "var(--card-bg)",
              color: activeCategory === "all" ? "#fff" : "var(--muted)",
              border: "1px solid var(--card-border)",
            }}
          >
            الكل
          </button>
          {SEERAH_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button type="button"
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-arabic transition whitespace-nowrap"
                style={{
                  background: isActive ? cat.color : "var(--card-bg)",
                  color: isActive ? "#fff" : "var(--muted)",
                  border: `1px solid ${isActive ? cat.color : "var(--card-border)"}`,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search box */}
        <div className="relative mt-2">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
          <input
            type="search"
            dir="rtl"
            placeholder="ابحث في أحداث السيرة…"
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

      {/* Timeline */}
      <div className="px-4 pt-4">
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 right-5 w-0.5"
            style={{ background: "var(--card-border)" }}
          />

          <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
                لا توجد نتائج
              </div>
            ) : filtered.map((event, idx) => {
              const color = getCategoryColor(event.category);
              return (
                <div key={event.id} className="flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
                      style={{ background: `${color}22`, border: `2px solid ${color}` }}
                    >
                      {event.icon}
                    </div>
                  </div>

                  {/* Event card */}
                  <div
                    className="flex-1 min-w-0 rounded-2xl p-4 mb-1"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  >
                    {/* Year badge + category */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-[11px] font-bold font-arabic px-2 py-0.5 rounded-full"
                        style={{ background: `${color}22`, color }}
                      >
                        {event.year}
                      </span>
                      {event.yearEn && (
                        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                          {event.yearEn}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm font-arabic leading-6 mb-1" style={{ color: "var(--fg)" }}>
                      {event.title}
                    </h3>
                    <p className="text-xs font-arabic leading-6" style={{ color: "var(--muted)" }}>
                      {event.description}
                    </p>
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => void shareEvent(event)}
                        className="flex items-center gap-1 text-[11px] opacity-50 hover:opacity-80 transition px-2 py-1 rounded-lg"
                        style={{ color: "var(--fg)" }}
                        aria-label="مشاركة"
                      >
                        <Share2 size={12} />
                        مشاركة
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p
          className="text-center text-xs font-arabic mt-6 mb-4 opacity-50"
          style={{ color: "var(--muted)" }}
        >
          ﷺ اللهم صلِّ وسلم على نبينا محمد
        </p>
      </div>
    </div>
  );
}
