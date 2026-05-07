import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Copy, Check, Heart, Search, Share2 } from "lucide-react";
import { DUAS_CATEGORIES, type DuaCategory } from "@/data/duas";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";

export function DuasPage() {
  const navigate = useNavigate();
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
    });
  }

  async function shareDua(text: string, source?: string) {
    const full = `${text}${source ? `\n\n${source}` : ""}\n\n• ATHAR أثر`;
    try {
      if (navigator.share) { await navigator.share({ text: full }); }
      else { await navigator.clipboard.writeText(full); toast.success("تم النسخ"); }
    } catch {
      try { await navigator.clipboard.writeText(full); toast.success("تم النسخ"); } catch {}
    }
  }

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-0"
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
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--fg)" }}>
              الأدعية المأثورة
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              أدعية قرآنية وسنة نبوية وأدعية الحج
            </p>
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
            placeholder="ابحث في الأدعية..."
            aria-label="بحث في الأدعية"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--fg)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="opacity-50 text-xs">✕</button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-none">
          {DUAS_CATEGORIES.map((cat) => (
            <button type="button"
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeTab === cat.id ? "var(--accent)" : "var(--card-bg)",
                color: activeTab === cat.id ? "#fff" : "var(--fg)",
                border: "1px solid var(--card-border)",
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
          <button type="button"
            key="__favorites__"
            onClick={() => setActiveTab("__favorites__")}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: activeTab === "__favorites__" ? "#ef4444" : "var(--card-bg)",
              color: activeTab === "__favorites__" ? "#fff" : "var(--fg)",
              border: "1px solid var(--card-border)",
            }}
          >
            ❤️ المفضلة ({duaFavorites.length})
          </button>
        </div>
      </div>

      {/* Duas list */}
      <div className="px-4 pt-4 space-y-4">
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
              className="rounded-2xl p-4"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
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
                    <Share2 size={14} />
                  </button>
                  <button type="button"
                    aria-label={copied === dua.id ? "تم النسخ" : "نسخ الدعاء"}
                    onClick={() => copyDua(dua.id, dua.arabic)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    {copied === dua.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <button type="button"
                    aria-label={isFav ? "إلغاء التفضيل" : "إضافة للمفضلة"}
                    onClick={() => toggleDuaFavorite(dua.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: isFav ? "#ef4444" : "var(--fg)", opacity: isFav ? 1 : 0.4 }}
                  >
                    <Heart size={14} fill={isFav ? "#ef4444" : "none"} />
                  </button>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent)", color: "#fff", opacity: 0.85 }}
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
              <div className="h-px mb-3" style={{ background: "var(--card-border)" }} />

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

