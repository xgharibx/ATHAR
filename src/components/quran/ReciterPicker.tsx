/**
 * ReciterPicker — premium grouped + searchable reciter selector.
 *
 * - Search bar with Arabic-diacritic-tolerant filtering
 * - Three categories (Murattal / Mujawwad / Legacy) with sticky headers
 * - Current selection shown with accent ring + check icon
 * - Designed to feel at home in the controls bar of the Quran page.
 */
import * as React from "react";
import { Search, X as XIcon, Volume2, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { arNum } from "@/lib/formatNumber";

import {
  groupReciters,
  RECITER_CATEGORY_LABELS,
  type Reciter,
  type ReciterCategory,
} from "@/lib/quranReciters";

export function ReciterPicker(props: {
  open: boolean;
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const groups = React.useMemo(() => groupReciters(q), [q]);

  React.useEffect(() => {
    if (!props.open) setQ("");
  }, [props.open]);

  if (!props.open) return null;
  const current = props.value;

  return (
    <Modal open={props.open} onClose={props.onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] p-4">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-sm font-bold">اختر القارئ</h2>
        </div>
        <button type="button" onClick={props.onClose} aria-label="إغلاق"
          className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--card)] transition hover:bg-[var(--card-2)]">
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="sticky top-0 z-[1] border-b border-[var(--stroke)] bg-[var(--bg)]/95 p-3 backdrop-blur-md">
        <div className="relative">
          <Search size={16} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن قارئ… (مثال: العفاسي، الشاطري)"
            className="form-field-readable w-full rounded-xl border border-[var(--stroke)] bg-[var(--card)] ps-9 pe-9 py-2.5 text-sm focus:outline-none focus:border-accent-35"
            aria-label="بحث في القراء"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="مسح"
              className="absolute end-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-90">
              <XIcon size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {groups.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--muted-2)]">لا توجد نتائج لـ «{q}»</p>
        ) : (
          groups.map((g) => (
            <ReciterGroup key={g.category} category={g.category} items={g.items} current={current} onPick={(id) => { props.onChange(id); props.onClose(); }} />
          ))
        )}
      </div>
    </Modal>
  );
}

function ReciterGroup(props: {
  category: ReciterCategory;
  items: Reciter[];
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <section>
      <header className="sticky top-[68px] z-[1] -mx-0 bg-[var(--bg)]/90 px-4 py-1.5 backdrop-blur-md border-b border-[var(--stroke)]/40">
        <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-[var(--accent)]">
          <span>{RECITER_CATEGORY_LABELS[props.category]}</span>
          <span className="opacity-50">{arNum(props.items.length)}</span>
        </div>
      </header>
      <ul>
        {props.items.map((r) => (
          <li key={r.id}>
            <button type="button"
              onClick={() => props.onPick(r.id)}
              className={[
                "w-full flex items-center gap-3 px-4 py-2.5 text-right transition border-b border-[var(--stroke)]/30",
                props.current === r.id
                  ? "bg-accent-15 ring-1 ring-accent-35"
                  : "hover:bg-[var(--card)]",
              ].join(" ")}
              aria-pressed={props.current === r.id}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--fg)]">{r.label}</div>
                {r.sub ? <div className="text-[10.5px] text-[var(--muted-2)] truncate">{r.sub}</div> : null}
              </div>
              {props.current === r.id ? (
                <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}