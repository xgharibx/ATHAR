import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Copy, Check } from "lucide-react";
import { DUAS_CATEGORIES, type DuaCategory } from "@/data/duas";

export function DuasPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<string>("rabbana");
  const [copied, setCopied] = React.useState<string | null>(null);

  const category: DuaCategory =
    DUAS_CATEGORIES.find((c) => c.id === activeTab) ?? DUAS_CATEGORIES[0]!;

  function copyDua(id: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div dir="rtl" className="min-h-screen pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-0"
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
              الأدعية المأثورة
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              أدعية قرآنية وسنة نبوية وأدعية الحج
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-none">
          {DUAS_CATEGORIES.map((cat) => (
            <button
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
        </div>
      </div>

      {/* Duas list */}
      <div className="px-4 pt-4 space-y-4">
        {category.duas.map((dua, idx) => (
          <div
            key={dua.id}
            className="rounded-2xl p-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            {/* Number */}
            <div className="flex items-start justify-between mb-3">
              <button
                onClick={() => copyDua(dua.id, dua.arabic)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--accent)" }}
              >
                {copied === dua.id ? <Check size={15} /> : <Copy size={15} />}
              </button>
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
        ))}
      </div>
    </div>
  );
}
