import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { WUDU_STEPS } from "@/data/wuduGuide";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { shareOrCopy } from "@/lib/shareTargets";
import { arCount, arNum } from "@/lib/formatNumber";
import { vibrate } from "@/lib/haptics";
import { useKeepScreenAwake } from "@/hooks/useKeepScreenAwake";
import { useNoorStore } from "@/store/noorStore";

const timesLabel = (times: number) => `يُكرَّر ${arCount(times, { one: "مرة", two: "مرتين", few: "مرات" })}`;

export function WuduGuidePage() {
  const navigate = useNavigate();
  const [done, setDone] = React.useState<Set<number>>(new Set());
  const haptics = useNoorStore((s) => s.prefs.enableHaptics !== false);
  useScrollRestoration();
  // The phone is often propped up by the basin while the hands are wet: the
  // screen stays on while the guide is open.
  useKeepScreenAwake(true);

  function toggle(id: number) {
    const marking = !done.has(id);
    if (haptics && marking) vibrate(done.size + 1 === WUDU_STEPS.length ? [15, 60, 15, 60, 30] : 12);
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
    const lines = WUDU_STEPS.map((s, i) => `${arNum(i + 1)}. ${s.title}\n${s.description}`);
    const text = `دليل الوضوء خطوة بخطوة\n\n${lines.join("\n\n")}`;
    await shareOrCopy(text);
  };

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-linear-to-bl from-cyan-500/15 to-sky-400/10 pointer-events-none opacity-55"
            style={{ borderRadius: "inherit" }}
          />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="رجوع"
                className="mt-1 p-2 rounded-xl shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ background: "var(--card)", color: "var(--fg)" }}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg" aria-hidden="true">💧</span>
                  <div className="text-xs opacity-60">دليل الوضوء</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#06b6d4" }}>كيفية الوضوء</h1>
                <div className="text-sm opacity-70 mt-1 tabular-nums" aria-live="polite" aria-atomic="true">{arNum(done.size)} من {arNum(WUDU_STEPS.length)} خطوات</div>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={shareFullGuide}
                  className="p-2 rounded-xl opacity-60 hover:opacity-100 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  style={{ background: "var(--card)", color: "var(--fg)" }}
                  aria-label="مشاركة الدليل"
                >
                  <Share2 size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs px-3 min-h-[44px] rounded-full"
                  style={{ background: "var(--card)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}
                >
                  إعادة
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--card-2)" }}
              role="progressbar"
              aria-valuenow={done.size}
              aria-valuemin={0}
              aria-valuemax={WUDU_STEPS.length}
              aria-label={`التقدم: ${arNum(done.size)} من ${arNum(WUDU_STEPS.length)} خطوات`}
            >
              <div
                className="h-full rounded-full transition-all duration-400"
                style={{
                  width: `${(done.size / WUDU_STEPS.length) * 100}%`,
                  background: allDone ? "var(--ok)" : "#06b6d4",
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div
          className="mx-4 mt-4 rounded-2xl p-4 text-center"
          style={{
            background: "color-mix(in srgb, var(--ok, #3ddc97) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ok, #3ddc97) 25%, transparent)",
          }}
        >
          <p className="text-lg" aria-hidden="true">💧</p>
          <p className="font-bold text-sm" style={{ color: "var(--ok, #3ddc97)" }}>
            أتممت الوضوء — طهارة كاملة بإذن الله!
          </p>
        </div>
      )}

      {/* Steps */}
      <div className="px-4 mt-4 stack-y-3" role="list" aria-label="خطوات الوضوء">
        {WUDU_STEPS.map((step) => {
          const isDone = done.has(step.id);
          return (
            <div
              key={step.id}
              role="listitem"
              className="relative rounded-2xl transition-all duration-200"
              style={{
                background: isDone
                  ? "color-mix(in srgb, var(--ok, #3ddc97) 12%, var(--card))"
                  : "var(--card)",
                border: `1px solid ${isDone ? "color-mix(in srgb, var(--ok, #3ddc97) 35%, transparent)" : "var(--stroke)"}`,
              }}
            >
              <button
                type="button"
                onClick={() => toggle(step.id)}
                aria-pressed={isDone}
                className="w-full text-right p-4 pb-14 flex items-start gap-3"
              >
                {/* Check icon */}
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {isDone ? (
                    <CheckCircle2 size={22} style={{ color: "var(--ok, #3ddc97)" }} />
                  ) : (
                    <Circle size={22} style={{ color: "var(--accent)", opacity: 0.5 }} />
                  )}
                </span>

                {/* Content */}
                <span className="flex-1 block">
                  <span className="flex items-center justify-end gap-2 mb-1">
                    <span className="font-bold text-sm" style={{ color: "var(--fg)" }}>
                      {step.title}
                    </span>
                    <span
                      className="text-xs h-6 min-w-6 px-1 rounded-full flex items-center justify-center font-bold shrink-0"
                      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                      aria-hidden="true"
                    >
                      {arNum(step.id)}
                    </span>
                  </span>
                  <span className="block text-sm leading-relaxed opacity-75 text-right" style={{ color: "var(--fg)" }}>
                    {step.description}
                  </span>
                  {step.times > 1 && (
                    <span className="block text-xs mt-1.5" style={{ color: "var(--accent)" }}>
                      {timesLabel(step.times)}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = `${step.title}\n${step.description}${step.times > 1 ? `\n(${timesLabel(step.times)})` : ""}`;
                  await shareOrCopy(text);
                }}
                className="absolute bottom-2 left-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--fg)" }}
                aria-label={`مشاركة خطوة ${step.title}`}
              >
                <Share2 size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
