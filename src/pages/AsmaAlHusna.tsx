import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Volume2 } from "lucide-react";
import { ASMA_AL_HUSNA } from "@/data/asmaAlHusna";

export function AsmaAlHusnaPage() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return ASMA_AL_HUSNA;
    const q = query.trim().toLowerCase();
    return ASMA_AL_HUSNA.filter(
      (n) =>
        n.arabic.includes(q) ||
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q)
    );
  }, [query]);

  function speak(arabic: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(arabic);
    utt.lang = "ar-SA";
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  }

  return (
    <div dir="rtl" className="min-h-screen pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl"
            style={{ background: "var(--card-bg)", color: "var(--fg)" }}
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--fg)" }}>
              أسماء الله الحسنى
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              ٩٩ اسمًا من أسماء الله تعالى
            </p>
          </div>
        </div>
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <Search size={15} style={{ color: "var(--accent)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو المعنى..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--fg)" }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {filtered.map((name) => {
          const isExpanded = expandedId === name.id;
          return (
            <button
              key={name.id}
              onClick={() => setExpandedId(isExpanded ? null : name.id)}
              className="text-right rounded-2xl p-4 transition-all duration-200"
              style={{
                background: isExpanded ? "var(--accent)" : "var(--card-bg)",
                border: "1px solid var(--card-border)",
                color: isExpanded ? "#fff" : "var(--fg)",
                gridColumn: isExpanded ? "span 2" : undefined,
              }}
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
              </div>
              {isExpanded && (
                <div className="mt-3 text-sm opacity-90 leading-relaxed text-right">
                  {name.benefit}
                </div>
              )}
              {isExpanded && (
                <div className="flex justify-end mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(name.arabic);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
                    style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}
                  >
                    <Volume2 size={13} />
                    استمع
                  </button>
                </div>
              )}
            </button>
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
