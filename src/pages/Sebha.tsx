import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Target,
  History,
  Trash2,
  Plus,
  Pencil,
  Mic,
  MicOff,
  BarChart2,
  Share2,
  Flame,
  BookHeart,
  Activity as ActivityIcon,
  MoveUp,
  MoveDown,
  Timer,
} from "lucide-react";
import { ASMA_AL_HUSNA } from "@/data/asmaAlHusna";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useNoorStore } from "@/store/noorStore";
import type { SebhaSession, CustomDhikr } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";
import { toArabicNumeral } from "@/lib/quranMeta";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { getDailyTasbeeh } from "@/lib/leaderboardScores";
import { getLocalDateKey } from "@/lib/dayBoundaries";
import { doHaptic, playCompletionSound } from "@/lib/sebhaHaptics";
import { SOUND_PROFILES, mascotForPhrase } from "@/lib/dhikrCatalog";
import type { MascotKey } from "@/lib/dhikrCatalog";
import { CUSTOM_DHIKR_COLORS, suggestColorForPhrase, isValidHexColor } from "@/lib/dhikrCustom";
import { arNum } from "@/lib/formatNumber";


// ─── Constants ────────────────────────────────────────────────────────────────

const TASBEEHAT = [
  {
    key: "subhanallah",
    label: "سُبْحَانَ الله",
    short: "سبحان الله",
    hint: "تنزيه لله وتعظيم له",
    accent: "#7dd3fc",
  },
  {
    key: "alhamdulillah",
    label: "الْحَمْدُ لِلَّه",
    short: "الحمد لله",
    hint: "شكر وثناء في كل حال",
    accent: "#fbbf24",
  },
  {
    key: "la_ilaha_illallah",
    label: "لا إِلَهَ إِلَّا الله",
    short: "لا إله إلا الله",
    hint: "كلمة التوحيد وأصل الذكر",
    accent: "#a78bfa",
  },
  {
    key: "allahu_akbar",
    label: "اللهُ أَكْبَر",
    short: "الله أكبر",
    hint: "تكبير يرفع القلب عن الشواغل",
    accent: "#34d399",
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

// `doHaptic` is now imported from @/lib/sebhaHaptics so the Sebha page, the
// QuickTasbeehFab, and unit tests share a single definition with light /
// medium / strong / off strengths.

// ─── Mascot (decorative animated icon per dhikr) ──────────────────────────

function DhikrMascot({ mascot, accent }: { mascot: MascotKey; accent?: string }) {
  const color = accent ?? "var(--accent)";
  const common = "absolute inset-0 m-auto";
  switch (mascot) {
    case "wave":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <path d="M4 28 Q11 18 18 28 T32 28 T44 28" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M4 22 Q11 12 18 22 T32 22 T44 22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        </svg>
      );
    case "sun":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-spin-slow"} aria-hidden="true">
          <circle cx="22" cy="22" r="7" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line key={deg} x1="22" y1="22" x2="22" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg} 22 22)`} opacity="0.7" />
          ))}
        </svg>
      );
    case "star":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <polygon points="22,4 26,18 40,18 29,26 33,40 22,31 11,40 15,26 4,18 18,18" fill={color} />
        </svg>
      );
    case "moon":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <path d="M30 6 a16 16 0 1 0 8 32 a12 12 0 1 1 -8 -32" fill={color} />
        </svg>
      );
    case "drop":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <path d="M22 4 C12 18 8 26 8 32 a14 14 0 0 0 28 0 c0 -6 -4 -14 -14 -28 z" fill={color} />
        </svg>
      );
    case "leaf":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <path d="M8 36 C8 16 20 4 40 4 C40 24 28 36 8 36 z" fill={color} opacity="0.85" />
          <path d="M8 36 L36 8" stroke="white" strokeWidth="1.5" opacity="0.7" />
        </svg>
      );
    case "flame":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <path d="M22 4 C18 14 12 18 14 28 C14 36 22 40 22 40 C22 40 30 36 30 28 C32 18 26 14 22 4 z" fill={color} />
        </svg>
      );
    case "heart":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common + " mascot-anim"} aria-hidden="true">
          <path d="M22 38 C8 28 4 22 4 14 a8 8 0 0 1 18 -2 a8 8 0 0 1 18 2 c0 8 -4 14 -18 24 z" fill={color} />
        </svg>
      );
    default:
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" className={common} aria-hidden="true">
          <circle cx="22" cy="22" r="10" fill={color} opacity="0.8" />
        </svg>
      );
  }
}

// ─── 30-day history mini-chart ─────────────────────────────────────────────

function HistoryChart({ log }: { log: Record<string, Record<string, number>> }) {
  const data = React.useMemo(() => {
    const today = new Date();
    const cells: Array<{ key: string; total: number; date: Date }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = log[key] ?? {};
      const total = Object.values(day).reduce((s, v) => s + (Number(v) || 0), 0);
      cells.push({ key, total, date: d });
    }
    return cells;
  }, [log]);
  const max = Math.max(1, ...data.map((c) => c.total));
  const total = data.reduce((s, c) => s + c.total, 0);
  if (total === 0) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ActivityIcon size={14} className="text-[var(--accent)]" />
        <span className="text-sm font-semibold">آخر ٣٠ يوماً</span>
        <span className="text-[11px] opacity-50 mr-auto tabular-nums">المجموع: {arNum(total)}</span>
      </div>
      <div className="flex items-end gap-1 h-16" aria-label="رسم بياني للتسابيح اليومية">
        {data.map((c) => {
          const heightPct = Math.round((c.total / max) * 100);
          const isToday = c.key === data[data.length - 1]?.key;
          return (
            <div
              key={c.key}
              title={`${c.key}: ${c.total}`}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: `${Math.max(4, heightPct)}%`,
                background: isToday ? "var(--accent)" : c.total > 0 ? "var(--card-2)" : "transparent",
                border: c.total === 0 ? "1px solid var(--stroke)" : undefined,
                opacity: c.total > 0 ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] opacity-50">
        <span>قبل ٣٠ يوماً</span>
        <span>اليوم</span>
      </div>
    </Card>
  );
}

// ─── Streak card ──────────────────────────────────────────────────────────

function StreakCard({ streak, best, lastActive }: { streak: number; best: number; lastActive: string | null }) {
  const today = getLocalDateKey();
  const active = lastActive === today;
  const yest = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const broken = !active && lastActive !== yest && streak > 0;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Flame size={14} className={streak > 0 ? "text-orange-400" : "text-[var(--accent)]"} />
        <span className="text-sm font-semibold">سلسلة التسبيح</span>
        <span className="text-[10px] opacity-50 mr-auto">
          {best > 0 ? `أفضل: ${best} يوم` : "ابدأ سلسلتك اليوم"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums">{streak}</span>
        <span className="text-xs opacity-60">يوم متواصل</span>
        {streak >= 7 && <span className="text-xs">⚡</span>}
        {streak >= 30 && <span className="text-xs">🔥</span>}
      </div>
      {broken && (
        <div className="mt-2 text-[11px] opacity-70 leading-5">
          ⚠️ انقطعت سلسلتك — اعمل ١ تسبيحة للحفاظ على سلسلتك
        </div>
      )}
      {!active && streak === 0 && (
        <div className="mt-2 text-[11px] opacity-60">اعمل ١ تسبيحة للحفاظ على سلسلتك</div>
      )}
      {active && (
        <div className="mt-2 text-[11px] font-semibold" style={{ color: "var(--ok)" }}>✓ اليوم مكتمل</div>
      )}
    </Card>
  );
}

// ─── Daily goal card ───────────────────────────────────────────────────────

function DailyGoalCard({
  goal,
  today,
  celebratedDate,
  onChangeGoal,
  onShare,
}: {
  goal: number;
  today: number;
  celebratedDate: string | null;
  onChangeGoal: (n: number) => void;
  onShare: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(goal));
  const todayKey = getLocalDateKey();
  const pctDone = goal > 0 ? Math.min(100, Math.round((today / goal) * 100)) : 0;
  const completed = goal > 0 && today >= goal;
  React.useEffect(() => { setDraft(String(goal)); }, [goal]);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Target size={14} className="text-[var(--accent)]" />
        <span className="text-sm font-semibold">هدف اليوم</span>
        <span className="text-[10px] opacity-50 mr-auto">{arNum(today)} / {goal > 0 ? arNum(goal) : "—"}</span>
      </div>
      {goal > 0 ? (
        <>
          <div className="h-2 rounded-full bg-[var(--card)] border border-[var(--stroke)] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pctDone}%`, background: completed ? "var(--ok)" : "var(--accent)" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] opacity-60 tabular-nums">{pctDone}%</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="text-[10px] opacity-50 hover:opacity-80 transition"
                aria-label="تعديل الهدف"
              >
                <Pencil size={11} />
              </button>
              {completed && celebratedDate !== todayKey && (
                <button
                  type="button"
                  onClick={onShare}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(125,211,252,0.15)", color: "var(--accent)" }}
                >
                  <Share2 size={11} />
                  مشاركة الإنجاز
                </button>
              )}
            </div>
          </div>
          {editing && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={10000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-2 py-1 text-xs outline-none"
                inputMode="numeric"
              />
              <Button size="sm" onClick={() => { onChangeGoal(Math.max(0, Number(draft) || 0)); setEditing(false); }}>حفظ</Button>
              <Button size="sm" variant="secondary" onClick={() => { setDraft(String(goal)); setEditing(false); }}>إلغاء</Button>
            </div>
          )}
          {completed && (
            <div className="mt-2 text-[11px] font-semibold" style={{ color: "var(--ok)" }}>
              🎉 أتممت هدف اليوم
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => { setEditing(true); }}
          className="text-[11px] opacity-60 hover:opacity-90 transition"
        >
          + تعيين هدف يومي (مثال: ١٠٠ تسبيحة)
        </button>
      )}
      {editing && goal === 0 && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={10000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-2 py-1 text-xs outline-none"
            inputMode="numeric"
            placeholder="100"
          />
          <Button size="sm" onClick={() => { onChangeGoal(Math.max(1, Number(draft) || 100)); setEditing(false); }}>حفظ</Button>
        </div>
      )}
    </Card>
  );
}

// ─── Circular progress ring (S4) — single tap only, no drag, no hint. ─────

const RING_R = 106;
const RING_C = 2 * Math.PI * RING_R;

function CircularRing({
  percent,
  completed,
  children,
  onClick,
  accent,
}: {
  percent: number;
  completed: boolean;
  children: React.ReactNode;
  onClick: () => void;
  showHint?: boolean;
  accent?: string;
}) {
  const offset = RING_C * (1 - Math.min(percent, 100) / 100);

  return (
    <div
      className="relative mx-auto mt-6 flex items-center justify-center"
      style={{ width: 224, height: 224, maxWidth: "74vw", maxHeight: "74vw" }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224" aria-hidden="true" style={{ pointerEvents: "none" }}>
        <circle cx="112" cy="112" r={RING_R} fill="none" stroke="var(--stroke)" strokeWidth="6" />
        <circle
          cx="112"
          cy="112"
          r={RING_R}
          fill="none"
          stroke={completed ? "var(--ok)" : (accent ?? "var(--accent)")}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          transform="rotate(-90 112 112)"
          style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease" }}
        />
      </svg>
      <button type="button"
        onClick={onClick}
        className={cn(
          "absolute inset-0 rounded-full border transition active:scale-[.98] select-none flex items-center justify-center",
          completed
            ? "bg-transparent border-ok-30"
            : "bg-transparent border-accent-25 hover:bg-accent-8"
        )}
        aria-label="اضغط للعد"
        aria-keyshortcuts="Space"
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

// ─── Animated counter number (counter-pop CSS in globals.css) ────────────────

function CounterNumber({ value }: { value: number }) {
  const prevRef = React.useRef(value);
  const [animKey, setAnimKey] = React.useState(0);
  React.useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value;
      setAnimKey((k) => k + 1);
    }
  }, [value]);
  return (
    <div
      key={animKey}
      className="text-6xl font-black tabular-nums leading-none counter-pop"
      aria-live="polite"
      aria-atomic="true"
    >
      {value}
    </div>
  );
}

// ─── Today's count line ─────────────────────────────────────────────────────

function TodayLine({ tasbeehDailyLog }: { tasbeehDailyLog: Record<string, Record<string, number>> }) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const totals = React.useMemo(() => {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const day = tasbeehDailyLog[today] ?? {};
    const todayTotal = Object.values(day).reduce((s, v) => s + (Number(v) || 0), 0);
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const t = Object.values(tasbeehDailyLog[dk] ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
      weekTotal += t;
    }
    return { todayTotal, weekTotal };
  }, [tasbeehDailyLog, now]);
  if (totals.todayTotal === 0 && totals.weekTotal === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-center gap-3 text-[11px] opacity-60 tabular-nums">
      <span>اليوم: <span className="font-semibold opacity-90">{arNum(totals.todayTotal)}</span></span>
      <span aria-hidden="true">·</span>
      <span>هذا الأسبوع: <span className="font-semibold opacity-90">{arNum(totals.weekTotal)}</span></span>
    </div>
  );
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
          <div className="w-3 h-1.5 rounded-full bg-[var(--card-2)]" />
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

  // وضع حر — free counting, no target. Toggled from the small chip in the header.
  const [tallyMode, setTallyMode] = React.useState(false);
  const [tallyCount, setTallyCount] = React.useState(0);

  // S2 - Custom dhikr form
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [customPhraseInput, setCustomPhraseInput] = React.useState("");
  const [customTargetInput, setCustomTargetInput] = React.useState("100");
  const [customColorInput, setCustomColorInput] = React.useState(CUSTOM_DHIKR_COLORS[0]!.hex);
  const [customTranslitInput, setCustomTranslitInput] = React.useState("");
  const [editingCustomId, setEditingCustomId] = React.useState<string | null>(null);

  // S3 - Sessions panel toggle
  const [showHistory, setShowHistory] = React.useState(false);

  // Tabs — "dua" removed per user request.
  const [activeTab, setActiveTab] = React.useState<"dhikr" | "asma">("dhikr");

  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const resetQuickTasbeeh = useNoorStore((s) => s.resetQuickTasbeeh);
  const resetAllQuickTasbeeh = useNoorStore((s) => s.resetAllQuickTasbeeh);
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const sebhaSessions = useNoorStore((s) => s.sebhaSessions);
  const addSebhaSession = useNoorStore((s) => s.addSebhaSession);
  const clearSebhaSessions = useNoorStore((s) => s.clearSebhaSessions);
  const sebhaCustom = useNoorStore((s) => s.sebhaCustom);
  const setSebhaCustom = useNoorStore((s) => s.setSebhaCustom);
  const sebhaCustomList = useNoorStore((s) => s.sebhaCustomList);
  const addSebhaCustomItem = useNoorStore((s) => s.addSebhaCustomItem);
  const updateSebhaCustomItem = useNoorStore((s) => s.updateSebhaCustomItem);
  const deleteSebhaCustomItem = useNoorStore((s) => s.deleteSebhaCustomItem);
  const reorderSebhaCustomList = useNoorStore((s) => s.reorderSebhaCustomList);
  const tasbeehDailyLog = useNoorStore((s) => s.tasbeehDailyLog);
  const tasbeehLifetime = useNoorStore((s) => s.tasbeehLifetime);
  const tasbeehStreak = useNoorStore((s) => s.tasbeehStreak);
  const tasbeehStreakBest = useNoorStore((s) => s.tasbeehStreakBest);
  const tasbeehLastActiveDate = useNoorStore((s) => s.tasbeehLastActiveDate);
  const recordTasbeehActivity = useNoorStore((s) => s.recordTasbeehActivity);
  const tasbeehDailyGoal = useNoorStore((s) => s.tasbeehDailyGoal);
  const setTasbeehDailyGoal = useNoorStore((s) => s.setTasbeehDailyGoal);
  const tasbeehGoalCelebratedDate = useNoorStore((s) => s.tasbeehGoalCelebratedDate);
  const markTasbeehGoalCelebrated = useNoorStore((s) => s.markTasbeehGoalCelebrated);
  const incAsmaHusnaCount = useNoorStore((s) => s.incAsmaHusnaCount);
  const asmaHusnaCounts = useNoorStore((s) => s.asmaHusnaCounts);

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
      ? { key: "custom" as const, label: sebhaCustom?.phrase ?? "ذكر مخصص", short: sebhaCustom?.phrase ?? "ذكر مخصص", hint: "", accent: undefined as string | undefined }
      : TASBEEHAT.find((item) => item.key === selected) ?? TASBEEHAT[0];

  const effectiveTarget = selected === "custom" ? (sebhaCustom?.target ?? 100) : target;
  const count = tallyMode ? tallyCount : Number(quickTasbeeh[selected] ?? 0);
  const percent = tallyMode ? 0 : pct(Math.min(count, effectiveTarget), effectiveTarget);
  const remaining = tallyMode ? null : Math.max(0, effectiveTarget - count);
  const completed = !tallyMode && count >= effectiveTarget;

  // increment accepts an optional keyOverride so voice recognition can count
  // a matched phrase's key directly (avoids stale-closure bug when key differs
  // from the currently selected item).
  const increment = React.useCallback((keyOverride?: TasbeehKey | React.SyntheticEvent) => {
    // Some call sites wire `onClick={increment}` directly. React passes the
    // SyntheticEvent as the first argument, but we expect either no arg OR a
    // TasbeehKey. Detect and ignore the SyntheticEvent case.
    const isSyntheticEvent = keyOverride != null
      && typeof keyOverride === "object"
      && ("nativeEvent" in (keyOverride as object) || "persist" in (keyOverride as object) || "currentTarget" in (keyOverride as object));
    const override: TasbeehKey | undefined = isSyntheticEvent ? undefined : (keyOverride as TasbeehKey | undefined);
    if (tallyMode) {
      // وضع حر: just count locally with no target. No haptics on every count to keep it calm.
      setTallyCount((c) => c + 1);
      return;
    }
    const activeKey = (override ?? selected) as string;
    const activeEffTarget =
      activeKey === "custom" ? (sebhaCustom?.target ?? 100) : target;
    const activeLabel = override
      ? (TASBEEHAT.find((t) => t.key === override)?.short ?? override)
      : current.short;
    // Read fresh value from the store to avoid stale-closure on rapid taps
    const beforeCount = Number(useNoorStore.getState().quickTasbeeh[activeKey] ?? 0);
    const next = incQuickTasbeeh(activeKey, activeEffTarget);
    if (next === beforeCount && beforeCount >= activeEffTarget) {
      toast("اكتملت التسبيحة ✓ اضغط \"تصفير الحالي\" للبدء من جديد", { id: "tasbeeh-blocked" });
      return;
    }
    doHaptic(next, activeEffTarget, prefs.enableHaptics, prefs.hapticStrength);
    const reachedTarget = next === activeEffTarget;
    // Streak + activity
    recordTasbeehActivity(getLocalDateKey());
    // Daily goal completion
    const todayKey = getLocalDateKey();
    const todayTotal = Object.values(useNoorStore.getState().tasbeehDailyLog[todayKey] ?? {}).reduce((s, v) => s + (Number(v) ?? 0), 0);
    if (tasbeehDailyGoal > 0 && todayTotal >= tasbeehDailyGoal && tasbeehGoalCelebratedDate !== todayKey) {
      markTasbeehGoalCelebrated(todayKey);
      const getConfetti = () => import("canvas-confetti").then((m) => m.default ?? m);
      getConfetti().then((c) => {
        c({ particleCount: 120, spread: 100, startVelocity: 32, scalar: 1, origin: { y: 0.5 } });
      });
      const profile = SOUND_PROFILES.find((p) => p.id === prefs.tasbeehSoundProfile) ?? SOUND_PROFILES[0]!;
      playCompletionSound(prefs.enableSounds, profile);
      toast.success(`أتممت هدف اليوم (${tasbeehDailyGoal}) 🎉`, { duration: 3500 });
    }
    if (reachedTarget) {
      const getConfetti = () => import("canvas-confetti").then((m) => m.default ?? m);
      getConfetti().then((c) => {
        c({ particleCount: 80, spread: 80, startVelocity: 28, scalar: 0.9, origin: { y: 0.6 } });
        setTimeout(() => c({ particleCount: 40, spread: 90, startVelocity: 18, scalar: 0.85, origin: { x: 0.2, y: 0.75 } }), 320);
      });
      const profile = SOUND_PROFILES.find((p) => p.id === prefs.tasbeehSoundProfile) ?? SOUND_PROFILES[0]!;
      playCompletionSound(prefs.enableSounds, profile);
      addSebhaSession({
        dhikrKey: activeKey,
        dhikrLabel: activeLabel,
        count: next,
        target: activeEffTarget,
        timestamp: new Date().toISOString(),
      });
      toast.success("اكتمل هدف التسبيح 🎉", { duration: 2500 });
      if (prefs.autoAdvanceDhikr) {
        const idx = TASBEEHAT.findIndex((t) => t.key === activeKey);
        if (idx >= 0 && idx < TASBEEHAT.length - 1) {
          const nextKey = TASBEEHAT[idx + 1].key;
          setTimeout(() => setSelected(nextKey), 1500);
        } else if (idx === TASBEEHAT.length - 1) {
          setTimeout(() => setSelected(TASBEEHAT[0].key), 1500);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incQuickTasbeeh, prefs.enableHaptics, prefs.hapticStrength, prefs.enableSounds, prefs.autoAdvanceDhikr, prefs.tasbeehSoundProfile, selected, target, sebhaCustom, current.short, addSebhaSession, setSelected, recordTasbeehActivity, tasbeehDailyGoal, tasbeehGoalCelebratedDate, markTasbeehGoalCelebrated]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (target?.closest?.('[role="dialog"],[role="alertdialog"],[data-state="open"][aria-modal="true"]')) return;
      if (showCustomForm || showHistory || confirmReset) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); increment(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [increment, showCustomForm, showHistory, confirmReset]);

  // Intentionally not adding fast-tasbeeh here: per user request, only one
  // single tap at a time should register — no long-press bulk, no double-click
  // menu, no drag-to-count. The pointer handlers on CircularRing still
  // support a single tap-as-click; everything else is dropped.

  // Android-style physical volume-button increment (gated by enableHaptics)
  React.useEffect(() => {
    if (!prefs.tasbeehVolumeKeysEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "AudioVolumeUp" || e.key === "AudioVolumeDown") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        if (e.key === "AudioVolumeUp") increment();
        else {
          // Decrement: manually rewind by 1 if count > 0
          const k = selected;
          const before = Number(useNoorStore.getState().quickTasbeeh[k] ?? 0);
          if (before > 0) useNoorStore.setState((s) => ({ quickTasbeeh: { ...s.quickTasbeeh, [k]: before - 1 } }));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.tasbeehVolumeKeysEnabled, increment, selected]);

  // Share current stats
  const shareStats = React.useCallback(async () => {
    const todayKey = getLocalDateKey();
    const todayTotal = Object.values(useNoorStore.getState().tasbeehDailyLog[todayKey] ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const week = (() => {
      let t = 0;
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        t += Object.values(useNoorStore.getState().tasbeehDailyLog[k] ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
      }
      return t;
    })();
    const life = Object.values(useNoorStore.getState().tasbeehLifetime).reduce((s, v) => s + (Number(v) || 0), 0);
    const text = `إحصائياتي في أثر:\n• اليوم: ${arNum(todayTotal)} تسبيحة\n• هذا الأسبوع: ${arNum(week)} تسبيحة\n• الإجمالي: ${arNum(life)} تسبيحة\n🔥 سلسلة ${tasbeehStreak} يوم\n\n﴿ فَاذْكُرُونِي أَذْكُرْكُمْ ﴾\n— أثر`;
    try {
      if (navigator.share) await navigator.share({ text }).catch(() => {});
      else { await navigator.clipboard.writeText(text); toast.success("تم نسخ الإحصائيات"); }
    } catch { /* ignore */ }
  }, [tasbeehStreak]);

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
    }, [selected, increment, setSelected])
  );

  const totalDone = TASBEEHAT.reduce(
    (sum, item) => sum + Math.min(Number(quickTasbeeh[item.key] ?? 0), target),
    0
  );
  const totalTarget = TASBEEHAT.length * target;
  const allPercent = pct(totalDone, totalTarget);

  function handleReset() {
    if (tallyMode) {
      setTallyCount(0);
      toast.success("تم تصفير العداد الحر");
      return;
    }
    resetQuickTasbeeh(selected);
    toast.success("تم تصفير الذكر الحالي");
  }

  function saveCustomDhikr() {
    const phrase = customPhraseInput.trim();
    const t = Math.max(1, Math.min(10000, Number(customTargetInput) || 100));
    const color = isValidHexColor(customColorInput) ? customColorInput : CUSTOM_DHIKR_COLORS[0]!.hex;
    const translit = customTranslitInput.trim() || undefined;
    if (!phrase) { toast.error("أدخل نص الذكر"); return; }
    if (editingCustomId) {
      updateSebhaCustomItem(editingCustomId, { phrase, target: t, color, transliteration: translit });
      setSebhaCustom({ phrase, target: t });
      toast.success("تم تحديث الذكر");
    } else {
      const id = addSebhaCustomItem({ phrase, target: t, color, transliteration: translit });
      setSebhaCustom({ phrase, target: t });
      setSelected("custom");
      toast.success("تم حفظ الذكر المخصص");
      void id;
    }
    setShowCustomForm(false);
    setEditingCustomId(null);
  }

  function openEditCustom(item: CustomDhikr) {
    setCustomPhraseInput(item.phrase);
    setCustomTargetInput(String(item.target));
    setCustomColorInput(item.color);
    setCustomTranslitInput(item.transliteration ?? "");
    setEditingCustomId(item.id);
    setShowCustomForm(true);
  }

  function openNewCustom() {
    setCustomPhraseInput("");
    setCustomTargetInput("100");
    setCustomColorInput(suggestColorForPhrase(""));
    setCustomTranslitInput("");
    setEditingCustomId(null);
    setShowCustomForm(true);
  }

  function pickCustomItem(item: CustomDhikr) {
    setSebhaCustom({ phrase: item.phrase, target: item.target });
    setSelected("custom");
    toast.success(`تم اختيار: ${item.phrase}`);
  }

  return (
    <div className="space-y-3 page-enter">
      {/* Tabs — kept simple: only "ذكر" and "أسماء" per user request. */}
      <div className="flex items-center gap-1 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-1" role="tablist" aria-label="أقسام السبحة">
        {[
          { id: "dhikr", label: "ذكر", icon: Sparkles },
          { id: "asma", label: "أسماء", icon: ActivityIcon },
        ].map((t) => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              activeTab === t.id ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--muted)] hover:bg-[var(--card-2)]"
            )}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

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
                {<Badge>{totalDone}/{totalTarget}</Badge>}
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
          <div className="shrink-0 flex flex-col items-end gap-2">
            {/* وضع حر — free counting chip. Toggles to "no target" counting mode. */}
            <button type="button"
              aria-label="تفعيل وضع العدّ الحر"
              aria-pressed={tallyMode}
              onClick={() => setTallyMode((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition",
                tallyMode
                  ? "bg-accent-20 border-accent-50 text-[var(--accent)] shadow-[0_0_18px_-2px_rgba(125,211,252,0.45)]"
                  : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-2)]"
              )}>
              <Timer size={11} aria-hidden="true" />
              {tallyMode ? "وضع حر مُفعّل" : "وضع حر"}
            </button>
            {/* S3 - Sessions history toggle + global reset */}
            <div className="flex items-center gap-2">
            <IconButton
              aria-label="سجل الجلسات"
              aria-expanded={showHistory}
              aria-controls="sebha-history-panel"
              onClick={() => setShowHistory((v) => !v)}
              className={cn(showHistory && "text-[var(--accent)]")}
            >
              <History size={17} aria-hidden="true" />
            </IconButton>
            {confirmReset ? (
              <>
                <Button size="sm" variant="danger" onClick={() => {
                  resetAllQuickTasbeeh();
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
        </div>
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
      </Card>

      {/* S3 - Sessions history panel */}
      {showHistory && (
        <Card id="sebha-history-panel" className="p-4">
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
                      try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); }
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
                      ? <ActivityIcon size={12} aria-hidden="true" className="text-[var(--accent)] shrink-0" />
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
            {/* Target selector (hidden in custom mode) */}
            {selected !== "custom" && (
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

        {/* S4 - Circular ring counter (single tap only) */}
        <div
          data-sebha-counter
        >
          <CircularRing percent={percent} completed={completed} onClick={increment} accent={selected === "custom" ? undefined : current.accent}>
            <div className="text-center">
              {prefs.tasbeehMascotEnabled !== false && (
                <div className="relative w-11 h-11 mx-auto mb-1">
                  <DhikrMascot mascot={mascotForPhrase(current.short)} accent={current.accent} />
                </div>
              )}
              <div className="text-xs opacity-55 mb-2">{current.short}</div>
              <CounterNumber value={count} />
              {tallyMode ? (
                <div className="mt-2 text-xs opacity-60">وضع حر — بلا هدف</div>
              ) : (
                <div className="mt-2 text-xs opacity-60">من {effectiveTarget}</div>
              )}
            </div>
          </CircularRing>
        </div>

        {/* Status line */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm opacity-75">
          {tallyMode ? (
            <><Timer size={17} aria-hidden="true" className="text-[var(--accent)]" />عدّ حر — بدون هدف</>
          ) : completed ? (
            <><CheckCircle2 size={17} aria-hidden="true" className="text-[var(--ok)]" />تم الهدف</>
          ) : (
            <><Target size={17} aria-hidden="true" className="text-[var(--accent)]" />{remaining} متبقي</>
          )}
        </div>

        {/* Share-on-completion */}
        {completed && (
          <button type="button"
            onClick={async () => {
              const label = current.short || "السبحة";
              const text = `${label} × ${effectiveTarget}\n\n﴿ فَاذْكُرُونِي أَذْكُرْكُمْ ﴾\n\n— أثر`;
              try {
                if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
                else { await navigator.clipboard.writeText(text); toast.success("تم نسخ الذكر"); }
              } catch { /* ignore */ }
            }}
            className="mt-3 mx-auto flex items-center gap-1.5 rounded-2xl border border-accent-35 bg-accent-15 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition active:scale-95"
            aria-label="مشاركة اكتمال الذكر"
          >
            <Share2 size={13} aria-hidden="true" />
            مشاركة الإنجاز
          </button>
        )}

        {/* Today's count line */}
        <TodayLine tasbeehDailyLog={tasbeehDailyLog} />
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
                  style={{ width: `${itemPercent}%`, background: itemPercent >= 100 ? "var(--ok)" : (item.accent ?? "var(--accent)") }}
                />
              </div>
            </button>
          );
        })}

        {/* S2 - Custom dhikr card */}
        {sebhaCustom ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelected("custom")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected("custom"); } }}
            aria-pressed={selected === "custom"}
            className={cn(
              "glass rounded-3xl p-4 text-right border transition active:scale-[.98] cursor-pointer",
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
                  onClick={(e) => { e.stopPropagation(); openNewCustom(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openNewCustom(); } }}
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
          </div>
        ) : (
          <button type="button"
            onClick={openNewCustom}
            className="glass rounded-3xl p-4 text-center border border-dashed border-[var(--stroke)] hover:bg-[var(--card)] transition active:scale-[.98] flex flex-col items-center justify-center gap-2 min-h-[100px]"
          >
            <Plus size={20} aria-hidden="true" className="opacity-40" />
            <span className="text-xs opacity-50">إضافة ذكر مخصص</span>
          </button>
        )}
      </div>

      {/* NEW: custom dhikr library (CRUD + reorder) */}
      {sebhaCustomList.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookHeart size={14} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold">أذكاري المخصصة</span>
            <Badge>{sebhaCustomList.length}</Badge>
          </div>
          <div className="space-y-2">
            {sebhaCustomList.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2">
                <div className="w-2 h-8 rounded-full shrink-0" style={{ background: item.color }} aria-hidden="true" />
                <button type="button" onClick={() => pickCustomItem(item)} className="flex-1 text-right min-w-0">
                  <div className="arabic-text text-sm font-semibold truncate">{item.phrase}</div>
                  {item.transliteration && <div className="text-[10px] opacity-50 truncate">{item.transliteration}</div>}
                  <div className="text-[10px] opacity-55">هدف {item.target}</div>
                </button>
                <button type="button" onClick={() => reorderSebhaCustomList(item.id, "up")} disabled={idx === 0}
                  className="p-1 opacity-50 hover:opacity-90 disabled:opacity-20" aria-label="نقل للأعلى">
                  <MoveUp size={12} />
                </button>
                <button type="button" onClick={() => reorderSebhaCustomList(item.id, "down")} disabled={idx === sebhaCustomList.length - 1}
                  className="p-1 opacity-50 hover:opacity-90 disabled:opacity-20" aria-label="نقل للأسفل">
                  <MoveDown size={12} />
                </button>
                <button type="button" onClick={() => openEditCustom(item)} className="p-1 opacity-50 hover:opacity-90" aria-label="تعديل">
                  <Pencil size={12} />
                </button>
                <button type="button" onClick={() => { deleteSebhaCustomItem(item.id); toast.success("تم حذف الذكر"); }}
                  className="p-1 opacity-50 hover:opacity-90 hover:text-red-400" aria-label="حذف">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={openNewCustom}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--stroke)] px-3 py-2 text-[11px] opacity-60 hover:opacity-90 transition">
            <Plus size={11} /> إضافة ذكر جديد
          </button>
        </Card>
      )}

      {/* S2 - Custom dhikr form */}
      {showCustomForm && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pencil size={15} aria-hidden="true" className="text-[var(--accent)]" />
            <span className="text-sm font-semibold">{editingCustomId ? "تعديل ذكر" : "ذكر مخصص جديد"}</span>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="custom-phrase" className="text-xs opacity-60 mb-1 block">نص الذكر</label>
              <input
                id="custom-phrase"
                type="text"
                dir="rtl"
                value={customPhraseInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomPhraseInput(v);
                  if (!editingCustomId && !customColorInput) setCustomColorInput(suggestColorForPhrase(v));
                }}
                placeholder="مثال: صلِّ على النبي"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-sm outline-none focus:border-accent-50 transition"
              />
            </div>
            <div>
              <label htmlFor="custom-translit" className="text-xs opacity-60 mb-1 block">نص لاتيني (اختياري)</label>
              <input
                id="custom-translit"
                type="text"
                value={customTranslitInput}
                onChange={(e) => setCustomTranslitInput(e.target.value)}
                placeholder="mثال: Subhan Allah"
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
            <div>
              <span className="text-xs opacity-60 mb-1 block">لون التمييز</span>
              <div className="flex items-center gap-2 flex-wrap">
                {CUSTOM_DHIKR_COLORS.map((c) => (
                  <button key={c.hex} type="button"
                    onClick={() => setCustomColorInput(c.hex)}
                    aria-label={c.name}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition",
                      customColorInput === c.hex ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCustomDhikr} className="flex-1">{editingCustomId ? "تحديث" : "حفظ"}</Button>
              <Button variant="secondary" onClick={() => { setShowCustomForm(false); setEditingCustomId(null); }} className="flex-1">إلغاء</Button>
              {editingCustomId && (
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteSebhaCustomItem(editingCustomId);
                    if (selected === "custom") setSelected("subhanallah");
                    setShowCustomForm(false);
                    setEditingCustomId(null);
                    toast.success("تم حذف الذكر");
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

      {/* NEW: Streak / Goal / History sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {prefs.tasbeehStreakEnabled !== false && (
          <StreakCard streak={tasbeehStreak} best={tasbeehStreakBest} lastActive={tasbeehLastActiveDate} />
        )}
        <DailyGoalCard
          goal={tasbeehDailyGoal}
          today={Object.values(tasbeehDailyLog[getLocalDateKey()] ?? {}).reduce((s, v) => s + (Number(v) || 0), 0)}
          celebratedDate={tasbeehGoalCelebratedDate}
          onChangeGoal={(n) => setTasbeehDailyGoal(n)}
          onShare={shareStats}
        />
        <HistoryChart log={tasbeehDailyLog} />
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">مشاركة إحصائياتك</span>
            <button type="button" onClick={shareStats}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-[11px] font-semibold hover:bg-[var(--card-2)] transition">
              <Share2 size={12} /> مشاركة الآن
            </button>
          </div>
        </Card>
      </div>

      {/* Mascot animations — always on now that long-press is gone */}
      <style>{`
        [data-sebha-counter] { user-select: none; }
        .mascot-anim { animation: sebha-mascot 3s ease-in-out infinite; transform-origin: 22px 22px; }
        .mascot-spin-slow { animation: sebha-spin 12s linear infinite; transform-origin: 22px 22px; }
        @keyframes sebha-mascot { 0%,100%{transform:scale(1);opacity:.85} 50%{transform:scale(1.08);opacity:1} }
        @keyframes sebha-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Quick-set counter removed — single tap only, no double-click menu. */}

      {/* ─── Dua tab removed per user — only "ذكر" + "أسماء" tabs remain. ─── */}

      {/* ─── Asma Al-Husna tab ─── */}
      {activeTab === "asma" && (
        <AsmaHusnaCounter
          counts={asmaHusnaCounts}
          onCount={(id, target) => {
            const next = incAsmaHusnaCount(id, target);
            doHaptic(next, target, prefs.enableHaptics, prefs.hapticStrength);
            recordTasbeehActivity(getLocalDateKey());
            return next;
          }}
        />
      )}
    </div>
  );
}

// ─── Asma Al-Husna grid (99 names counter) ──────────────────────────────────

function AsmaHusnaCounter({
  counts,
  onCount,
}: {
  counts: Record<number, number>;
  onCount: (id: number, target: number) => number;
}) {
  const [target, setTarget] = React.useState(100);
  const [query, setQuery] = React.useState("");
  // Real Asma ul Husna data is sourced from /data/asmaAlHusna.ts. The Sebha
  // version uses the same canonical 99 names — not numeric placeholders.
  const names = React.useMemo(
    () => ASMA_AL_HUSNA.map((n) => ({ id: n.id, arabic: n.arabic, transliteration: n.transliteration, meaning: n.meaning })),
    []
  );
  const filtered = React.useMemo(() => {
    if (!query.trim()) return names;
    const q = query.trim().toLowerCase();
    return names.filter(
      (n) =>
        String(n.id).includes(q) ||
        n.arabic.includes(q) ||
        (n.transliteration ?? "").toLowerCase().includes(q) ||
        (n.meaning ?? "").toLowerCase().includes(q)
    );
  }, [names, query]);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <ActivityIcon size={14} className="text-[var(--accent)]" />
        <span className="text-sm font-semibold">أسماء الله الحسنى</span>
        <span className="text-[10px] opacity-50">انقر للعدّ على كل اسم</span>
        <div className="ms-auto flex items-center gap-1 rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-0.5">
          {[33, 100, 1000].map((t) => (
            <button key={t} type="button"
              onClick={() => setTarget(t)}
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] font-semibold transition",
                target === t ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--muted)] hover:bg-[var(--card-2)]"
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث باسم أو معنى…"
        className="w-full rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-xs outline-none mb-3"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto" role="list">
        {filtered.map((n) => {
          const count = Number(counts[n.id] ?? 0);
          const pctDone = Math.min(100, Math.round((count / target) * 100));
          const done = count >= target;
          return (
            <button key={n.id} type="button"
              onClick={() => onCount(n.id, target)}
              className={cn(
                "glass rounded-2xl p-3 text-right border transition active:scale-[.98]",
                done ? "border-[var(--ok)]" : "border-[var(--stroke)] hover:bg-[var(--card-2)]"
              )}
              aria-label={`${n.arabic} — ${n.meaning ?? ""} (${count} من ${target})`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold opacity-60 tabular-nums">{toArabicNumeral(n.id)}</span>
                <Badge>{count}/{target}</Badge>
              </div>
              <div className="arabic-text text-base font-bold leading-7 mt-1 truncate" title={n.meaning}>{n.arabic}</div>
              <div className="text-[10px] opacity-55 truncate" title={n.meaning}>{n.meaning}</div>
              <div className="mt-2 h-1 rounded-full bg-[var(--card-2)] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pctDone}%`, background: pctDone >= 100 ? "var(--ok)" : "var(--accent)" }} />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
