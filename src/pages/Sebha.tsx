import * as React from "react";
import {
  CheckCircle2,
  RotateCw,
  Sparkles,
  Target,
  Timer,
  History,
  Trash2,
  Volume2,
  VolumeX,
  Plus,
  Pencil,
  Flag,
} from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useNoorStore } from "@/store/noorStore";
import type { SebhaSession } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TASBEEHAT = [
  {
    key: "subhanallah",
    label: "سُبْحَانَ الله",
    short: "سبحان الله",
    hint: "تنزيه لله وتعظيم له",
  },
  {
    key: "alhamdulillah",
    label: "الْحَمْدُ لِلَّه",
    short: "الحمد لله",
    hint: "شكر وثناء في كل حال",
  },
  {
    key: "la_ilaha_illallah",
    label: "لا إِلَهَ إِلَّا الله",
    short: "لا إله إلا الله",
    hint: "كلمة التوحيد وأصل الذكر",
  },
  {
    key: "allahu_akbar",
    label: "اللهُ أَكْبَر",
    short: "الله أكبر",
    hint: "تكبير يرفع القلب عن الشواغل",
  },
] as const;

type TasbeehKey = typeof TASBEEHAT[number]["key"] | "custom";

const TARGETS = [33, 100, 1000] as const;

// ─── Ambient audio helpers ─────────────────────────────────────────────────

type AmbientType = "off" | "rain" | "mosque" | "zamzam";

function createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }
  return buffer;
}

function createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buffer;
}

function startAmbient(type: AmbientType): { ctx: AudioContext; stop: () => void } | null {
  if (type === "off") return null;
  try {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    let source: AudioBufferSourceNode;

    if (type === "rain") {
      source = ctx.createBufferSource();
      source.buffer = createBrownNoiseBuffer(ctx);
      source.loop = true;
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 700;
      lpf.Q.value = 0.5;
      source.connect(lpf);
      lpf.connect(gainNode);
      gainNode.gain.value = 0.12;
    } else if (type === "zamzam") {
      source = ctx.createBufferSource();
      source.buffer = createBrownNoiseBuffer(ctx);
      source.loop = true;
      const bpf = ctx.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.value = 1200;
      bpf.Q.value = 0.8;
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 2000;
      source.connect(bpf);
      bpf.connect(lpf);
      lpf.connect(gainNode);
      gainNode.gain.value = 0.18;
    } else {
      // mosque: pink noise + lowpass (distant hum)
      source = ctx.createBufferSource();
      source.buffer = createPinkNoiseBuffer(ctx);
      source.loop = true;
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 400;
      lpf.Q.value = 1.5;
      source.connect(lpf);
      lpf.connect(gainNode);
      gainNode.gain.value = 0.07;
    }

    source.start();
    return {
      ctx,
      stop: () => {
        try { source.stop(); source.disconnect(); } catch { /* ignore */ }
        try { gainNode.disconnect(); } catch { /* ignore */ }
        ctx.close();
      },
    };
  } catch {
    return null;
  }
}

// ─── Haptic helper (S1) ─────────────────────────────────────────────────────

function doHaptic(count: number, target: number | null, enabled: boolean) {
  if (!enabled || !navigator.vibrate) return;
  const isCompletion = target !== null && count >= target;
  const isHundred = count % 100 === 0 && count > 0;
  const isThirtyThree = count % 33 === 0 && count > 0 && !isHundred;
  if (isCompletion || isHundred) {
    navigator.vibrate([30, 15, 30, 15, 30]); // triple buzz
  } else if (isThirtyThree) {
    navigator.vibrate([40, 20, 40]); // double pulse
  } else {
    navigator.vibrate(10);
  }
}

// ─── Circular progress ring (S4) ────────────────────────────────────────────

const RING_R = 106;
const RING_C = 2 * Math.PI * RING_R;

function CircularRing({
  percent,
  completed,
  children,
  onClick,
}: {
  percent: number;
  completed: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const offset = RING_C * (1 - Math.min(percent, 100) / 100);
  return (
    <div
      className="relative mx-auto mt-6 flex items-center justify-center"
      style={{ width: 224, height: 224, maxWidth: "74vw", maxHeight: "74vw" }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 224 224">
        <circle cx="112" cy="112" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="112"
          cy="112"
          r={RING_R}
          fill="none"
          stroke={completed ? "var(--ok)" : "var(--accent)"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          transform="rotate(-90 112 112)"
          style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease" }}
        />
      </svg>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "absolute inset-0 rounded-full border transition active:scale-[.98] select-none flex items-center justify-center",
          completed
            ? "bg-[var(--ok)]/12 border-[var(--ok)]/30"
            : "bg-[var(--accent)]/12 border-[var(--accent)]/25 hover:bg-[var(--accent)]/16"
        )}
        aria-label="اضغط للعد"
      >
        {children}
      </button>
    </div>
  );
}

// ─── Format timestamp ────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Silence unused import warning — SebhaSession is used via the store
type _UseSession = SebhaSession;

// ─── Main component ──────────────────────────────────────────────────────────

export function SebhaPage() {
  const [selected, setSelected] = React.useState<TasbeehKey>("subhanallah");
  const [target, setTarget] = React.useState<(typeof TARGETS)[number]>(100);
  const [confirmReset, setConfirmReset] = React.useState(false);

  // S5 - Tally mode
  const [tallyMode, setTallyMode] = React.useState(false);
  const [tallyCount, setTallyCount] = React.useState(0);
  const [tallyLaps, setTallyLaps] = React.useState<number[]>([]);

  // S2 - Custom dhikr form
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [customPhraseInput, setCustomPhraseInput] = React.useState("");
  const [customTargetInput, setCustomTargetInput] = React.useState("100");

  // S6 - Ambient sound
  const [ambient, setAmbient] = React.useState<AmbientType>("off");
  const ambientRef = React.useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  // S3 - Sessions panel toggle
  const [showHistory, setShowHistory] = React.useState(false);

  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const resetQuickTasbeeh = useNoorStore((s) => s.resetQuickTasbeeh);
  const resetAllQuickTasbeeh = useNoorStore((s) => s.resetAllQuickTasbeeh);
  const prefs = useNoorStore((s) => s.prefs);
  const sebhaSessions = useNoorStore((s) => s.sebhaSessions);
  const addSebhaSession = useNoorStore((s) => s.addSebhaSession);
  const clearSebhaSessions = useNoorStore((s) => s.clearSebhaSessions);
  const sebhaCustom = useNoorStore((s) => s.sebhaCustom);
  const setSebhaCustom = useNoorStore((s) => s.setSebhaCustom);

  // Sync custom phrase form with stored custom dhikr
  React.useEffect(() => {
    if (sebhaCustom) {
      setCustomPhraseInput(sebhaCustom.phrase);
      setCustomTargetInput(String(sebhaCustom.target));
    }
  }, [sebhaCustom]);

  // S6 - manage ambient audio lifecycle
  React.useEffect(() => {
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
    if (ambient !== "off") {
      ambientRef.current = startAmbient(ambient);
    }
    return () => {
      if (ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      }
    };
  }, [ambient]);

  // Stop ambient on unmount
  React.useEffect(() => () => { ambientRef.current?.stop(); }, []);

  const current =
    selected === "custom"
      ? { key: "custom" as const, label: sebhaCustom?.phrase ?? "ذكر مخصص", short: sebhaCustom?.phrase ?? "ذكر مخصص", hint: "" }
      : TASBEEHAT.find((item) => item.key === selected) ?? TASBEEHAT[0];

  const effectiveTarget = selected === "custom" ? (sebhaCustom?.target ?? 100) : target;
  const count = tallyMode ? tallyCount : Number(quickTasbeeh[selected] ?? 0);
  const percent = tallyMode ? 0 : pct(Math.min(count, effectiveTarget), effectiveTarget);
  const remaining = tallyMode ? null : Math.max(0, effectiveTarget - count);
  const completed = !tallyMode && count >= effectiveTarget;

  const increment = React.useCallback(() => {
    if (tallyMode) {
      setTallyCount((prev) => {
        const next = prev + 1;
        if (next % 100 === 0 || (next % 33 === 0 && next % 100 !== 0)) {
          setTallyLaps((laps) => [...laps.slice(-9), next]);
        }
        doHaptic(next, null, prefs.enableHaptics);
        return next;
      });
    } else {
      const next = incQuickTasbeeh(selected, effectiveTarget);
      doHaptic(next, effectiveTarget, prefs.enableHaptics);
      if (next === effectiveTarget) {
        toast.success("اكتمل هدف التسبيح 🎉");
        addSebhaSession({
          dhikrKey: selected,
          dhikrLabel: current.short,
          count: next,
          target: effectiveTarget,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [tallyMode, incQuickTasbeeh, prefs.enableHaptics, selected, effectiveTarget, current.short, addSebhaSession]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); increment(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [increment]);

  const totalDone = TASBEEHAT.reduce(
    (sum, item) => sum + Math.min(Number(quickTasbeeh[item.key] ?? 0), target),
    0
  );
  const totalTarget = TASBEEHAT.length * target;
  const allPercent = pct(totalDone, totalTarget);

  function handleReset() {
    if (tallyMode) {
      if (tallyCount > 0) {
        addSebhaSession({
          dhikrKey: "tally",
          dhikrLabel: current.short,
          count: tallyCount,
          target: null,
          timestamp: new Date().toISOString(),
        });
      }
      setTallyCount(0);
      setTallyLaps([]);
      toast.success("تم تصفير العداد الحر");
    } else {
      resetQuickTasbeeh(selected);
      toast.success("تم تصفير الذكر الحالي");
    }
  }

  function saveCustomDhikr() {
    const phrase = customPhraseInput.trim();
    const t = Math.max(1, Math.min(10000, Number(customTargetInput) || 100));
    if (!phrase) { toast.error("أدخل نص الذكر"); return; }
    setSebhaCustom({ phrase, target: t });
    setSelected("custom");
    setShowCustomForm(false);
    toast.success("تم حفظ الذكر المخصص");
  }

  const ambientLabels: Record<AmbientType, string> = {
    off: "بدون صوت",
    rain: "🌧 مطر",
    mosque: "🕌 مسجد",
    zamzam: "💧 زمزم",
  };

  return (
    <div className="space-y-3 page-enter">
      {/* Header card */}
      <Card className="p-5 overflow-hidden relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles size={15} className="text-[var(--accent)]" />
              <span className="text-xs font-semibold opacity-60">سبحة ذكية</span>
              {tallyMode ? <Badge>وضع حر</Badge> : <Badge>{totalDone}/{totalTarget}</Badge>}
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-bold leading-tight">السبحة اليومية</h1>
            <div className="mt-1 text-sm opacity-65 leading-6">
              عداد هادئ للتسبيح والصلاة على النبي، محفوظ ضمن يومك الإيماني.
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {/* S3 - Sessions history toggle */}
            <IconButton
              aria-label="سجل الجلسات"
              title="سجل الجلسات"
              onClick={() => setShowHistory((v) => !v)}
              className={cn(showHistory && "text-[var(--accent)]")}
            >
              <History size={17} />
            </IconButton>
            {confirmReset ? (
              <>
                <Button size="sm" variant="danger" onClick={() => {
                  resetAllQuickTasbeeh();
                  setTallyCount(0);
                  setTallyLaps([]);
                  setConfirmReset(false);
                  toast.success("تم تصفير السبحة");
                }}>تأكيد</Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmReset(false)}>إلغاء</Button>
              </>
            ) : (
              <IconButton aria-label="تصفير كل التسابيح" onClick={() => setConfirmReset(true)} title="تصفير كل التسابيح">
                <RotateCw size={17} />
              </IconButton>
            )}
          </div>
        </div>
        {!tallyMode && (
          <div className="mt-4 h-2 rounded-full bg-white/8 border border-white/10 overflow-hidden">
            <div className="h-full progress-accent transition-[width] duration-300" style={{ width: `${allPercent}%` }} />
          </div>
        )}
      </Card>

      {/* S3 - Sessions history panel */}
      {showHistory && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History size={15} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold">سجل الجلسات</span>
              {sebhaSessions.length > 0 && <Badge>{sebhaSessions.length}</Badge>}
            </div>
            {sebhaSessions.length > 0 && (
              <button
                type="button"
                onClick={() => { clearSebhaSessions(); toast.success("تم مسح السجل"); }}
                className="flex items-center gap-1 text-xs opacity-50 hover:opacity-80 hover:text-red-400 transition"
              >
                <Trash2 size={13} />
                مسح
              </button>
            )}
          </div>
          {sebhaSessions.length === 0 ? (
            <div className="text-xs opacity-40 text-center py-4">لا توجد جلسات مسجلة بعد</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sebhaSessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.target === null
                      ? <Flag size={12} className="text-[var(--accent)] shrink-0" />
                      : <CheckCircle2 size={12} className="text-[var(--ok)] shrink-0" />}
                    <span className="truncate opacity-85">{s.dhikrLabel}</span>
                    <Badge>{s.count}{s.target ? `/${s.target}` : ""}</Badge>
                  </div>
                  <span className="opacity-40 shrink-0">{fmtTime(s.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Counter card */}
      <Card className="p-5 text-center">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Target selector (hidden in tally / custom mode) */}
            {!tallyMode && selected !== "custom" && (
              <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
                {TARGETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTarget(value)}
                    className={cn(
                      "min-w-10 rounded-xl px-3 py-2 text-xs font-semibold transition",
                      target === value ? "bg-[var(--accent)] text-black" : "text-white/65 hover:bg-white/8"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
            {/* S5 - Tally mode toggle */}
            <button
              type="button"
              onClick={() => { setTallyMode((v) => !v); setTallyCount(0); setTallyLaps([]); }}
              className={cn(
                "flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                tallyMode
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]"
                  : "border-white/10 bg-white/5 text-white/65 hover:bg-white/8"
              )}
            >
              <Timer size={13} />
              {tallyMode ? "وضع حر ✓" : "وضع حر"}
            </button>
          </div>
          <Button variant="secondary" onClick={handleReset}>
            <RotateCw size={16} />
            تصفير الحالي
          </Button>
        </div>

        {/* S4 - Circular ring counter */}
        <CircularRing percent={percent} completed={completed} onClick={increment}>
          <div className="text-center">
            <div className="text-xs opacity-55 mb-2">{current.short}</div>
            <div className="text-6xl font-black tabular-nums leading-none">{count}</div>
            {!tallyMode && <div className="mt-2 text-xs opacity-60">من {effectiveTarget}</div>}
            {tallyMode && tallyLaps.length > 0 && (
              <div className="mt-2 text-xs opacity-60">دورة {tallyLaps.length}</div>
            )}
          </div>
        </CircularRing>

        {/* Status line */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm opacity-75">
          {tallyMode ? (
            <><Timer size={17} className="text-[var(--accent)]" /><span>عد حر — بدون هدف</span></>
          ) : completed ? (
            <><CheckCircle2 size={17} className="text-[var(--ok)]" />تم الهدف</>
          ) : (
            <><Target size={17} className="text-[var(--accent)]" />{remaining} متبقي</>
          )}
        </div>

        {/* S5 - Tally lap markers */}
        {tallyMode && tallyLaps.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {tallyLaps.map((lap, i) => (
              <span
                key={i}
                className="text-xs rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/25 px-2 py-0.5 text-[var(--accent)]"
              >
                {lap % 100 === 0 ? "💯" : "🔖"} {lap}
              </span>
            ))}
          </div>
        )}

        {/* S6 - Ambient sound selector */}
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs opacity-50 flex items-center gap-1">
            {ambient === "off" ? <VolumeX size={13} /> : <Volume2 size={13} />}
            صوت محيطي:
          </span>
          {(["off", "rain", "mosque", "zamzam"] as AmbientType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAmbient(type)}
              className={cn(
                "text-xs rounded-full border px-2.5 py-1 transition",
                ambient === type
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]"
                  : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
              )}
            >
              {ambientLabels[type]}
            </button>
          ))}
        </div>
      </Card>

      {/* Tasbeehat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {TASBEEHAT.map((item) => {
          const itemCount = Number(quickTasbeeh[item.key] ?? 0);
          const itemPercent = pct(Math.min(itemCount, target), target);
          const active = item.key === selected;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelected(item.key)}
              className={cn(
                "glass rounded-3xl p-4 text-right border transition active:scale-[.98]",
                active ? "border-[var(--accent)]/35 bg-[var(--accent)]/8" : "border-white/10 hover:bg-white/6"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="arabic-text text-base font-bold leading-7">{item.label}</div>
                  <div className="mt-1 text-xs opacity-55 leading-5">{item.hint}</div>
                </div>
                <Badge>{itemCount}/{target}</Badge>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${itemPercent}%`, background: itemPercent >= 100 ? "var(--ok)" : "var(--accent)" }}
                />
              </div>
            </button>
          );
        })}

        {/* S2 - Custom dhikr card */}
        {sebhaCustom ? (
          <button
            type="button"
            onClick={() => setSelected("custom")}
            className={cn(
              "glass rounded-3xl p-4 text-right border transition active:scale-[.98]",
              selected === "custom"
                ? "border-[var(--accent)]/35 bg-[var(--accent)]/8"
                : "border-white/10 hover:bg-white/6"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="arabic-text text-base font-bold leading-7 truncate">{sebhaCustom.phrase}</div>
                <div className="mt-1 text-xs opacity-55">ذكر مخصص · هدف {sebhaCustom.target}</div>
              </div>
              <div className="flex items-center gap-1">
                <Badge>{Number(quickTasbeeh["custom"] ?? 0)}/{sebhaCustom.target}</Badge>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setShowCustomForm(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setShowCustomForm(true); } }}
                  className="opacity-40 hover:opacity-80 transition p-1 cursor-pointer"
                  aria-label="تعديل الذكر المخصص"
                >
                  <Pencil size={13} />
                </span>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct(Math.min(Number(quickTasbeeh["custom"] ?? 0), sebhaCustom.target), sebhaCustom.target)}%`,
                  background:
                    pct(Math.min(Number(quickTasbeeh["custom"] ?? 0), sebhaCustom.target), sebhaCustom.target) >= 100
                      ? "var(--ok)"
                      : "var(--accent)",
                }}
              />
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="glass rounded-3xl p-4 text-center border border-dashed border-white/15 hover:bg-white/6 transition active:scale-[.98] flex flex-col items-center justify-center gap-2 min-h-[100px]"
          >
            <Plus size={20} className="opacity-40" />
            <span className="text-xs opacity-50">إضافة ذكر مخصص</span>
          </button>
        )}
      </div>

      {/* S2 - Custom dhikr form */}
      {showCustomForm && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pencil size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold">ذكر مخصص</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs opacity-60 mb-1 block">نص الذكر</label>
              <input
                type="text"
                dir="rtl"
                value={customPhraseInput}
                onChange={(e) => setCustomPhraseInput(e.target.value)}
                placeholder="مثال: صلِّ على النبي"
                className="w-full rounded-xl bg-white/8 border border-white/10 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50 transition"
              />
            </div>
            <div>
              <label className="text-xs opacity-60 mb-1 block">الهدف</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={customTargetInput}
                onChange={(e) => setCustomTargetInput(e.target.value)}
                className="w-full rounded-xl bg-white/8 border border-white/10 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50 transition"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCustomDhikr} className="flex-1">حفظ</Button>
              <Button variant="secondary" onClick={() => setShowCustomForm(false)} className="flex-1">إلغاء</Button>
              {sebhaCustom && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setSebhaCustom(null);
                    if (selected === "custom") setSelected("subhanallah");
                    setShowCustomForm(false);
                    toast.success("تم حذف الذكر المخصص");
                  }}
                >
                  حذف
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
