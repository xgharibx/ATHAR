import * as React from "react";

/** The three tables added together; their "جديد" mark shows until each is opened. */
const NEW_IDS = new Set(["wird", "muhasaba", "qadaa"]);
const SEEN_KEY = "noor_seen_new_marks_v1";
const SEEN_EVENT = "noor-new-marks-seen";

function readSeen(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markNewSeen(id: string): void {
  if (!NEW_IDS.has(id)) return;
  const seen = readSeen();
  if (seen.includes(id)) return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
  } catch {
    /* private mode — the mark just stays */
  }
  window.dispatchEvent(new Event(SEEN_EVENT));
}

export function useIsNew(id: string): boolean {
  const [seen, setSeen] = React.useState(() => readSeen());
  React.useEffect(() => {
    const sync = () => setSeen(readSeen());
    window.addEventListener(SEEN_EVENT, sync);
    return () => window.removeEventListener(SEEN_EVENT, sync);
  }, []);
  return NEW_IDS.has(id) && !seen.includes(id);
}

/** A tiny gilded "جديد" under the icon — no pill, just refined lettering. Parent must be `relative`. */
export function NewMark() {
  return (
    <span aria-hidden="true" className="new-mark pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-[7px]">
      جديد
    </span>
  );
}
