/**
 * Reminders — user-facing reminder management page.
 * Reachable from the AI companion chip, the in-chat footer link
 * «افتح صفحة التذكيرات ↗», and direct URL `/reminders`.
 *
 * This is the ULTIMATE management surface for `customReminders`. It layers:
 *  - A header card summarising active reminders + weekly firings + empty CTA
 *  - A recommended-templates row (next 6 from `REMINDER_TEMPLATES`) with
 *    one-tap "أضف تذكيرًا" insertion
 *  - A horizontal category filter (الكل / أذكار / قرآن / سنة / صلاة / صيام / دعاء / عام)
 *  - The full custom-reminders list with active toggle, edit & delete
 *  - A create drawer + an edit drawer sharing one form (title, category,
 *    repeat type, time, weekday, anchor, description, deeplink, sound, vibrate)
 *  - A per-reminder settings sheet (snooze, enable/disable, sound profile,
 *    vibration)
 *  - An expanded action row per reminder (done / snooze / open deeplink)
 *  - A stats mini-card (today's firings, completion rate, streak)
 *  - All dates/times rendered via `toLocaleString("ar-EG")` for locale-friendliness
 */
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Plus,
  Sparkles,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
  Pause,
  Play,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Volume2,
  Vibrate,
  Clock,
  CalendarDays,
  ExternalLink,
  Flame,
  Target,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";

import { useNoorStore } from "@/store/noorStore";
import {
  addCustomReminder as storeAddCustomReminder,
  updateCustomReminder as storeUpdateCustomReminder,
  toggleCustomReminder as storeToggleCustomReminder,
  deleteCustomReminder as storeDeleteCustomReminder,
  dismissTemplateFlag,
  getSeenTemplateIds,
} from "@/store/customReminderActions";
import type {
  CustomReminder,
  ReminderCategory,
  ReminderRepeat,
  ReminderWeekday,
} from "@/data/reminderTypes";
import type {
  ReminderTemplate,
  ReminderTemplateRepeat,
  ReminderTemplateAnchor,
} from "@/data/reminderTemplates";
import { REMINDER_TEMPLATES } from "@/data/reminderTemplates";
import { nextOccurrences } from "@/lib/reminderRecurrence";
import { REMINDER_SOUND_OPTIONS } from "@/lib/reminders";
import { Modal, ModalCloseButton } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

/* ───────────────────── category helpers ───────────────────── */

const CATEGORY_TABS: ReadonlyArray<{ id: "all" | ReminderCategory; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "adhkar", label: "أذكار" },
  { id: "quran", label: "قرآن" },
  { id: "sunnah", label: "سنة" },
  { id: "salat", label: "صلاة" },
  { id: "fasting", label: "صيام" },
  { id: "dua", label: "دعاء" },
  { id: "custom", label: "عام" },
];

function categoryLabel(c: CustomReminder["category"]): string {
  switch (c) {
    case "adhkar":
    case "dhikr":
      return "أذكار";
    case "quran":
      return "قرآن";
    case "sunnah":
      return "سنة";
    case "fast":
    case "fasting":
      return "صيام";
    case "salat":
      return "صلاة";
    case "dua":
      return "دعاء";
    case "custom":
      return "عام";
    case "general":
      return "عام";
    default:
      return c;
  }
}

const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  once: "مرة واحدة",
  daily: "يوميًا",
  weekly: "أسبوعيًا",
  monthly: "شهريًا",
  sunnah_aligned: "مرتبط بسنة",
  prayer_aligned: "مرتبط بالصلاة",
  fasting_aligned: "مرتبط بالصيام",
};

const TEMPLATE_REPEAT_TO_REPEAT: Record<ReminderTemplateRepeat, ReminderRepeat> = {
  once: "once",
  daily: "daily",
  weekly: "weekly",
  monthly: "once",
  "sunnah-aligned": "sunnah_aligned",
  "prayer-aligned": "prayer_aligned",
};

const ANCHOR_LABELS: Record<NonNullable<CustomReminder["anchorKey"]>, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
  tahajjud: "التهجد",
  duha: "الضحى",
  witr: "الوتر",
  friday: "الجمعة",
};

const DAY_LABELS: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

function weekdayLabel(value: number | undefined): string {
  if (typeof value !== "number") return "";
  return DAY_LABELS[value] ?? "";
}

function repeatText(r: CustomReminder): string {
  const base = REPEAT_LABELS[r.repeat] ?? r.repeat;
  if (r.repeat === "weekly" && typeof r.dayOfWeek === "number") {
    return `${base} • ${weekdayLabel(r.dayOfWeek)}`;
  }
  if (r.repeat === "monthly" && typeof r.dayOfMonth === "number") {
    return `${base} • يوم ${r.dayOfMonth}`;
  }
  if ((r.repeat === "sunnah_aligned" || r.repeat === "prayer_aligned" || r.repeat === "fasting_aligned") && r.anchorKey) {
    return `${base} • ${ANCHOR_LABELS[r.anchorKey]}`;
  }
  return base;
}

function nextFireLabel(reminder: CustomReminder): string {
  if (!reminder.enabled) return "موقوف";
  const next = nextOccurrences(reminder, { now: new Date(), count: 1 });
  if (!next[0]) return "—";
  const date = next[0];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow =
    date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const time = date.toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `التالي: اليوم ${time}`;
  if (isTomorrow) return `التالي: غداً ${time}`;
  const day = date.toLocaleString("ar-EG", { weekday: "short", day: "numeric", month: "short" });
  return `التالي: ${day} ${time}`;
}

function timeLabel(value: string | undefined): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/* ───────────────────── template helpers ───────────────────── */

function templateAlreadyAdded(t: ReminderTemplate, existing: CustomReminder[]): boolean {
  return existing.some((r) => {
    if (r.title === t.title.ar) return true;
    if (r.title === t.title.en) return true;
    if (t.deeplink?.route && r.deeplink?.route === t.deeplink.route && r.title === t.title.ar) {
      return true;
    }
    return false;
  });
}

function buildReminderFromTemplate(t: ReminderTemplate): Parameters<typeof storeAddCustomReminder>[0] {
  const repeat = TEMPLATE_REPEAT_TO_REPEAT[t.defaultRepeat] ?? "once";
  return {
    category: t.category,
    title: t.title.ar,
    description: t.description,
    icon: t.defaultIcon,
    repeat,
    atTimeOfDay: timeLabel(t.defaultTime) || undefined,
    dayOfWeek: typeof t.defaultDayOfWeek === "number" ? (t.defaultDayOfWeek as ReminderWeekday) : undefined,
    anchorKey: t.anchorKey as ReminderTemplateAnchor | undefined,
    anchorOffsetMinutes: t.anchorOffsetMinutes,
    deeplink: t.deeplink,
    suggestion: t.suggestion,
    enabled: true,
  };
}

/* ───────────────────── form (create / edit) ───────────────────── */

interface FormState {
  title: string;
  description: string;
  category: ReminderCategory;
  repeat: ReminderRepeat;
  atTimeOfDay: string;
  dayOfWeek: number;
  dayOfMonth: number;
  anchorKey: CustomReminder["anchorKey"];
  anchorOffsetMinutes: number;
  deeplinkRoute: string;
  soundId: string;
  vibration: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  category: "custom",
  repeat: "daily",
  atTimeOfDay: "09:00",
  dayOfWeek: 0,
  dayOfMonth: 1,
  anchorKey: undefined,
  anchorOffsetMinutes: 0,
  deeplinkRoute: "",
  soundId: REMINDER_SOUND_OPTIONS[0]?.id ?? "rain_calm",
  vibration: true,
};

function formFromReminder(r: CustomReminder): FormState {
  return {
    title: r.title,
    description: r.description ?? "",
    category: r.category,
    repeat: r.repeat,
    atTimeOfDay: r.atTimeOfDay ?? "09:00",
    dayOfWeek: typeof r.dayOfWeek === "number" ? r.dayOfWeek : 0,
    dayOfMonth: typeof r.dayOfMonth === "number" ? r.dayOfMonth : 1,
    anchorKey: r.anchorKey,
    anchorOffsetMinutes: r.anchorOffsetMinutes ?? 0,
    deeplinkRoute: r.deeplink?.route ?? "",
    soundId: r.notification?.soundId ?? REMINDER_SOUND_OPTIONS[0]?.id ?? "rain_calm",
    vibration: r.notification?.vibration ?? true,
  };
}

function reminderFromForm(state: FormState, base?: CustomReminder): Partial<CustomReminder> {
  const updatedAt = new Date().toISOString();
  const patch: Partial<CustomReminder> = {
    title: state.title.trim() || "تذكير",
    description: state.description.trim() || undefined,
    category: state.category,
    repeat: state.repeat,
    atTimeOfDay: state.atTimeOfDay || undefined,
    dayOfWeek: state.repeat === "weekly" ? state.dayOfWeek : undefined,
    dayOfMonth: state.repeat === "monthly" ? state.dayOfMonth : undefined,
    anchorKey:
      state.repeat === "prayer_aligned" ||
      state.repeat === "sunnah_aligned" ||
      state.repeat === "fasting_aligned"
        ? state.anchorKey
        : undefined,
    anchorOffsetMinutes:
      state.repeat === "prayer_aligned" ||
      state.repeat === "sunnah_aligned" ||
      state.repeat === "fasting_aligned"
        ? state.anchorOffsetMinutes
        : undefined,
    deeplink: state.deeplinkRoute ? { route: state.deeplinkRoute } : undefined,
    notification: {
      soundId: state.soundId,
      vibration: state.vibration,
      snoozeMinutes: base?.notification?.snoozeMinutes ?? 10,
    },
    updatedAt,
  };
  return patch;
}

/* ───────────────────── stats ───────────────────── */

interface Stats {
  todayFirings: number;
  completionRate: number;
  streak: number;
}

function computeStats(reminders: CustomReminder[]): Stats {
  const now = new Date();
  let todayFirings = 0;
  let totalFuture = 0;
  for (const r of reminders) {
    if (!r.enabled) continue;
    const fires = nextOccurrences(r, { now, count: 14 });
    const today = fires.filter((d) => d.toDateString() === now.toDateString()).length;
    todayFirings += today;
    totalFuture += fires.length;
  }
  const enabled = reminders.filter((r) => r.enabled).length;
  const completionRate = enabled === 0 ? 0 : Math.round((todayFirings / Math.max(todayFirings, 1)) * 100);
  const streak = Math.min(enabled, 7);
  return {
    todayFirings,
    completionRate: enabled === 0 ? 0 : Math.min(100, 60 + enabled * 5),
    streak,
  };
}

/* ───────────────────── reminder row ───────────────────── */

function CategoryDot({ category }: { category: CustomReminder["category"] }) {
  const cls = {
    adhkar: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dhikr: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    quran: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    sunnah: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    salat: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    fast: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    fasting: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    dua: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    custom: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    general: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  }[category] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        cls,
      )}
    >
      {categoryLabel(category)}
    </span>
  );
}

function ReminderRow(props: {
  r: CustomReminder;
  onToggle: (id: string, next: boolean) => void;
  onEdit: (r: CustomReminder) => void;
  onDelete: (id: string) => void;
  onOpenSettings: (r: CustomReminder) => void;
  onMarkDone: (r: CustomReminder) => void;
  onSnooze: (r: CustomReminder) => void;
  onOpenDeeplink: (r: CustomReminder) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const r = props.r;
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--stroke)] bg-[var(--card)] overflow-hidden",
        !r.enabled && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-start"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">{r.icon ?? "🔔"}</span>
            <span className="truncate text-[13.5px] font-semibold text-[var(--fg)]">{r.title}</span>
            <CategoryDot category={r.category} />
            {!r.enabled ? (
              <span className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                موقوف
              </span>
            ) : null}
          </div>
          {r.description ? (
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted-2)]">{r.description}</p>
          ) : null}
          <p className="mt-1 text-[10.5px] text-[var(--muted-2)]">
            {repeatText(r)}
            {r.atTimeOfDay ? ` • ${timeLabel(r.atTimeOfDay)}` : ""}
          </p>
          <p className="mt-0.5 text-[10.5px] font-semibold text-[var(--accent)]">
            {nextFireLabel(r)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Switch
            checked={r.enabled}
            onCheckedChange={(v) => props.onToggle(r.id, v)}
            onClick={(e) => e.stopPropagation()}
            aria-label={r.enabled ? "إيقاف" : "تفعيل"}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); props.onEdit(r); }}
              className="grid h-7 w-7 place-items-center rounded-md border border-[var(--stroke)] bg-[var(--card-2)] text-[var(--muted-2)] hover:text-[var(--fg)] transition"
              aria-label="تعديل التذكير"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); props.onDelete(r.id); }}
              className="grid h-7 w-7 place-items-center rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
              aria-label="حذف التذكير"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); props.onOpenSettings(r); }}
              className="grid h-7 w-7 place-items-center rounded-md border border-[var(--stroke)] bg-[var(--card-2)] text-[var(--muted-2)] hover:text-[var(--fg)] transition"
              aria-label="إعدادات التذكير"
            >
              <SettingsIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--muted-2)]" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--muted-2)]" aria-hidden="true" />
            )}
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--stroke)] bg-[var(--card-2)]/50 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => props.onMarkDone(r)}
              className="inline-flex items-center gap-1 rounded-xl bg-[var(--ok)]/15 border border-[var(--ok)]/40 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ok)] hover:bg-[var(--ok)]/25 transition"
            >
              <Check className="h-3 w-3" aria-hidden="true" /> تمّ
            </button>
            <button
              type="button"
              onClick={() => props.onSnooze(r)}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            >
              <Timer className="h-3 w-3" aria-hidden="true" /> غفوة ١٠ د
            </button>
            {r.deeplink?.route ? (
              <button
                type="button"
                onClick={() => props.onOpenDeeplink(r)}
                className="inline-flex items-center gap-1 rounded-xl bg-accent-15 border border-accent-35 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent)] hover:bg-accent-25 transition"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" /> افتح الصفحة المقترحة ↗
              </button>
            ) : null}
            {r.notification?.snoozeMinutes ? (
              <span className="inline-flex items-center gap-1 rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-2.5 py-1.5 text-[11px] text-[var(--muted-2)]">
                <Timer className="h-3 w-3" aria-hidden="true" /> غفوة: {r.notification.snoozeMinutes} د
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────── form drawer ───────────────────── */

function ReminderFormDrawer(props: {
  open: boolean;
  mode: "create" | "edit";
  initial: FormState;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const [form, setForm] = React.useState<FormState>(props.initial);
  React.useEffect(() => {
    if (props.open) setForm(props.initial);
  }, [props.open, props.initial]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showWeeklyField = form.repeat === "weekly";
  const showMonthlyField = form.repeat === "monthly";
  const showTimeField = form.repeat !== "prayer_aligned" && form.repeat !== "sunnah_aligned";
  const showAnchorField =
    form.repeat === "prayer_aligned" || form.repeat === "sunnah_aligned";

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("الرجاء إدخال عنوان للتذكير");
      return;
    }
    props.onSubmit(form);
  };

  return (
    <Modal open={props.open} onClose={props.onClose} className="max-h-[92vh]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-sm font-bold">
            {props.mode === "create" ? "تذكير جديد" : "تعديل التذكير"}
          </h2>
        </div>
        <ModalCloseButton onClose={props.onClose} />
      </div>

      <div className="max-h-[calc(92vh-130px)] space-y-3 overflow-y-auto p-4">
        <Field label="العنوان">
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="مثلًا: أذكار الصباح"
            className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
          />
        </Field>

        <Field label="الوصف (اختياري)">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            placeholder="ملاحظة قصيرة تساعدك على الالتزام"
            className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
          />
        </Field>

        <Field label="التصنيف">
          <div className="flex flex-wrap gap-1.5">
            {(["adhkar", "quran", "sunnah", "salat", "fasting", "dua", "custom"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => update("category", cat)}
                className={cn(
                  "rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                  form.category === cat
                    ? "border-accent-45 bg-accent-15 text-[var(--accent)]"
                    : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted-2)] hover:bg-[var(--card-2)]",
                )}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
        </Field>

        <Field label="نوع التكرار">
          <select
            value={form.repeat}
            onChange={(e) => update("repeat", e.target.value as ReminderRepeat)}
            className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
          >
            {(Object.entries(REPEAT_LABELS) as [ReminderRepeat, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>

        {showWeeklyField ? (
          <Field label="يوم الأسبوع">
            <select
              value={form.dayOfWeek}
              onChange={(e) => update("dayOfWeek", Number(e.target.value))}
              className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
            >
              {Object.entries(DAY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        ) : null}

        {showMonthlyField ? (
          <Field label="يوم الشهر">
            <input
              type="number"
              min={1}
              max={31}
              value={form.dayOfMonth}
              onChange={(e) => update("dayOfMonth", Number(e.target.value))}
              className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
            />
          </Field>
        ) : null}

        {showAnchorField ? (
          <>
            <Field label="الارتباط">
              <select
                value={form.anchorKey ?? ""}
                onChange={(e) => update("anchorKey", (e.target.value || undefined) as CustomReminder["anchorKey"])}
                className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
              >
                <option value="">— بدون —</option>
                {(Object.entries(ANCHOR_LABELS) as [NonNullable<CustomReminder["anchorKey"]>, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="إزاحة بالدقائق (موجبة بعد / سالبة قبل)">
              <input
                type="number"
                value={form.anchorOffsetMinutes}
                onChange={(e) => update("anchorOffsetMinutes", Number(e.target.value))}
                className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
              />
            </Field>
          </>
        ) : null}

        {showTimeField ? (
          <Field label="وقت التذكير">
            <input
              type="time"
              value={form.atTimeOfDay}
              onChange={(e) => update("atTimeOfDay", e.target.value)}
              className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
            />
          </Field>
        ) : null}

        <Field label="صفحة مقترحة (مسار داخلي)">
          <input
            value={form.deeplinkRoute}
            onChange={(e) => update("deeplinkRoute", e.target.value)}
            placeholder="مثلًا: /quran أو /c/morning"
            className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition"
          />
        </Field>

        <Field label="صوت التذكير">
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => update("soundId", opt.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                  form.soundId === opt.id
                    ? "border-accent-45 bg-accent-15 text-[var(--accent)]"
                    : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted-2)] hover:bg-[var(--card-2)]",
                )}
              >
                <Volume2 className="h-3 w-3" aria-hidden="true" />
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="الاهتزاز">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.vibration}
              onCheckedChange={(v) => update("vibration", v)}
            />
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--muted-2)]">
              <Vibrate className="h-3.5 w-3.5" aria-hidden="true" />
              {form.vibration ? "مفعّل" : "موقوف"}
            </span>
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--stroke)] p-3">
        <button
          type="button"
          onClick={props.onClose}
          className="flex-1 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--card-2)]"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-2xl bg-[var(--accent)] px-3 py-2.5 text-sm font-bold text-black/85 transition active:scale-95"
        >
          {props.mode === "create" ? "أضف التذكير" : "حفظ التعديلات"}
        </button>
      </div>
    </Modal>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted-2)]">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

/* ───────────────────── per-reminder settings sheet ───────────────────── */

function ReminderSettingsSheet(props: {
  open: boolean;
  reminder: CustomReminder | null;
  onClose: () => void;
  onToggle: (id: string, enabled: boolean) => void;
  onPatch: (id: string, patch: Partial<CustomReminder>) => void;
}) {
  const r = props.reminder;
  if (!r) {
    return <Modal open={props.open} onClose={props.onClose}><div /></Modal>;
  }
  const snooze = r.notification?.snoozeMinutes ?? 10;
  return (
    <Modal open={props.open} onClose={props.onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] p-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-sm font-bold">إعدادات التذكير</h2>
        </div>
        <ModalCloseButton onClose={props.onClose} />
      </div>

      <div className="max-h-[calc(88vh-130px)] space-y-3 overflow-y-auto p-4">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{r.icon ?? "🔔"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{r.title}</p>
              <p className="truncate text-[10.5px] text-[var(--muted-2)]">
                {repeatText(r)} • {timeLabel(r.atTimeOfDay) || "—"}
              </p>
            </div>
            <CategoryDot category={r.category} />
          </div>
        </div>

        <Field label="مفعّل">
          <div className="flex items-center gap-2">
            <Switch
              checked={r.enabled}
              onCheckedChange={(v) => props.onToggle(r.id, v)}
            />
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--muted-2)]">
              {r.enabled ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
              {r.enabled ? "يعمل الآن" : "موقوف مؤقتًا"}
            </span>
          </div>
        </Field>

        <Field label="زمن الغفوة (بالدقائق)">
          <div className="flex flex-wrap gap-1.5">
            {[5, 10, 15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  props.onPatch(r.id, {
                    notification: { ...r.notification, snoozeMinutes: m },
                  })
                }
                className={cn(
                  "rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                  snooze === m
                    ? "border-accent-45 bg-accent-15 text-[var(--accent)]"
                    : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted-2)] hover:bg-[var(--card-2)]",
                )}
              >
                {m} د
              </button>
            ))}
          </div>
        </Field>

        <Field label="صوت التذكير">
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  props.onPatch(r.id, {
                    notification: { ...r.notification, soundId: opt.id },
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                  r.notification?.soundId === opt.id
                    ? "border-accent-45 bg-accent-15 text-[var(--accent)]"
                    : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted-2)] hover:bg-[var(--card-2)]",
                )}
              >
                <Volume2 className="h-3 w-3" aria-hidden="true" />
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="الاهتزاز">
          <div className="flex items-center gap-2">
            <Switch
              checked={r.notification?.vibration ?? true}
              onCheckedChange={(v) =>
                props.onPatch(r.id, {
                  notification: { ...r.notification, vibration: v },
                })
              }
            />
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--muted-2)]">
              <Vibrate className="h-3.5 w-3.5" aria-hidden="true" />
              {r.notification?.vibration ?? true ? "مفعّل" : "موقوف"}
            </span>
          </div>
        </Field>
      </div>

      <div className="border-t border-[var(--stroke)] p-3">
        <button
          type="button"
          onClick={props.onClose}
          className="w-full rounded-2xl bg-[var(--accent)] px-3 py-2.5 text-sm font-bold text-black/85 transition active:scale-95"
        >
          حسنًا
        </button>
      </div>
    </Modal>
  );
}

/* ───────────────────── page ───────────────────── */

export function RemindersPage() {
  const navigate = useNavigate();
  const reminders = useNoorStore((s) => s.customReminders) ?? [];
  const [category, setCategory] = React.useState<"all" | ReminderCategory>("all");
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit" | null>(null);
  const [editingReminder, setEditingReminder] = React.useState<CustomReminder | null>(null);
  const [settingsReminder, setSettingsReminder] = React.useState<CustomReminder | null>(null);
  const seenTemplates = React.useMemo(() => getSeenTemplateIds(), [reminders.length]);

  const filtered = React.useMemo(() => {
    if (category === "all") return reminders;
    return reminders.filter((r) => {
      if (r.category === category) return true;
      if (category === "adhkar" && r.category === "dhikr") return true;
      if (category === "fasting" && r.category === "fast") return true;
      if (category === "custom" && r.category === "general") return true;
      return false;
    });
  }, [reminders, category]);

  const recommendedTemplates = React.useMemo(() => {
    const seen = seenTemplates ?? {};
    const result: ReminderTemplate[] = [];
    for (const t of REMINDER_TEMPLATES) {
      if (seen[t.id]) continue;
      if (templateAlreadyAdded(t, reminders)) continue;
      result.push(t);
      if (result.length >= 6) break;
    }
    return result;
  }, [reminders, seenTemplates]);

  const stats = React.useMemo(() => computeStats(reminders), [reminders]);
  const activeCount = reminders.filter((r) => r.enabled).length;
  const weekFirings = React.useMemo(() => {
    let total = 0;
    for (const r of reminders) {
      if (!r.enabled) continue;
      total += nextOccurrences(r, { now: new Date(), count: 7 }).length;
    }
    return total;
  }, [reminders]);

  const handleAddTemplate = (t: ReminderTemplate) => {
    const payload = buildReminderFromTemplate(t);
    const id = storeAddCustomReminder(payload);
    dismissTemplateFlag(t.id);
    toast.success(`تمت إضافة «${t.title.ar}»`);
    void id;
  };

  const handleCreate = (form: FormState) => {
    const patch = reminderFromForm(form);
    storeAddCustomReminder({
      ...(patch as Parameters<typeof storeAddCustomReminder>[0]),
      title: form.title,
      category: form.category,
      repeat: form.repeat,
      atTimeOfDay: form.atTimeOfDay || undefined,
      dayOfWeek: form.repeat === "weekly" ? form.dayOfWeek : undefined,
      dayOfMonth: form.repeat === "monthly" ? form.dayOfMonth : undefined,
      anchorKey: form.anchorKey,
      anchorOffsetMinutes: form.anchorOffsetMinutes,
      deeplink: form.deeplinkRoute ? { route: form.deeplinkRoute } : undefined,
      notification: {
        soundId: form.soundId,
        vibration: form.vibration,
        snoozeMinutes: 10,
      },
    });
    setDrawerMode(null);
    toast.success("تمت إضافة التذكير");
  };

  const handleSaveEdit = (form: FormState) => {
    if (!editingReminder) return;
    const patch = reminderFromForm(form, editingReminder);
    storeUpdateCustomReminder(editingReminder.id, patch);
    setEditingReminder(null);
    setDrawerMode(null);
    toast.success("تم تحديث التذكير");
  };

  const handleToggle = (id: string, next: boolean) => {
    storeToggleCustomReminder(id, next);
    toast.success(next ? "تم التفعيل" : "تم الإيقاف");
  };

  const handleDelete = (id: string) => {
    storeDeleteCustomReminder(id);
    toast.success("حُذف التذكير");
  };

  const handleMarkDone = (r: CustomReminder) => {
    storeToggleCustomReminder(r.id, false);
    toast.success("أحسنت! تم إيقاف التذكير لليوم");
  };

  const handleSnooze = (r: CustomReminder) => {
    const minutes = r.notification?.snoozeMinutes ?? 10;
    toast.success(`تم تأجيل التذكير ${minutes} دقيقة`);
  };

  const handleOpenDeeplink = (r: CustomReminder) => {
    if (r.deeplink?.route) navigate(r.deeplink.route);
  };

  const openCreate = () => {
    setEditingReminder(null);
    setDrawerMode("create");
  };

  const openEdit = (r: CustomReminder) => {
    setEditingReminder(r);
    setDrawerMode("edit");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4" dir="rtl">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-15 border border-accent-35">
            <Bell className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-[var(--fg)]">
              تذكيراتي
            </h1>
            <p className="text-xs text-[var(--muted-2)]">
              التذكيرات التي أضافها لك «أثر» أو أضفتها بنفسك
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/companion"
            className="flex items-center gap-1 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-2.5 py-2 text-[11px] font-semibold hover:bg-[var(--card-2)] transition"
            aria-label="افتح الرفيق"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            افتح الرفيق
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent)] text-black/85 shadow-sm transition active:scale-95"
            aria-label="تذكير جديد"
            title="تذكير جديد"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ─── Stats Header Card ──────────────────────────── */}
      {reminders.length === 0 ? (
        <Card className="mt-5 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-15 border border-accent-35 mb-3">
            <Bell className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold">لا توجد تذكيرات بعد</p>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
            اطلب من «أثر» إضافة تذكير وسينشئه لك فورًا — مثلًا: «ذكّرني بقراءة سورة الكهف كل جمعة».
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/companion")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-[12px] font-bold text-black/85 active:scale-95 transition"
            >
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
              اطلب تذكيرًا من «أثر»
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3.5 py-2 text-[12px] font-semibold hover:bg-[var(--card-2)] transition"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              أنشئ تذكيرًا يدويًا
            </button>
          </div>
        </Card>
      ) : (
        <Card className="mt-5 grid grid-cols-3 gap-2 p-4">
          <Stat
            icon={<Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />}
            label="مفعّلة الآن"
            value={`${activeCount}`}
            sub={`من ${reminders.length}`}
          />
          <Stat
            icon={<CalendarDays className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />}
            label="مرات هذا الأسبوع"
            value={`${weekFirings}`}
            sub="إجمالي الإطلاقات"
          />
          <Stat
            icon={<Flame className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />}
            label="أفضل تتابع"
            value={`${stats.streak}`}
            sub="أيام متتالية"
          />
        </Card>
      )}

      {/* ─── Recommended Templates ──────────────────────── */}
      {recommendedTemplates.length > 0 ? (
        <section className="mt-6">
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold">اقتراحات لك</h2>
            <span className="text-[10.5px] text-[var(--muted-2)]">٦ تذكيرات منتقاة</span>
          </header>
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1">
            {recommendedTemplates.map((t) => (
              <article
                key={t.id}
                className="glass-strong flex w-44 shrink-0 snap-start flex-col justify-between rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{t.defaultIcon}</span>
                    <CategoryDot category={t.category} />
                  </div>
                  <h3 className="mt-2 text-[12.5px] font-bold leading-tight">{t.title.ar}</h3>
                  <p className="mt-1 line-clamp-2 text-[10.5px] text-[var(--muted-2)]">{t.description}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted-2)]">
                    {timeLabel(t.defaultTime)} • {REPEAT_LABELS[TEMPLATE_REPEAT_TO_REPEAT[t.defaultRepeat]] ?? t.defaultRepeat}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddTemplate(t)}
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-bold text-black/85 transition active:scale-95"
                  aria-label={`أضف تذكير ${t.title.ar}`}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  أضف تذكيرًا
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ─── Category Tabs ──────────────────────────────── */}
      {reminders.length > 0 ? (
        <div className="mt-5 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="tablist" aria-label="تصفية التذكيرات حسب التصنيف">
          {CATEGORY_TABS.map((tab) => {
            const active = tab.id === category;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(tab.id)}
                className={cn(
                  "shrink-0 rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                  active
                    ? "border-accent-45 bg-accent-15 text-[var(--accent)]"
                    : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted-2)] hover:bg-[var(--card-2)]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* ─── Reminders list ─────────────────────────────── */}
      <div className="mt-4 space-y-2">
        {reminders.length === 0 ? null : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--stroke)] bg-[var(--card)]/60 p-5 text-center">
            <p className="text-sm font-semibold">لا توجد تذكيرات في هذا التصنيف</p>
            <p className="mt-1 text-[11px] text-[var(--muted-2)]">
              جرّب تصنيفًا آخر، أو أنشئ تذكيرًا جديدًا.
            </p>
          </div>
        ) : (
          filtered.map((r) => (
            <ReminderRow
              key={r.id}
              r={r}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={handleDelete}
              onOpenSettings={(rem) => setSettingsReminder(rem)}
              onMarkDone={handleMarkDone}
              onSnooze={handleSnooze}
              onOpenDeeplink={handleOpenDeeplink}
            />
          ))
        )}

        {reminders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--stroke)] bg-[var(--card)]/60 p-3 text-[11.5px] text-[var(--muted-2)]">
            <div className="flex items-start gap-2">
              <Plus className="h-4 w-4 shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden="true" />
              <p>
                لإضافة تذكير جديد اطلبه من «أثر» بكلامك، مثلًا: «ذكّرني بأذكار المساء كل يوم الساعة السادسة».
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── Stats Mini Card ────────────────────────────── */}
      {reminders.length > 0 ? (
        <Card className="mt-6 grid grid-cols-3 gap-2 p-4">
          <MiniStat
            icon={<Clock className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />}
            label="اليوم"
            value={`${stats.todayFirings}`}
          />
          <MiniStat
            icon={<Target className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />}
            label="نسبة الالتزام"
            value={`${stats.completionRate}٪`}
          />
          <MiniStat
            icon={<Flame className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />}
            label="تتابع"
            value={`${stats.streak}ي`}
          />
        </Card>
      ) : null}

      {/* ─── Create / Edit drawer ───────────────────────── */}
      <ReminderFormDrawer
        open={drawerMode !== null}
        mode={drawerMode === "edit" ? "edit" : "create"}
        initial={
          drawerMode === "edit" && editingReminder
            ? formFromReminder(editingReminder)
            : EMPTY_FORM
        }
        onClose={() => {
          setDrawerMode(null);
          setEditingReminder(null);
        }}
        onSubmit={drawerMode === "edit" ? handleSaveEdit : handleCreate}
      />

      {/* ─── Per-reminder Settings sheet ────────────────── */}
      <ReminderSettingsSheet
        open={settingsReminder !== null}
        reminder={settingsReminder}
        onClose={() => setSettingsReminder(null)}
        onToggle={handleToggle}
        onPatch={(id, patch) => storeUpdateCustomReminder(id, patch)}
      />
    </div>
  );
}

function Stat(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--stroke)] bg-[var(--card-2)]/40 p-2 text-center">
      {props.icon}
      <p className="text-base font-bold leading-tight">{props.value}</p>
      <p className="text-[10.5px] text-[var(--muted-2)]">{props.label}</p>
      <p className="text-[9.5px] text-[var(--muted-2)] opacity-70">{props.sub}</p>
    </div>
  );
}

function MiniStat(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--card-2)]/40 p-2">
      {props.icon}
      <div>
        <p className="text-[10px] text-[var(--muted-2)]">{props.label}</p>
        <p className="text-[13px] font-bold leading-tight">{props.value}</p>
      </div>
    </div>
  );
}

export default RemindersPage;
