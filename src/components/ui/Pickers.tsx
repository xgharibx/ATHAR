/**
 * App-styled pickers: Select, DateField, TimeField.
 *
 * The browser's own <select>, <input type="date"> and <input type="time"> open
 * the system dialogs — a grey Material calendar in English on a phone set to
 * English, a wheel of unstyled rows — which is what made the app feel like a
 * website wrapped in a shell. These open the app's own bottom sheet instead,
 * in the app's theme and language, and behave the same on Android, iOS and web.
 *
 * Drop-in: Select takes <option> children and calls onChange with an
 * event-shaped `{ target: { value } }`; the date and time fields speak the same
 * "YYYY-MM-DD" / "HH:MM" strings as the inputs they replace.
 */
import * as React from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { arNum, westernToArabicDigits } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

type ChangeLike = { target: { value: string } };

const triggerBase =
  "flex items-center justify-between gap-2 text-start disabled:opacity-50 disabled:cursor-not-allowed";

// ── Select ───────────────────────────────────────────────────────────────────

function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

type SelectProps = {
  value: string | number | undefined;
  onChange?: (e: ChangeLike) => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** Heading of the sheet; falls back to aria-label. */
  title?: string;
};

export function Select({ value, onChange, children, className, id, disabled, title, ...rest }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(
    () =>
      React.Children.toArray(children)
        .filter((c): c is React.ReactElement<{ value?: string | number; children?: React.ReactNode }> =>
          React.isValidElement(c) && c.type === "option")
        .map((c) => ({
          value: String(c.props.value ?? textOf(c.props.children)),
          label: textOf(c.props.children),
        })),
    [children],
  );
  const current = options.find((o) => o.value === String(value ?? ""));
  const heading = title ?? rest["aria-label"] ?? "اختر";
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
    }, 30);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest["aria-label"]}
        onClick={() => setOpen(true)}
        className={cn(triggerBase, className)}
      >
        <span className="truncate">{current?.label ?? ""}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 opacity-60" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel={heading}>
        <div className="px-5 pt-2 pb-1 text-base font-semibold">{heading}</div>
        <div ref={listRef} role="listbox" aria-label={heading} className="overflow-y-auto px-3 pb-4">
          {options.map((o) => {
            const selected = o.value === String(value ?? "");
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange?.({ target: { value: o.value } });
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-start text-sm",
                  selected ? "bg-[var(--card-2)] text-[var(--accent)] font-semibold" : "hover:bg-[var(--card)]",
                )}
              >
                <span>{o.label}</span>
                {selected && <Check size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

// ── Date ─────────────────────────────────────────────────────────────────────

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// The week starts on Saturday here.
const WEEKDAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const year4 = (y: number) => westernToArabicDigits(String(y));

function parseDate(v: string | undefined): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "");
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}

export function formatDateAr(v: string | undefined): string {
  const p = parseDate(v);
  return p ? `${arNum(p.d)} ${MONTHS[p.m]} ${year4(p.y)}` : "";
}

type DateFieldProps = {
  value: string;
  onChange?: (e: ChangeLike) => void;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

export function DateField({ value, onChange, min, max, className, disabled, placeholder = "اختر التاريخ", ...rest }: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const now = new Date();
  const selected = parseDate(value);
  const [view, setView] = React.useState({ y: selected?.y ?? now.getFullYear(), m: selected?.m ?? now.getMonth() });
  const [mode, setMode] = React.useState<"days" | "years">("days");

  React.useEffect(() => {
    if (!open) return;
    const p = parseDate(value);
    setView({ y: p?.y ?? now.getFullYear(), m: p?.m ?? now.getMonth() });
    setMode("days");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const first = (new Date(view.y, view.m, 1).getDay() + 1) % 7; // Saturday = 0
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const cells: Array<number | null> = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const disabledDay = (d: number) => {
    const s = iso(view.y, view.m, d);
    return (!!min && s < min) || (!!max && s > max);
  };
  const minYear = parseDate(min)?.y ?? now.getFullYear() - 100;
  const maxYear = parseDate(max)?.y ?? now.getFullYear() + 20;
  const years = Array.from({ length: Math.max(1, maxYear - minYear + 1) }, (_, i) => maxYear - i);
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const step = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const yearsRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (mode !== "years") return;
    const t = window.setTimeout(() => {
      yearsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
    }, 30);
    return () => window.clearTimeout(t);
  }, [mode]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest["aria-label"]}
        onClick={() => setOpen(true)}
        className={cn(triggerBase, className)}
      >
        <span className={cn("truncate", !value && "opacity-50")}>{value ? formatDateAr(value) : placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 opacity-60" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel={rest["aria-label"] ?? "اختيار التاريخ"}>
        <div className="px-4 pt-2 pb-4" data-testid="date-sheet">
          <div className="flex items-center justify-between mb-3">
            <button type="button" aria-label="الشهر التالي" onClick={() => step(1)} className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "days" ? "years" : "days")}
              className="px-4 py-2 rounded-2xl text-base font-semibold hover:bg-[var(--card)]"
            >
              {MONTHS[view.m]} {year4(view.y)}
            </button>
            <button type="button" aria-label="الشهر السابق" onClick={() => step(-1)} className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          </div>

          {mode === "years" ? (
            <div ref={yearsRef} className="grid grid-cols-4 gap-2 max-h-[46vh] overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  aria-selected={y === view.y}
                  onClick={() => {
                    setView((v) => ({ ...v, y }));
                    setMode("days");
                  }}
                  className={cn(
                    "py-2.5 rounded-2xl text-sm",
                    y === view.y ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold" : "bg-[var(--card)]",
                  )}
                >
                  {year4(y)}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 text-center text-[11px] text-[var(--muted)] mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((d, i) =>
                  d === null ? (
                    <div key={`e${i}`} />
                  ) : (
                    <button
                      key={d}
                      type="button"
                      disabled={disabledDay(d)}
                      aria-pressed={value === iso(view.y, view.m, d)}
                      onClick={() => {
                        onChange?.({ target: { value: iso(view.y, view.m, d) } });
                        setOpen(false);
                      }}
                      className={cn(
                        "mx-auto w-10 h-10 rounded-full text-sm flex items-center justify-center disabled:opacity-25",
                        value === iso(view.y, view.m, d)
                          ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                          : iso(view.y, view.m, d) === today
                            ? "border border-[var(--accent)]"
                            : "hover:bg-[var(--card)]",
                      )}
                    >
                      {arNum(d)}
                    </button>
                  ),
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 mt-4">
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange?.({ target: { value: "" } });
                  setOpen(false);
                }}
                className="flex-1 rounded-2xl border border-[var(--stroke)] py-2.5 text-sm"
              >
                مسح
              </button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-2xl bg-[var(--card)] py-2.5 text-sm">
              إغلاق
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Time ─────────────────────────────────────────────────────────────────────

function parseTime(v: string | undefined): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(v ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  return h >= 0 && h < 24 && mm >= 0 && mm < 60 ? { h, m: mm } : null;
}

export function formatTimeAr(v: string | undefined): string {
  const t = parseTime(v);
  if (!t) return "";
  const h12 = t.h % 12 === 0 ? 12 : t.h % 12;
  return `${arNum(h12)}:${westernToArabicDigits(pad(t.m))} ${t.h < 12 ? "ص" : "م"}`;
}

type TimeFieldProps = {
  value: string;
  onChange?: (e: ChangeLike) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  dir?: string;
};

export function TimeField({ value, onChange, className, disabled, ...rest }: TimeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseTime(value) ?? { h: 6, m: 0 };
  const [draft, setDraft] = React.useState(parsed);
  const hoursRef = React.useRef<HTMLDivElement | null>(null);
  const minsRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(parseTime(value) ?? { h: 6, m: 0 });
    const t = window.setTimeout(() => {
      for (const ref of [hoursRef, minsRef]) {
        ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
      }
    }, 40);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const h12 = draft.h % 12 === 0 ? 12 : draft.h % 12;
  const pm = draft.h >= 12;
  const setHour12 = (h: number) => setDraft((d) => ({ ...d, h: (h % 12) + (d.h >= 12 ? 12 : 0) }));
  const setPm = (p: boolean) => setDraft((d) => ({ ...d, h: (d.h % 12) + (p ? 12 : 0) }));

  const col = "flex-1 max-h-[34vh] overflow-y-auto rounded-2xl bg-[var(--card)] py-1";
  const cell = (on: boolean) =>
    cn("w-full py-2.5 text-center text-base", on ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold rounded-xl" : "");

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest["aria-label"]}
        onClick={() => setOpen(true)}
        className={cn(triggerBase, className)}
      >
        <span className={cn("truncate", !parseTime(value) && "opacity-50")}>{formatTimeAr(value) || "اختر الوقت"}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 opacity-60" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel={rest["aria-label"] ?? "اختيار الوقت"}>
        <div className="px-4 pt-2 pb-4" data-testid="time-sheet">
          <div className="text-center text-2xl font-semibold mb-3" aria-live="polite">
            {formatTimeAr(`${pad(draft.h)}:${pad(draft.m)}`)}
          </div>
          <div className="flex gap-2" dir="ltr">
            <div ref={hoursRef} className={col} aria-label="الساعة">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <button key={h} type="button" aria-selected={h === h12} onClick={() => setHour12(h)} className={cell(h === h12)}>
                  {arNum(h)}
                </button>
              ))}
            </div>
            <div ref={minsRef} className={col} aria-label="الدقيقة">
              {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                <button key={m} type="button" aria-selected={m === draft.m} onClick={() => setDraft((d) => ({ ...d, m }))} className={cell(m === draft.m)}>
                  {westernToArabicDigits(pad(m))}
                </button>
              ))}
            </div>
            <div className="w-20 flex flex-col gap-2">
              <button type="button" aria-pressed={!pm} onClick={() => setPm(false)} className={cn("flex-1 rounded-2xl text-sm", !pm ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold" : "bg-[var(--card)]")}>
                ص
              </button>
              <button type="button" aria-pressed={pm} onClick={() => setPm(true)} className={cn("flex-1 rounded-2xl text-sm", pm ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold" : "bg-[var(--card)]")}>
                م
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-2xl border border-[var(--stroke)] py-2.5 text-sm">
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                onChange?.({ target: { value: `${pad(draft.h)}:${pad(draft.m)}` } });
                setOpen(false);
              }}
              className="flex-1 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] py-2.5 text-sm font-semibold"
            >
              تم
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
