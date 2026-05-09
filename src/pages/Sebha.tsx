import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Target,
  Timer,
  History,
  Trash2,
  Plus,
  Pencil,
  Flag,
  Mic,
  MicOff,
  BarChart2,
  Share2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useNoorStore } from "@/store/noorStore";
import type { SebhaSession } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { getDailyTasbeeh } from "@/lib/leaderboardScores";
import { getLocalDateKey } from "@/lib/dayBoundaries";

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

// ─── Quick-select extended phrases ─────────────────────────────────────────
const QUICK_PHRASES: Array<{ phrase: string; target: number }> = [
  { phrase: "سبحان الله وبحمده", target: 100 },
  { phrase: "سبحان الله العظيم", target: 100 },
  { phrase: "لا حول ولا قوة إلا بالله", target: 33 },
  { phrase: "أستغفر الله", target: 100 },
  { phrase: "اللهم صل على محمد", target: 100 },
  { phrase: "سبحان الله وبحمده سبحان الله العظيم", target: 33 },
  { phrase: "حسبنا الله ونعم الوكيل", target: 33 },
  { phrase: "لا إله إلا الله وحده لا شريك له", target: 33 },
];

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

// ─── Circular progress ring (S4) — 6A drag-to-count ────────────────────────

const RING_R = 106;
const RING_C = 2 * Math.PI * RING_R;

function CircularRing({
  percent,
  completed,
  children,
  onClick,
  showHint = true,
}: {
  percent: number;
  completed: boolean;
  children: React.ReactNode;
  onClick: () => void;
  showHint?: boolean;
}) {
  const offset = RING_C * (1 - Math.min(percent, 100) / 100);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pointerRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastAngle: number;
    hasMoved: boolean;
    isDrag: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragAngleDeg, setDragAngleDeg] = React.useState(-90);
  // Bead follows fill progress when idle; follows finger during drag.
  const fillAngleDeg = -90 + (Math.min(percent, 100) / 100) * 360;
  const handleAngleDeg = isDragging ? dragAngleDeg : fillAngleDeg;

  function getAngleAndDist(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    const dist = Math.hypot(clientX - cx, clientY - cy);
    const radius = rect.width / 2;
    return { angle, dist, radius };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerRef.current) return;
    const { angle, dist, radius } = getAngleAndDist(e.clientX, e.clientY);
    const nearRing = dist > radius * 0.52;
    if (nearRing) {
      e.preventDefault(); // prevent button click when grabbing ring
      containerRef.current!.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setDragAngleDeg(angle);
    }
    pointerRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastAngle: angle,
      hasMoved: false,
      isDrag: nearRing,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ref = pointerRef.current;
    if (!ref || ref.pointerId !== e.pointerId) return;
    const dx = e.clientX - ref.startX;
    const dy = e.clientY - ref.startY;
    if (Math.hypot(dx, dy) > 6) ref.hasMoved = true;
    if (!ref.isDrag) return;
    const { angle } = getAngleAndDist(e.clientX, e.clientY);
    let delta = angle - ref.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const NOTCH = 14; // degrees per count
    if (delta >= NOTCH) {
      onClick();
      ref.lastAngle = angle;
    }
    setDragAngleDeg(angle);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const ref = pointerRef.current;
    if (!ref || ref.pointerId !== e.pointerId) return;
    if (!ref.hasMoved && !ref.isDrag) onClick(); // center tap
    setIsDragging(false);
    pointerRef.current = null;
  }

  // Handle bead position on ring
  const hRad = (handleAngleDeg * Math.PI) / 180;
  const hx = 112 + RING_R * Math.cos(hRad);
  const hy = 112 + RING_R * Math.sin(hRad);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mt-6 flex items-center justify-center touch-none"
      style={{ width: 224, height: 224, maxWidth: "74vw", maxHeight: "74vw" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224" style={{ pointerEvents: "none" }} aria-hidden="true">
        <circle cx="112" cy="112" r={RING_R} fill="none" stroke="var(--stroke)" strokeWidth="6" />
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
        {/* 6A: drag handle bead */}
        <circle cx={hx} cy={hy} r={8} fill={completed ? "var(--ok)" : "var(--accent)"} opacity={0.92}
          style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.5))" }} />
        <circle cx={hx} cy={hy} r={3} fill="white" opacity={0.7} />
      </svg>
      <button type="button"
        onClick={onClick}
        className={cn(
          "absolute inset-0 rounded-full border transition active:scale-[.98] select-none flex items-center justify-center",
          completed
            ? "bg-ok-12 border-ok-30"
            : "bg-accent-12 border-accent-25 hover:bg-accent-16"
        )}
        aria-label="اضغط للعد"
        aria-keyshortcuts="Space"
        style={{ pointerEvents: "auto" }}
      >
        {children}
      </button>
      {/* 6A: drag hint — only shown before first count */}
      {showHint && (
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] opacity-30 pointer-events-none">
          اسحب الحلقة للعدّ
        </div>
      )}
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

// ─── 6B: Voice recognition hook ─────────────────────────────────────────────

const VOICE_PHRASE_MAP: Array<{ patterns: string[]; key: string }> = [
  { patterns: ['سبحان الله', 'سبحانالله'], key: 'subhanallah' },
  { patterns: ['الحمد لله', 'الحمدلله'], key: 'alhamdulillah' },
  { patterns: ['لا إله إلا الله', 'لا اله الا الله', 'لاإلهإلاالله'], key: 'la_ilaha_illallah' },
  { patterns: ['الله أكبر', 'الله اكبر', 'اللهأكبر'], key: 'allahu_akbar' },
];

function useSpeechCount(onRecognize: (matchedKey: string | null) => void) {
  const [listening, setListening] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const recogRef = React.useRef<SpeechRecognition | null>(null);
  const cbRef = React.useRef(onRecognize);
  React.useEffect(() => { cbRef.current = onRecognize; });

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const requestMicrophoneAccess = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      toast.error('اسمح بالميكروفون لتفعيل العدّ بالصوت');
      return false;
    }
  }, []);

  const toggle = React.useCallback(async () => {
    if (recogRef.current) {
      recogRef.current.stop();
      recogRef.current = null;
      setListening(false);
      return;
    }
    if (starting) return;
    const SR: (new () => SpeechRecognition) | undefined =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { toast.error('التعرف على الصوت غير مدعوم في هذا المتصفح'); return; }
    setStarting(true);
    const micAllowed = await requestMicrophoneAccess();
    if (!micAllowed) { setStarting(false); return; }

    const recog = new SR();
    recog.lang = 'ar-SA';
    recog.continuous = true;
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ');
      let matched: string | null = null;
      for (const { patterns, key } of VOICE_PHRASE_MAP) {
        if (patterns.some(p => transcript.includes(p))) { matched = key; break; }
      }
      cbRef.current(matched); // null = unrecognized phrase → count current
    };
    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech') toast.error('خطأ الميكروفون: ' + e.error);
      recogRef.current = null;
      setListening(false);
      setStarting(false);
    };
    recog.onend = () => {
      // auto-restart for continuous listening
      if (recogRef.current) {
        try { recogRef.current.start(); } catch { /* already started */ }
      }
    };
    try {
      recog.start();
      recogRef.current = recog;
      setListening(true);
    } catch {
      recogRef.current = null;
      setListening(false);
      toast.error('تعذر تشغيل الميكروفون');
    } finally {
      setStarting(false);
    }
  }, [requestMicrophoneAccess, starting]);

  React.useEffect(() => () => { recogRef.current?.stop(); recogRef.current = null; }, []);

  return { listening, starting, toggle, supported };
}

// ─── 6C: Weekly stats bar chart ──────────────────────────────────────────────

function dateKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TasbeehStatsCard({
  tasbeehDailyLog,
  tasbeehLifetime,
  sebhaCustom,
}: {
  tasbeehDailyLog: Record<string, Record<string, number>>;
  tasbeehLifetime: Record<string, number>;
  sebhaCustom: { phrase: string; target: number } | null;
}) {
  const stats = React.useMemo(() => {
    const today = new Date();
    const customKey = "custom";
    const allItems: Array<{ key: string; short: string }> = [
      ...TASBEEHAT,
      ...(sebhaCustom && (tasbeehLifetime[customKey] ?? 0) > 0
        ? [{ key: customKey, short: sebhaCustom.phrase }]
        : []),
    ];
    const thisWeek: Record<string, number> = {};
    const lastWeek: Record<string, number> = {};
    for (const item of allItems) { thisWeek[item.key] = 0; lastWeek[item.key] = 0; }
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const dk = dateKeyOf(d);
      const day = tasbeehDailyLog[dk] ?? {};
      for (const item of allItems) { thisWeek[item.key] += day[item.key] ?? 0; }
    }
    for (let i = 7; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const dk = dateKeyOf(d);
      const day = tasbeehDailyLog[dk] ?? {};
      for (const item of allItems) { lastWeek[item.key] += day[item.key] ?? 0; }
    }
    const maxVal = Math.max(1, ...allItems.flatMap(i => [thisWeek[i.key], lastWeek[i.key]]));
    return { thisWeek, lastWeek, maxVal, allItems };
  }, [tasbeehDailyLog, tasbeehLifetime, sebhaCustom]);

  const totalLifetime = Object.values(tasbeehLifetime).reduce((s, v) => s + (v ?? 0), 0);
  if (totalLifetime === 0 && Object.keys(tasbeehDailyLog).length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={14} className="text-[var(--accent)]" />
        <span className="text-sm font-semibold">إحصائيات التسبيح</span>
        <span className="text-[11px] opacity-50 mr-auto">هذا الأسبوع مقابل الماضي</span>
      </div>
      <div className="space-y-3">
        {stats.allItems.map((item) => {
          const tw = stats.thisWeek[item.key] ?? 0;
          const lw = stats.lastWeek[item.key] ?? 0;
          const twPct = Math.round((tw / stats.maxVal) * 100);
          const lwPct = Math.round((lw / stats.maxVal) * 100);
          const lifetime = tasbeehLifetime[item.key] ?? 0;
          return (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] opacity-70 truncate max-w-[60%]">{item.short}</span>
                <span className="text-[10px] opacity-40 tabular-nums">مجموع: {lifetime.toLocaleString()}</span>
              </div>
              {/* This week bar */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] opacity-40 w-14 shrink-0">هذا: {tw.toLocaleString()}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--card)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${twPct}%`, background: 'var(--accent)' }}
                  />
                </div>
              </div>
              {/* Last week bar */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] opacity-40 w-14 shrink-0">سبق: {lw.toLocaleString()}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--card)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${lwPct}%`, background: 'var(--card-2)' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-[10px] opacity-50">هذا الأسبوع</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-[var(--card)]0" />
          <span className="text-[10px] opacity-50">الأسبوع الماضي</span>
        </div>
      </div>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SebhaPage() {
  const navigate = useNavigate();
  useScrollRestoration();

  // Persisted selections (survive page reload)
  const sebhaSelected = useNoorStore((s) => s.sebhaSelected) as TasbeehKey;
  const setSebhaSelected = useNoorStore((s) => s.setSebhaSelected);
  const sebhaTarget = useNoorStore((s) => s.sebhaTarget);
  const setSebhaTarget = useNoorStore((s) => s.setSebhaTarget);
  // Keep local aliases for brevity
  const selected: TasbeehKey = TASBEEHAT.some(t => t.key === sebhaSelected) || sebhaSelected === "custom" ? sebhaSelected : "subhanallah";
  const setSelected = setSebhaSelected;
  const target = (TARGETS as readonly number[]).includes(sebhaTarget) ? sebhaTarget as typeof TARGETS[number] : 100;
  const setTarget = (v: typeof TARGETS[number]) => setSebhaTarget(v);

  const [confirmReset, setConfirmReset] = React.useState(false);

  // S5 - Tally mode
  const [tallyMode, setTallyMode] = React.useState(false);
  const [tallyCount, setTallyCount] = React.useState(0);
  const [tallyLaps, setTallyLaps] = React.useState<number[]>([]);

  // S2 - Custom dhikr form
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [customPhraseInput, setCustomPhraseInput] = React.useState("");
  const [customTargetInput, setCustomTargetInput] = React.useState("100");

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
  const tasbeehDailyLog = useNoorStore((s) => s.tasbeehDailyLog);
  const tasbeehLifetime = useNoorStore((s) => s.tasbeehLifetime);

  // Today's leaderboard tasbeeh challenge
  const dailyChallenge = React.useMemo(() => getDailyTasbeeh(getLocalDateKey()), []);

  // Sync custom phrase form with stored custom dhikr
  React.useEffect(() => {
    if (sebhaCustom) {
      setCustomPhraseInput(sebhaCustom.phrase);
      setCustomTargetInput(String(sebhaCustom.target));
    }
  }, [sebhaCustom]);

  const current =
    selected === "custom"
      ? { key: "custom" as const, label: sebhaCustom?.phrase ?? "ذكر مخصص", short: sebhaCustom?.phrase ?? "ذكر مخصص", hint: "" }
      : TASBEEHAT.find((item) => item.key === selected) ?? TASBEEHAT[0];

  const effectiveTarget = selected === "custom" ? (sebhaCustom?.target ?? 100) : target;
  const count = tallyMode ? tallyCount : Number(quickTasbeeh[selected] ?? 0);
  const percent = tallyMode ? 0 : pct(Math.min(count, effectiveTarget), effectiveTarget);
  const remaining = tallyMode ? null : Math.max(0, effectiveTarget - count);
  const completed = !tallyMode && count >= effectiveTarget;

  // increment accepts an optional keyOverride so voice recognition can count
  // a matched phrase's key directly (avoids stale-closure bug when key differs
  // from the currently selected item).
  const increment = React.useCallback((keyOverride?: TasbeehKey) => {
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
      const activeKey = keyOverride ?? selected;
      const activeEffTarget =
        activeKey === "custom" ? (sebhaCustom?.target ?? 100) : target;
      const activeLabel = keyOverride
        ? (TASBEEHAT.find((t) => t.key === keyOverride)?.short ?? keyOverride)
        : current.short;
      const next = incQuickTasbeeh(activeKey, activeEffTarget);
      // Detect silent block (count already at target)
      const currentCount = Number(quickTasbeeh[activeKey] ?? 0);
      if (next === currentCount && currentCount >= activeEffTarget) {
        toast("اكتملت التسبيحة ✓ اضغط \"تصفير الحالي\" للبدء من جديد", { id: "tasbeeh-blocked" });
        return;
      }
      doHaptic(next, activeEffTarget, prefs.enableHaptics);
      if (next === activeEffTarget) {
        toast.success("اكتمل هدف التسبيح 🎉");
        addSebhaSession({
          dhikrKey: activeKey,
          dhikrLabel: activeLabel,
          count: next,
          target: activeEffTarget,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [tallyMode, incQuickTasbeeh, prefs.enableHaptics, selected, target, sebhaCustom, current.short, addSebhaSession]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); increment(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [increment]);

  // 6B: Voice recognition — when a phrase matches, switch + count; null = count current.
  // Pass the matched key directly to increment() so the correct dhikr is counted
  // even before React re-renders with the new selected state.
  const { listening, starting: voiceStarting, toggle: toggleVoice, supported: voiceSupported } = useSpeechCount(
    React.useCallback((matchedKey: string | null) => {
      if (matchedKey && TASBEEHAT.some(t => t.key === matchedKey)) {
        const mk = matchedKey as TasbeehKey;
        if (mk !== selected) setSelected(mk);
        increment(mk); // count the matched key explicitly — avoids stale-closure bug
      } else {
        increment(); // unrecognized phrase → count current selected
      }
    }, [selected, increment])
  );

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
    // Reset custom count when phrase changes to avoid key collision
    if (sebhaCustom && sebhaCustom.phrase !== phrase) {
      resetQuickTasbeeh("custom");
    }
    setSebhaCustom({ phrase, target: t });
    setSelected("custom");
    setShowCustomForm(false);
    toast.success("تم حفظ الذكر المخصص");
  }

  return (
    <div className="space-y-3 page-enter">
      {/* Header card */}
      <Card className="p-5 overflow-hidden relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}>
              <ArrowRight size={18} aria-hidden="true" />
            </IconButton>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={15} aria-hidden="true" className="text-[var(--accent)]" />
                <span className="text-xs font-semibold opacity-60">سبحة ذكية</span>
                {tallyMode ? <Badge>وضع حر</Badge> : <Badge>{totalDone}/{totalTarget}</Badge>}
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-bold leading-tight">السبحة اليومية</h1>
              <div className="mt-1 text-sm opacity-65 leading-6">
                عداد هادئ للتسبيح والصلاة على النبي، محفوظ ضمن يومك الإيماني.
              </div>
              {/* Leaderboard daily challenge */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] opacity-60">
                <Target size={11} aria-hidden="true" className="text-[var(--accent)] shrink-0" />
                <span>تحدي اليوم في الترتيب:</span>
                <span className="font-semibold text-[var(--accent)]">{dailyChallenge.label} × {dailyChallenge.target}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {/* S3 - Sessions history toggle */}
            <IconButton
              aria-label="سجل الجلسات"
              aria-pressed={showHistory}
              onClick={() => setShowHistory((v) => !v)}
              className={cn(showHistory && "text-[var(--accent)]")}
            >
              <History size={17} aria-hidden="true" />
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
                <RotateCw size={17} aria-hidden="true" />
              </IconButton>
            )}
          </div>
        </div>
        {!tallyMode && (
          <div
            className="mt-4 h-2 rounded-full bg-[var(--card)] border border-[var(--stroke)] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(allPercent)}
            aria-label={`تقدم الجلسة: ${Math.round(allPercent)}%`}
          >
            <div className="h-full progress-accent transition-[width] duration-300" style={{ width: `${allPercent}%` }} />
          </div>
        )}
      </Card>

      {/* S3 - Sessions history panel */}
      {showHistory && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History size={15} aria-hidden="true" className="text-[var(--accent)]" />
              <span className="text-sm font-semibold">سجل الجلسات</span>
              {sebhaSessions.length > 0 && <Badge>{sebhaSessions.length}</Badge>}
            </div>
            {sebhaSessions.length > 0 && (
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={async () => {
                    const lines = sebhaSessions.slice(0, 10).map(
                      (s) => `• ${s.dhikrLabel}: ${s.count}${s.target ? `/${s.target}` : ""}`
                    );
                    const text = `جلسات التسبيح اليوم:\n${lines.join("\n")}\n\n• ATHAR أثر`;
                    if (navigator.share) {
                      await navigator.share({ text }).catch(() => {});
                    } else {
                      await navigator.clipboard.writeText(text).catch(() => {});
                      toast.success("تم النسخ");
                    }
                  }}
                  className="flex items-center gap-1 text-xs opacity-50 hover:opacity-80 transition"
                >
                  <Share2 size={13} />
                  مشاركة
                </button>
                <button type="button"
                  onClick={() => { clearSebhaSessions(); toast.success("تم مسح السجل"); }}
                  className="flex items-center gap-1 text-xs opacity-50 hover:opacity-80 hover:text-red-400 transition"
                >
                  <Trash2 size={13} />
                  مسح
                </button>
              </div>
            )}
          </div>
          {sebhaSessions.length === 0 ? (
            <div className="text-xs opacity-40 text-center py-4">لا توجد جلسات مسجلة بعد</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sebhaSessions.map((s, i) => (
                <div key={`${s.timestamp}-${s.dhikrKey}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--card)] px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.target === null
                      ? <Flag size={12} aria-hidden="true" className="text-[var(--accent)] shrink-0" />
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
              <div className="flex rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-1">
                {TARGETS.map((value) => (
                  <button type="button"
                    key={value}
                    onClick={() => setTarget(value)}
                    className={cn(
                      "min-w-10 rounded-xl px-3 py-2 text-xs font-semibold transition",
                      target === value ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--muted)] hover:bg-[var(--card-2)]"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
            {/* S5 - Tally mode toggle */}
            <button type="button"
              aria-label="وضع العدّ الحر"
              aria-pressed={tallyMode}
              onClick={() => {
              // Auto-save tally session before switching mode
              if (tallyMode && tallyCount > 0) {
                addSebhaSession({
                  dhikrKey: "tally",
                  dhikrLabel: current.short,
                  count: tallyCount,
                  target: null,
                  timestamp: new Date().toISOString(),
                });
                toast("تم حفظ جلسة التسبيح الحر", { icon: "💾" });
              }
              setTallyMode((v) => !v); setTallyCount(0); setTallyLaps([]);
            }}
              className={cn(
                "flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                tallyMode
                  ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                  : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-2)]"
              )}
            >
              <Timer size={13} aria-hidden="true" />
              <span>وضع حر</span>
              {tallyMode && <CheckCircle2 size={11} aria-hidden="true" />}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={handleReset}>
              <RotateCw size={16} aria-hidden="true" />
              تصفير الحالي
            </Button>
            {/* 6B: Voice mic button */}
            {voiceSupported && (
              <button type="button"
                onClick={toggleVoice}
                title={listening ? "إيقاف الاستماع" : "عدّ بالصوت"}
                aria-label={listening ? "إيقاف الاستماع بالصوت" : "تفعيل العدّ بالصوت"}
                aria-pressed={listening}
                disabled={voiceStarting}
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition shrink-0",
                  listening
                    ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                    : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-2)]",
                  voiceStarting && "opacity-60"
                )}
              >
                {listening ? <MicOff size={13} aria-hidden="true" /> : <Mic size={13} aria-hidden="true" />}
                {voiceStarting ? "طلب الإذن" : listening ? "جارٍ الاستماع" : "صوت"}
              </button>
            )}
          </div>
        </div>

        {/* S4 - Circular ring counter */}
        <CircularRing percent={percent} completed={completed} onClick={increment} showHint={count === 0}>
          <div className="text-center">
            <div className="text-xs opacity-55 mb-2">{current.short}</div>
            <div className="text-6xl font-black tabular-nums leading-none" aria-live="polite" aria-atomic="true">{count}</div>
            {!tallyMode && <div className="mt-2 text-xs opacity-60">من {effectiveTarget}</div>}
            {tallyMode && tallyLaps.length > 0 && (
              <div className="mt-2 text-xs opacity-60">دورة {tallyLaps.length}</div>
            )}
          </div>
        </CircularRing>

        {/* Status line */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm opacity-75">
          {tallyMode ? (
            <><Timer size={17} aria-hidden="true" className="text-[var(--accent)]" /><span>عد حر — بدون هدف</span></>
          ) : completed ? (
            <><CheckCircle2 size={17} aria-hidden="true" className="text-[var(--ok)]" />تم الهدف</>
          ) : (
            <><Target size={17} aria-hidden="true" className="text-[var(--accent)]" />{remaining} متبقي</>
          )}
        </div>

        {/* S5 - Tally lap markers */}
        {tallyMode && tallyLaps.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {tallyLaps.map((lap, i) => (
              <span
                key={i}
                className="text-xs rounded-full bg-accent-15 border border-accent-25 px-2 py-0.5 text-[var(--accent)]"
              >
                {lap % 100 === 0 ? "💯" : "🔖"} {lap}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Quick-select phrase shortcuts */}
      <div>
        <div className="text-[10px] font-semibold opacity-40 mb-2 uppercase tracking-wider px-1">أذكار سريعة</div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_PHRASES.map((qp) => {
            const isActiveQP = selected === "custom" && sebhaCustom?.phrase === qp.phrase;
            return (
              <button
                key={qp.phrase}
                type="button"
                onClick={() => {
                  setSebhaCustom({ phrase: qp.phrase, target: qp.target });
                  setSelected("custom");
                  toast.success("تم اختيار الذكر");
                }}
                className={cn(
                  "flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium transition-all active:scale-95 arabic-text whitespace-nowrap border",
                  isActiveQP
                    ? "bg-accent-15 border-accent-40 text-[var(--accent)]"
                    : "border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)]"
                )}
              >
                {qp.phrase}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasbeehat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {TASBEEHAT.map((item) => {
          const itemCount = Number(quickTasbeeh[item.key] ?? 0);
          const itemPercent = pct(Math.min(itemCount, target), target);
          const active = item.key === selected;
          const itemDone = itemCount >= target;
          return (
            <button type="button"
              key={item.key}
              onClick={() => setSelected(item.key)}
              className={cn(
                "glass rounded-3xl p-4 text-right border transition active:scale-[.98]",
                active ? "border-accent-35 bg-accent-8"
                : itemDone ? "border-ok-35 bg-ok-6 hover:bg-ok-8"
                : "border-[var(--stroke)] hover:bg-[var(--card)]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="arabic-text text-base font-bold leading-7">{item.label}</div>
                  <div className="mt-1 text-xs opacity-55 leading-5">{item.hint}</div>
                </div>
                <Badge>{Math.min(itemCount, target)}/{target}</Badge>
              </div>
              <div
                className="mt-3 h-1.5 rounded-full bg-[var(--card)] overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(Math.round(itemPercent), 100)}
                aria-label={`${item.label}: ${Math.min(itemCount, target)} من ${target}`}
              >
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
          <button type="button"
            onClick={() => setSelected("custom")}
            className={cn(
              "glass rounded-3xl p-4 text-right border transition active:scale-[.98]",
              selected === "custom"
                ? "border-accent-35 bg-accent-8"
                : "border-[var(--stroke)] hover:bg-[var(--card)]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="arabic-text text-base font-bold leading-7 truncate">{sebhaCustom.phrase}</div>
                <div className="mt-1 text-xs opacity-55">ذكر مخصص · هدف {sebhaCustom.target}</div>
              </div>
              <div className="flex items-center gap-1">
                <Badge>{Math.min(Number(quickTasbeeh["custom"] ?? 0), sebhaCustom.target)}/{sebhaCustom.target}</Badge>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setShowCustomForm(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setShowCustomForm(true); } }}
                  className="opacity-40 hover:opacity-80 transition p-1 cursor-pointer"
                  aria-label="تعديل الذكر المخصص"
                >
                  <Pencil size={13} aria-hidden="true" />
                </span>
              </div>
            </div>
            <div
              className="mt-3 h-1.5 rounded-full bg-[var(--card)] overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(Math.round(pct(Math.min(Number(quickTasbeeh["custom"] ?? 0), sebhaCustom.target), sebhaCustom.target)), 100)}
              aria-label={`${sebhaCustom.phrase}: ${Math.min(Number(quickTasbeeh["custom"] ?? 0), sebhaCustom.target)} من ${sebhaCustom.target}`}
            >
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
          <button type="button"
            onClick={() => setShowCustomForm(true)}
            className="glass rounded-3xl p-4 text-center border border-dashed border-[var(--stroke)] hover:bg-[var(--card)] transition active:scale-[.98] flex flex-col items-center justify-center gap-2 min-h-[100px]"
          >
            <Plus size={20} aria-hidden="true" className="opacity-40" />
            <span className="text-xs opacity-50">إضافة ذكر مخصص</span>
          </button>
        )}
      </div>

      {/* S2 - Custom dhikr form */}
      {showCustomForm && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pencil size={15} aria-hidden="true" className="text-[var(--accent)]" />
            <span className="text-sm font-semibold">ذكر مخصص</span>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="custom-phrase" className="text-xs opacity-60 mb-1 block">نص الذكر</label>
              <input
                id="custom-phrase"
                type="text"
                dir="rtl"
                value={customPhraseInput}
                onChange={(e) => setCustomPhraseInput(e.target.value)}
                placeholder="مثال: صلِّ على النبي"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-sm outline-none focus:border-accent-50 transition"
              />
            </div>
            <div>
              <label htmlFor="custom-target" className="text-xs opacity-60 mb-1 block">الهدف</label>
              <input
                id="custom-target"
                type="number"
                min={1}
                max={10000}
                value={customTargetInput}
                onChange={(e) => setCustomTargetInput(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-sm outline-none focus:border-accent-50 transition"
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

      {/* 6C: Weekly stats */}
      <TasbeehStatsCard tasbeehDailyLog={tasbeehDailyLog} tasbeehLifetime={tasbeehLifetime} sebhaCustom={sebhaCustom} />
    </div>
  );
}
