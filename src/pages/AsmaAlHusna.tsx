import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, Heart, Search, Share2, Star } from "lucide-react";
import { ASMA_AL_HUSNA } from "@/data/asmaAlHusna";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

type FilterTab = "all" | "memorized" | "favorites";

function getDailyAsmaId(): number {
  const today = new Date();
  const dayIndex = Math.floor(today.getTime() / 86400000);
  return (dayIndex % 99) + 1;
}

export function AsmaAlHusnaPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");

  const memorized = useNoorStore((s) => s.asmaHusnaMemorized);
  const favorites = useNoorStore((s) => s.asmaHusnaFavorites);
  const toggleMemorized = useNoorStore((s) => s.toggleAsmaMemorized);
  const toggleFavorite = useNoorStore((s) => s.toggleAsmaFavorite);

  const dailyAsmaId = React.useMemo(() => getDailyAsmaId(), []);

  const filtered = React.useMemo(() => {
    let list = ASMA_AL_HUSNA;
    if (tab === "memorized") list = list.filter((n) => memorized.includes(n.id));
    else if (tab === "favorites") list = list.filter((n) => favorites.includes(n.id));
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (n) =>
        n.arabic.includes(q) ||
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q)
    );
  }, [query, tab, memorized, favorites]);

  const memorizedCount = memorized.length;
  const pct = Math.round((memorizedCount / 99) * 100);

  const shareAsma = React.useCallback(async (name: (typeof ASMA_AL_HUSNA)[number]) => {
    const text = `${name.arabic} — ${name.meaning}\n\n${name.benefit}\n\n• ATHAR أثر`;
    try {
      if (navigator.share) { await navigator.share({ text }); }
      else { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
    } catch {
      try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch {}
    }
  }, []);

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card — matches DhikrList style */}
      <div className="px-4 pt-4 space-y-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-gradient-to-bl from-amber-400/15 to-yellow-300/10 pointer-events-none opacity-55"
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
                  <span className="text-lg">✨</span>
                  <div className="text-xs opacity-60">أسماء الله</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#f59e0b" }}>أسماء الله الحسنى</h1>
                <div className="text-sm opacity-70 mt-1 tabular-nums">
                  ٩٩ اسمًا من أسماء الله تعالى
                  {memorizedCount > 0 && ` • حفظ ${memorizedCount}/99 (${pct}%)`}
                </div>
              </div>
            </div>
            {memorizedCount > 0 && (
              <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: "var(--card-2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: "#f59e0b" }}
                />
              </div>
            )}
            {/* Search */}
            <div
              role="search"
              aria-label="بحث في أسماء الله الحسنى"
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
            >
              <Search size={15} style={{ color: "#f59e0b" }} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو المعنى..."
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="none"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--fg)" }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="opacity-50 text-xs" aria-label="مسح البحث">✕</button>
              )}
            </div>
            {/* Filter tabs */}
            <div className="flex gap-2" role="tablist" aria-label="تصفية الأسماء"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
              {(["all", "memorized", "favorites"] as FilterTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: tab === t ? "#f59e0b" : "var(--card)",
                    color: tab === t ? "var(--on-accent)" : "var(--fg)",
                    border: "1px solid var(--stroke)",
                  }}
                >
                  {t === "all" ? `الكل (${ASMA_AL_HUSNA.length})` : t === "memorized" ? `🧠 محفوظة (${memorized.length})` : `❤️ مفضلة (${favorites.length})`}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Visually hidden live region for search result count */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {query ? `نتائج البحث: ${filtered.length} من أسماء الله الحسنى` : null}
      </div>
      {/* Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3" role="list" aria-label="أسماء الله الحسنى">
        {filtered.map((name) => {
          const isExpanded = expandedId === name.id;
          const isMem = memorized.includes(name.id);
          const isFav = favorites.includes(name.id);
          return (
            <div
              key={name.id}
              role="listitem"
              className="rounded-2xl transition-all duration-200 cv-auto"
              style={{
                background: isExpanded ? "var(--accent)" : "var(--card)",
                border: `1px solid ${isExpanded ? "transparent" : "var(--stroke)"}`,
                color: isExpanded ? "var(--on-accent)" : "var(--fg)",
                gridColumn: isExpanded ? "span 2" : undefined,
              }}
            >
              <button
                type="button"
                className="w-full text-right p-4"
                aria-expanded={isExpanded}
                aria-controls={`asma-panel-${name.id}`}
                aria-label={`${name.arabic} — ${name.meaning}`}
                onClick={() => setExpandedId(isExpanded ? null : name.id)}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="text-xs opacity-60 mt-1"
                    style={{ color: isExpanded ? "color-mix(in srgb, var(--on-accent) 55%, transparent)" : "var(--fg)" }}
                  >
                    {name.id}
                  </span>
                  <div className="flex-1 text-center">
                    {name.id === dailyAsmaId && (
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star size={10} aria-hidden="true" className="fill-current" style={{ color: isExpanded ? "var(--on-accent)" : "var(--accent)" }} />
                        <span className="text-[10px] font-semibold" style={{ color: isExpanded ? "var(--on-accent)" : "var(--accent)" }}>اسم اليوم</span>
                      </div>
                    )}
                    <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
                      {name.arabic}
                    </div>
                    <div className="text-xs opacity-75" lang="en">{name.transliteration}</div>
                    <div className="text-sm font-semibold mt-1">{name.meaning}</div>
                  </div>
                  {isMem && (
                    <span className="text-xs mt-1" title="محفوظة">🧠</span>
                  )}
                </div>
              </button>
              {/* Benefit panel */}
              <div
                id={`asma-panel-${name.id}`}
                hidden={!isExpanded}
                className="px-4 pb-3 text-sm opacity-90 leading-relaxed text-right"
                style={{ color: "color-mix(in srgb, var(--on-accent) 88%, transparent)" }}
              >
                {name.benefit}
              </div>
              {/* Action row */}
              <div className="flex items-center justify-end gap-1 px-3 pb-2 pt-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void shareAsma(name); }}
                  aria-label="مشاركة"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: isExpanded ? "color-mix(in srgb, var(--on-accent) 50%, transparent)" : "var(--fg)", opacity: 0.5 }}
                >
                  <Share2 size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMemorized(name.id); }}
                  aria-label={isMem ? "إلغاء الحفظ" : "تمييز كمحفوظ"}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: isMem ? (isExpanded ? "var(--on-accent)" : "var(--accent)") : (isExpanded ? "color-mix(in srgb, var(--on-accent) 40%, transparent)" : "var(--fg)"), opacity: isMem ? 1 : 0.4 }}
                >
                  <Brain size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(name.id); }}
                  aria-label={isFav ? "إلغاء التفضيل" : "إضافة للمفضلة"}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: isFav ? "#ef4444" : (isExpanded ? "color-mix(in srgb, var(--on-accent) 40%, transparent)" : "var(--fg)"), opacity: isFav ? 1 : 0.4 }}
                >
                  <Heart size={14} aria-hidden="true" fill={isFav ? "#ef4444" : "none"} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 opacity-50" style={{ color: "var(--fg)" }}>
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}
