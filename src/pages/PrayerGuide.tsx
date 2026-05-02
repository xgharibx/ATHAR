import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { PRAYER_STEPS } from "@/data/prayerGuide";

export function PrayerGuidePage() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = React.useState<number | null>(1);

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl"
            style={{ background: "var(--card-bg)", color: "var(--fg)" }}
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--fg)" }}>
              كيفية الصلاة
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              دليل مُفصَّل خطوة بخطوة
            </p>
          </div>
        </div>
      </div>

      {/* Intro banner */}
      <div
        className="mx-4 mt-4 rounded-2xl p-4 text-center"
        style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          صَلُّوا كَمَا رَأَيْتُمُونِي أُصَلِّي
        </p>
        <p className="text-xs opacity-60 mt-1" style={{ color: "var(--fg)" }}>رواه البخاري</p>
      </div>

      {/* Steps */}
      <div className="px-4 mt-4 space-y-2">
        {PRAYER_STEPS.map((step) => {
          const isOpen = expandedId === step.id;
          return (
            <div
              key={step.id}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: isOpen ? "var(--accent)" : "var(--card-bg)",
                border: "1px solid var(--card-border)",
                color: isOpen ? "#fff" : "var(--fg)",
              }}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : step.id)}
                className="w-full flex items-center gap-3 p-4 text-right"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronUp size={16} style={{ color: isOpen ? "rgba(255,255,255,0.8)" : "var(--accent)" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "var(--accent)" }} />
                  )}
                </div>
                <span className="text-xl">{step.position}</span>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-bold text-sm">{step.title}</span>
                    <span
                      className="text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                      style={{
                        background: isOpen ? "rgba(255,255,255,0.3)" : "var(--accent)",
                        color: isOpen ? "#fff" : "#fff",
                      }}
                    >
                      {step.id}
                    </span>
                  </div>
                  {step.arabic && (
                    <p
                      className="text-xs opacity-75 mt-0.5"
                      style={{ fontFamily: "var(--font-arabic, inherit)" }}
                    >
                      {step.arabic.length > 50 ? step.arabic.slice(0, 50) + "..." : step.arabic}
                    </p>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="h-px mb-3" style={{ background: "rgba(255,255,255,0.25)" }} />
                  {step.arabic && (
                    <p
                      className="text-base leading-loose text-right mb-3 font-medium"
                      style={{ fontFamily: "var(--font-arabic, inherit)", color: "rgba(255,255,255,0.95)" }}
                    >
                      {step.arabic}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-right" style={{ color: "rgba(255,255,255,0.88)" }}>
                    {step.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
