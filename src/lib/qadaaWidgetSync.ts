/**
 * Widget → App qadaa sync (Android).
 *
 * The big Qadaa widget lets someone log or undo a prayer from the home screen
 * while the app is closed. Each tap bumps a cumulative counter in a native
 * ledger (`{ owners: { <owner>: { "p:fajr": { i: plus, d: minus } } } }`).
 * Counters only ever grow, so merging is a matter of remembering how far each
 * one was read — the same high-water idea as the tasbeeh widget — and applying
 * the difference. Nothing is cleared on either side, which is what makes a tap
 * that lands mid-merge impossible to lose or to count twice.
 */
import { Capacitor } from "@capacitor/core";
import { accountScopedLocalStorage, getAccountStorageOwner } from "@/lib/accountStorageScope";
import { useNoorStore } from "@/store/noorStore";
import { parsePrayerKey } from "@/lib/qadaa";

export const QADAA_LEDGER_KEY = "noor_widget_qadaa_ledger_v1";
const MERGED_KEY = "noor_widget_qadaa_merged_v1";

export type QadaaMarks = Record<string, { i: number; d: number }>;

const whole = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function readMarks(): QadaaMarks {
  try {
    const raw = JSON.parse(accountScopedLocalStorage.getItem(MERGED_KEY) ?? "{}") as Record<string, { i?: unknown; d?: unknown }>;
    const out: QadaaMarks = {};
    for (const [k, v] of Object.entries(raw)) {
      if (parsePrayerKey(k) !== null) out[k] = { i: whole(v?.i), d: whole(v?.d) };
    }
    return out;
  } catch {
    return {};
  }
}

/** Net change per key since `marks`, and the marks to store once it is applied. Pure. */
export function diffLedger(
  counters: Record<string, { i?: unknown; d?: unknown }> | undefined,
  marks: QadaaMarks,
): { net: Record<string, number>; next: QadaaMarks } {
  const net: Record<string, number> = {};
  const next: QadaaMarks = { ...marks };
  for (const [key, c] of Object.entries(counters ?? {})) {
    if (parsePrayerKey(key) === null) continue;
    const i = whole(c?.i);
    const d = whole(c?.d);
    const m = marks[key] ?? { i: 0, d: 0 };
    // A counter that went backwards means the widget data was cleared; keep the
    // high-water mark so re-reading cannot subtract or re-credit old taps.
    const di = Math.max(0, i - m.i);
    const dd = Math.max(0, d - m.d);
    if (di - dd !== 0) net[key] = di - dd;
    next[key] = { i: Math.max(i, m.i), d: Math.max(d, m.d) };
  }
  return { net, next };
}

export async function mergeQadaaFromWidget(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: QADAA_LEDGER_KEY });
    if (!value) return;
    const payload = JSON.parse(value) as { owners?: Record<string, Record<string, { i?: unknown; d?: unknown }>> };
    const counters = payload.owners?.[getAccountStorageOwner()];
    if (!counters) return;

    const { net, next } = diffLedger(counters, readMarks());
    const st = useNoorStore.getState();
    for (const [key, n] of Object.entries(net)) {
      if (n > 0) st.logQadaa(key, n);
      else for (let i = 0; i < -n; i += 1) st.undoQadaa(key);
    }
    try {
      accountScopedLocalStorage.setItem(MERGED_KEY, JSON.stringify(next));
    } catch {
      // A failed marker write re-reads the same taps once more at worst.
    }
  } catch {
    // Best-effort — the ledger may be absent or malformed.
  }
}
