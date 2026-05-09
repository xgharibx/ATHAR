import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Search, X, Share2 } from "lucide-react";
import { SEERAH_EVENTS, SEERAH_CATEGORIES, type SeerahEvent } from "@/data/seerahTimeline";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

export default function SeerahTimeline() {
  const navigate = useNavigate();
  useScrollRestoration();
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
                <Clock size={19} className="text-[var(--accent)]" />
                <h1 className="text-lg font-bold">السيرة النبوية</h1>
              </div>
              <div className="text-xs opacity-55 mt-1">{filtered.length} حدث</div>
            </div>
          </div>
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            <button type="button"
              onClick={() => setActiveCategory("all")}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-arabic transition glass-hover press-effect"
              style={{
                background: activeCategory === "all" ? "var(--accent)" : "var(--card)",
                color: activeCategory === "all" ? "var(--on-accent)" : "var(--muted)",
                border: activeCategory === "all" ? "1px solid transparent" : "1px solid var(--stroke)",
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
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-arabic transition whitespace-nowrap glass-hover press-effect"
                  style={{
                    background: isActive ? "var(--accent)" : "var(--card)",
                    color: isActive ? "var(--on-accent)" : "var(--muted)",
                    border: isActive ? "1px solid transparent" : "1px solid var(--stroke)",
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
              className="h-9 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] pr-8 pl-8 text-sm outline-none focus:border-accent-45"
              style={{ color: "var(--fg)" }}
            />
            {query && (
              <button type="button" aria-label="مسح البحث" onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 transition-opacity">
                <X size={13} />
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <div className="relative z-10 px-4 pt-4">
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 right-5 w-0.5"
            style={{ background: "var(--stroke)" }}
          />

          <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
                لا توجد نتائج
              </div>
            ) : filtered.map((event) => {
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
                  <div className="relative mb-1 min-w-0 flex-1 overflow-hidden rounded-3xl p-4 glass glass-hover">
                    <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
                    <div className="relative">
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
                        className="flex items-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--card)] px-2 py-1 text-[11px] opacity-70 transition hover:opacity-100 press-effect"
                        style={{ color: "var(--fg)" }}
                        aria-label="مشاركة"
                      >
                        <Share2 size={12} />
                        مشاركة
                      </button>
                    </div>
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
