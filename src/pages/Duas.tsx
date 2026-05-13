import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Copy, Check, Heart, Search, Share2 } from "lucide-react";
import { DUAS_CATEGORIES, type DuaCategory } from "@/data/duas";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

export function DuasPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [activeTab, setActiveTab] = React.useState<string>("rabbana");
  const [copied, setCopied] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const duaFavorites = useNoorStore((s) => s.duaFavorites);
  const toggleDuaFavorite = useNoorStore((s) => s.toggleDuaFavorite);

  const showFavorites = activeTab === "__favorites__";

  const category: DuaCategory =
    DUAS_CATEGORIES.find((c) => c.id === activeTab) ?? DUAS_CATEGORIES[0]!;

  const displayedDuas = React.useMemo(() => {
    let list = showFavorites
      ? DUAS_CATEGORIES.flatMap((c) => c.duas).filter((d) => duaFavorites.includes(d.id))
      : category.duas;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.arabic.includes(q) ||
          (d.meaning ?? "").toLowerCase().includes(q) ||
          (d.source ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [showFavorites, category, query, duaFavorites]);

  function copyDua(id: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(null), 2000);
    }).catch(() => toast.error("تعذّر النسخ"));
  }

  async function shareDua(text: string, source?: string) {
    const full = `${text}${source ? `\n\n${source}` : ""}\n\n• ATHAR أثر`;
    try {
      if (navigator.share) { await navigator.share({ text: full }); }
      else { await navigator.clipboard.writeText(full); toast.success("تم النسخ"); }
    } catch {
      try { await navigator.clipboard.writeText(full); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); }
    }
  }

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-gradient-to-bl from-emerald-500/15 to-green-400/10 pointer-events-none opacity-55"
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
                  <span className="text-lg" aria-hidden="true">🤲</span>
                  <div className="text-xs opacity-60">أدعية مأثورة</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#059669" }}>الأدعية المأثورة</h1>
                <div className="text-sm opacity-70 mt-1">أدعية قرآنية وسنة نبوية وأدعية الكرب والحياة اليومية</div>
              </div>
            </div>
            {/* Search */}
            <div
              role="search"
              aria-label="بحث في الأدعية"
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
            >
              <Search size={15} style={{ color: "#059669" }} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="بحث في الأدعية"
                placeholder="ابحث في الأدعية..."
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--fg)" }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="opacity-50 text-xs" aria-label="مسح البحث">✕</button>
              )}
            </div>
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-orientation="horizontal" aria-label="تصفية الأدعية"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
              {DUAS_CATEGORIES.map((cat) => (
                <button type="button"
                  key={cat.id}
                  role="tab"
                  aria-controls="duas-list-panel"
                  aria-selected={activeTab === cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: activeTab === cat.id ? "#059669" : "var(--card)",
                    color: activeTab === cat.id ? "#fff" : "var(--fg)",
                    border: "1px solid var(--stroke)",
                  }}
                >
                  {cat.icon} {cat.label} <span className="opacity-60 text-xs">({cat.duas.length})</span>
                </button>
              ))}
              <button type="button"
                key="__favorites__"
                role="tab"
                aria-controls="duas-list-panel"
                aria-selected={activeTab === "__favorites__"}
                onClick={() => setActiveTab("__favorites__")}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: activeTab === "__favorites__" ? "#ef4444" : "var(--card)",
                  color: activeTab === "__favorites__" ? "#fff" : "var(--fg)",
                  border: "1px solid var(--stroke)",
                }}
              >
                ❤️ المفضلة ({duaFavorites.length})
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Visually hidden live region for result count */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {query ? `نتائج البحث: ${displayedDuas.length} دعاء` : null}
      </div>
      {/* Duas list */}
      <div id="duas-list-panel" className="px-4 pt-4 space-y-4" role="list" aria-label="قائمة الأدعية">
        {/* Category stats row */}
        {!showFavorites && !query && (
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs opacity-50" style={{ color: "var(--fg)" }}>
              {displayedDuas.length} دعاء
            </span>
            <span className="text-xs opacity-40 font-arabic" style={{ color: "var(--fg)" }}>
              {category.icon} {category.label}
            </span>
          </div>
        )}
        {displayedDuas.length === 0 && (
          <div className="text-center py-16 opacity-50" style={{ color: "var(--fg)" }}>
            {showFavorites ? "لا توجد أدعية مفضلة بعد" : "لا توجد نتائج"}
          </div>
        )}
        {displayedDuas.map((dua, idx) => {
          const isFav = duaFavorites.includes(dua.id);
          return (
            <div
              key={dua.id}
              role="listitem"
              className="rounded-2xl p-4 cv-auto"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
            >
              {/* Number */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1">
                  <button type="button"
                    aria-label="مشاركة الدعاء"
                    onClick={() => void shareDua(dua.arabic, dua.source)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--fg)", opacity: 0.45 }}
                  >
                    <Share2 size={14} aria-hidden="true" />
                  </button>
                  <button type="button"
                    aria-label={copied === dua.id ? "تم النسخ" : "نسخ الدعاء"}
                    onClick={() => copyDua(dua.id, dua.arabic)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    {copied === dua.id ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  </button>
                  <button type="button"
                    aria-label={isFav ? "إلغاء التفضيل" : "إضافة للمفضلة"}
                    aria-pressed={isFav}
                    onClick={() => toggleDuaFavorite(dua.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: isFav ? "#ef4444" : "var(--fg)", opacity: isFav ? 1 : 0.4 }}
                  >
                    <Heart size={14} aria-hidden="true" fill={isFav ? "#ef4444" : "none"} />
                  </button>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent)", color: "var(--on-accent)", opacity: 0.85 }}
                >
                  {idx + 1}
                </span>
              </div>

              {/* Arabic */}
              <p
                className="text-xl leading-loose text-right mb-3"
                style={{ color: "var(--fg)", fontFamily: "var(--font-arabic, inherit)" }}
              >
                {dua.arabic}
              </p>

              {/* Divider */}
              <div className="h-px mb-3" style={{ background: "var(--stroke)" }} />

              {/* Meaning */}
              <p className="text-sm leading-relaxed opacity-80 text-right mb-2" style={{ color: "var(--fg)" }}>
                {dua.meaning}
              </p>

              {/* Source */}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
              >
                {dua.source}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

