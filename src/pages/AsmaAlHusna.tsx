import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, Heart, Search, Share2 } from "lucide-react";
import { ASMA_AL_HUSNA } from "@/data/asmaAlHusna";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";

type FilterTab = "all" | "memorized" | "favorites";

export function AsmaAlHusnaPage() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");

  const memorized = useNoorStore((s) => s.asmaHusnaMemorized);
  const favorites = useNoorStore((s) => s.asmaHusnaFavorites);
  const toggleMemorized = useNoorStore((s) => s.toggleAsmaMemorized);
  const toggleFavorite = useNoorStore((s) => s.toggleAsmaFavorite);

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
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button type="button"
            onClick={() => navigate(-1)}
            aria-label="رجوع"
            className="p-2 rounded-xl"
            style={{ background: "var(--card-bg)", color: "var(--fg)" }}
          >
            <ArrowRight size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg" style={{ color: "var(--fg)" }}>
              أسماء الله الحسنى
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
                ٩٩ اسمًا من أسماء الله تعالى
              </p>
              {memorizedCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                  حفظ {memorizedCount}/99 ({pct}%)
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <Search size={15} style={{ color: "var(--accent)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو المعنى..."
            aria-label="بحث في أسماء الله الحسنى"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--fg)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="opacity-50 text-xs">✕</button>
          )}
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "memorized", "favorites"] as FilterTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: tab === t ? "var(--accent)" : "var(--card-bg)",
                color: tab === t ? "#fff" : "var(--fg)",
                border: "1px solid var(--card-border)",
              }}
            >
              {t === "all" ? `الكل (${ASMA_AL_HUSNA.length})` : t === "memorized" ? `🧠 محفوظة (${memorized.length})` : `❤️ مفضلة (${favorites.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {filtered.map((name) => {
          const isExpanded = expandedId === name.id;
          const isMem = memorized.includes(name.id);
          const isFav = favorites.includes(name.id);
          return (
            <div
              key={name.id}
              className="rounded-2xl transition-all duration-200"
              style={{
                background: isExpanded ? "var(--accent)" : "var(--card-bg)",
                border: `1px solid ${isExpanded ? "transparent" : "var(--card-border)"}`,
                color: isExpanded ? "#fff" : "var(--fg)",
                gridColumn: isExpanded ? "span 2" : undefined,
              }}
            >
              <button
                type="button"
                className="w-full text-right p-4"
                onClick={() => setExpandedId(isExpanded ? null : name.id)}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="text-xs opacity-60 mt-1"
                    style={{ color: isExpanded ? "rgba(255,255,255,0.8)" : "var(--fg)" }}
                  >
                    {name.id}
                  </span>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
                      {name.arabic}
                    </div>
                    <div className="text-xs opacity-75">{name.transliteration}</div>
                    <div className="text-sm font-semibold mt-1">{name.meaning}</div>
                  </div>
                  {isMem && (
                    <span className="text-xs mt-1" title="محفوظة">🧠</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-3 text-sm opacity-90 leading-relaxed text-right">
                    {name.benefit}
                  </div>
                )}
              </button>
              {/* Action row */}
              <div className="flex items-center justify-end gap-1 px-3 pb-2 pt-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void shareAsma(name); }}
                  aria-label="مشاركة"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: isExpanded ? "rgba(255,255,255,0.6)" : "var(--fg)", opacity: 0.5 }}
                >
                  <Share2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMemorized(name.id); }}
                  aria-label={isMem ? "إلغاء الحفظ" : "تمييز كمحفوظ"}
                  className="p-1.5 rounded-lg transition-colors"
                  title={isMem ? "إلغاء الحفظ" : "تمييز كمحفوظ"}
                  style={{ color: isMem ? (isExpanded ? "#fff" : "var(--accent)") : (isExpanded ? "rgba(255,255,255,0.5)" : "var(--fg)"), opacity: isMem ? 1 : 0.4 }}
                >
                  <Brain size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(name.id); }}
                  aria-label={isFav ? "إلغاء التفضيل" : "إضافة للمفضلة"}
                  className="p-1.5 rounded-lg transition-colors"
                  title={isFav ? "إلغاء التفضيل" : "إضافة للمفضلة"}
                  style={{ color: isFav ? "#ef4444" : (isExpanded ? "rgba(255,255,255,0.5)" : "var(--fg)"), opacity: isFav ? 1 : 0.4 }}
                >
                  <Heart size={14} fill={isFav ? "#ef4444" : "none"} />
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
