import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { WUDU_STEPS } from "@/data/wuduGuide";

export function WuduGuidePage() {
  const navigate = useNavigate();
  const [done, setDone] = React.useState<Set<number>>(new Set());

  function toggle(id: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setDone(new Set());
  }

  const allDone = done.size === WUDU_STEPS.length;

  const shareFullGuide = async () => {
    const lines = WUDU_STEPS.map((s, i) => `${i + 1}. ${s.title}\n${s.description}`);
    const text = `دليل الوضوء خطوة بخطوة\n\n${lines.join("\n\n")}\n\n• أثر`;
    if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
    else { await navigator.clipboard.writeText(text).catch(() => {}); toast.success("تم النسخ"); }
  };

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center justify-between">
          <button type="button"
            onClick={reset}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: "var(--card-bg)",
              color: "var(--accent)",
              border: "1px solid var(--card-border)",
            }}
          >
            إعادة
          </button>
          <div className="text-center flex-1">
            <h1 className="font-bold text-lg" style={{ color: "var(--fg)" }}>
              كيفية الوضوء
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              {done.size} / {WUDU_STEPS.length} خطوات
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={shareFullGuide}
              className="p-2 rounded-xl opacity-60 hover:opacity-100 transition"
              style={{ background: "var(--card-bg)", color: "var(--fg)" }}
              aria-label="مشاركة الدليل"
            >
              <Share2 size={16} />
            </button>
            <button type="button"
              onClick={() => navigate(-1)}
              aria-label="رجوع"
              className="p-2 rounded-xl"
              style={{ background: "var(--card-bg)", color: "var(--fg)" }}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-400"
            style={{
              width: `${(done.size / WUDU_STEPS.length) * 100}%`,
              background: allDone ? "var(--ok, #22c55e)" : "var(--accent)",
            }}
          />
        </div>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div
          className="mx-4 mt-4 rounded-2xl p-4 text-center"
          style={{
            background: "color-mix(in srgb, var(--ok, #22c55e) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ok, #22c55e) 25%, transparent)",
          }}
        >
          <p className="text-lg">💧</p>
          <p className="font-bold text-sm" style={{ color: "var(--ok, #22c55e)" }}>
            أتممت الوضوء — طهارة كاملة بإذن الله!
          </p>
        </div>
      )}

      {/* Steps */}
      <div className="px-4 mt-4 space-y-3">
        {WUDU_STEPS.map((step) => {
          const isDone = done.has(step.id);
          return (
            <button type="button"
              key={step.id}
              onClick={() => toggle(step.id)}
              className="w-full text-right rounded-2xl p-4 transition-all duration-200 flex items-start gap-3"
              style={{
                background: isDone
                  ? "color-mix(in srgb, var(--ok, #22c55e) 12%, var(--card-bg))"
                  : "var(--card-bg)",
                border: `1px solid ${isDone ? "color-mix(in srgb, var(--ok, #22c55e) 35%, transparent)" : "var(--card-border)"}`,
              }}
            >
              {/* Check icon */}
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 size={22} style={{ color: "var(--ok, #22c55e)" }} />
                ) : (
                  <Circle size={22} style={{ color: "var(--accent)", opacity: 0.5 }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="font-bold text-sm" style={{ color: "var(--fg)" }}>
                    {step.title}
                  </span>
                  <span className="text-xl">{step.icon}</span>
                  <span
                    className="text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {step.id}
                  </span>
                </div>
                <p className="text-sm leading-relaxed opacity-75 text-right" style={{ color: "var(--fg)" }}>
                  {step.description}
                </p>
                {step.times > 1 && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--accent)" }}>
                    يُكرَّر {step.times} مرات
                  </p>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const text = `${step.title}\n${step.description}${step.times > 1 ? `\n(يُكرَّر ${step.times} مرات)` : ""}`;
                      if (navigator.share) {
                        await navigator.share({ text }).catch(() => {});
                      } else {
                        await navigator.clipboard.writeText(text).catch(() => {});
                        toast.success("تم النسخ");
                      }
                    }}
                    className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                    style={{ background: "var(--card-border)", color: "var(--fg)" }}
                    title="مشاركة هذه الخطوة"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
