import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, Copy, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { PRAYER_STEPS } from "@/data/prayerGuide";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

async function sharePrayerStep(step: { title: string; arabic?: string; description: string }) {
  const text = [step.title, step.arabic, step.description].filter(Boolean).join("\n\n");
  if (navigator.share) {
    await navigator.share({ text }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("تم النسخ");
  }
}

export function PrayerGuidePage() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = React.useState<number | null>(1);
  useScrollRestoration();

  const shareFullGuide = async () => {
    const lines = PRAYER_STEPS.map((s) => {
      const parts = [`${s.id}. ${s.title}`, s.arabic, s.description].filter(Boolean);
      return parts.join("\n");
    });
    const text = `دليل الصلاة خطوة بخطوة\n\n${lines.join("\n\n")}\n\n• أثر`;
    if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
    else { await navigator.clipboard.writeText(text).catch(() => {}); toast.success("تم النسخ"); }
  };

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-gradient-to-bl from-emerald-500/15 to-teal-500/10 pointer-events-none opacity-55"
            style={{ borderRadius: "inherit" }}
          />
          <div className="relative">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="رجوع"
                className="mt-1 p-2 rounded-xl flex-shrink-0"
                style={{ background: "var(--card)", color: "var(--fg)" }}
              >
                <ArrowRight size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🕌</span>
                  <div className="text-xs opacity-60">دليل الصلاة</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#10b981" }}>كيفية الصلاة</h1>
                <div className="text-sm opacity-70 mt-1">دليل مُفصَّل خطوة بخطوة</div>
              </div>
              <button
                type="button"
                onClick={shareFullGuide}
                className="mt-1 p-2 rounded-xl opacity-60 hover:opacity-100 transition"
                style={{ background: "var(--card)", color: "var(--fg)" }}
                aria-label="مشاركة الدليل"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </Card>
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
                background: isOpen ? "var(--accent)" : "var(--card)",
                border: "1px solid var(--stroke)",
                color: isOpen ? "#fff" : "var(--fg)",
              }}
            >
              <button type="button"
                onClick={() => setExpandedId(isOpen ? null : step.id)}
                className="w-full flex items-center gap-3 p-4 text-right"
                aria-expanded={isOpen}
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
                  <div className="flex items-center gap-2 justify-end mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText([step.title, step.arabic, step.description].filter(Boolean).join("\n\n")).catch(() => {});
                        toast.success("تم النسخ");
                      }}
                      className="p-2 rounded-xl transition-opacity hover:opacity-75"
                      style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => sharePrayerStep(step)}
                      className="p-2 rounded-xl transition-opacity hover:opacity-75"
                      style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
