/**
 * The Quran section and the rest of Athar.
 *
 * What you read here counts wherever the app counts reading: the day's wird,
 * the khatma plan, the streak, the garden's pomegranates, the widgets and
 * «تابع القراءة» on the home screen all read the app's own fields
 * (quranDailyAyahs, quranLastRead, quranMushafPage), so this section writes
 * them too.
 *
 * Bookmarks, notes and colours live in this section's marks; they are also
 * written to the app's own fields (quranBookmarks, quranNotes,
 * quranHighlights), which travel with the account to the person's other
 * devices. Whatever arrives there (from another device, or kept from the
 * app's earlier Quran section) comes into the marks.
 */
import { ibadahDayKeyOf, useNoorStore } from "@/store/noorStore";
import { getLocalDateKey } from "@/lib/dayBoundaries";
import { isKhatmaDayRead } from "@/lib/khatmaReminder";
import { markKey, useQ2Store, type Q2Mark, type Q2MarkColor } from "./store";
import { loadQuran2Meta, pageOf } from "./data/meta";

type OldMarks = {
  quranBookmarks: Record<string, boolean>;
  quranNotes: Record<string, string>;
  quranHighlights: Record<string, string>;
};

const TO_Q2: Record<string, Q2MarkColor> = { gold: "gold", green: "green", blue: "blue", red: "rose" };
const TO_OLD: Record<Q2MarkColor, string> = { gold: "gold", green: "green", blue: "blue", rose: "red" };
const KEY = /^(\d{1,3}):(\d{1,3})$/;

function validKey(key: string): [number, number] | null {
  const m = KEY.exec(key);
  if (!m) return null;
  const s = Number(m[1]);
  const a = Number(m[2]);
  return s >= 1 && s <= 114 && a >= 1 && a <= 286 ? [s, a] : null;
}

/** The mark an ayah has in the app's own fields. */
function oldMarkOf(old: OldMarks, key: string): Omit<Q2Mark, "at"> {
  const color = TO_Q2[old.quranHighlights[key] ?? ""];
  const note = (old.quranNotes[key] ?? "").trim();
  return {
    ...(old.quranBookmarks[key] ? { bookmark: true } : {}),
    ...(color ? { color } : {}),
    ...(note ? { note } : {}),
  };
}

function sameMark(a: Omit<Q2Mark, "at"> | undefined, b: Omit<Q2Mark, "at"> | undefined): boolean {
  return Boolean(a?.bookmark) === Boolean(b?.bookmark) && (a?.color ?? null) === (b?.color ?? null) && (a?.note?.trim() ?? "") === (b?.note?.trim() ?? "");
}

let writingOld = false;

/** Write one ayah's mark to the app's own fields (or clear it there). */
export function mirrorMarkToOld(s: number, a: number, mark: Q2Mark | undefined): void {
  const key = markKey(s, a);
  const st = useNoorStore.getState();
  const old = { quranBookmarks: st.quranBookmarks, quranNotes: st.quranNotes, quranHighlights: st.quranHighlights };
  if (sameMark(oldMarkOf(old, key), mark)) return;
  const bookmarks = { ...old.quranBookmarks };
  const notes = { ...old.quranNotes };
  const highlights = { ...old.quranHighlights };
  if (mark?.bookmark) bookmarks[key] = true;
  else delete bookmarks[key];
  if (mark?.note?.trim()) notes[key] = mark.note.trim();
  else delete notes[key];
  if (mark?.color) highlights[key] = TO_OLD[mark.color];
  else delete highlights[key];
  writingOld = true;
  try {
    useNoorStore.setState({ quranBookmarks: bookmarks, quranNotes: notes, quranHighlights: highlights });
  } finally {
    writingOld = false;
  }
}

/** Bring every mark kept in the app's own fields into the section, without losing the section's own. */
export function adoptOldMarks(): number {
  const st = useNoorStore.getState();
  const old: OldMarks = { quranBookmarks: st.quranBookmarks ?? {}, quranNotes: st.quranNotes ?? {}, quranHighlights: st.quranHighlights ?? {} };
  const keys = new Set([...Object.keys(old.quranBookmarks), ...Object.keys(old.quranNotes), ...Object.keys(old.quranHighlights)]);
  const q2 = useQ2Store.getState();
  const marks = { ...q2.marks };
  let added = 0;
  for (const key of keys) {
    if (!validKey(key)) continue;
    const from = oldMarkOf(old, key);
    if (!from.bookmark && !from.color && !from.note) continue;
    const mine = marks[key];
    // The section's own mark wins where both have something; the rest is added.
    const merged: Q2Mark = {
      at: mine?.at ?? Date.now(),
      ...(mine?.bookmark || from.bookmark ? { bookmark: true } : {}),
      ...(mine?.color ?? from.color ? { color: (mine?.color ?? from.color)! } : {}),
      ...(mine?.note?.trim() || from.note ? { note: mine?.note?.trim() || from.note } : {}),
    };
    if (!sameMark(mine, merged)) {
      marks[key] = merged;
      added += 1;
    }
  }
  useQ2Store.setState({ marks, adoptedOld: true });
  // And the other way: the section's marks go to the account too.
  for (const [key, mark] of Object.entries(useQ2Store.getState().marks)) {
    const at = validKey(key);
    if (at) mirrorMarkToOld(at[0], at[1], mark);
  }
  // Where the earlier section had stopped, when this one has no place yet.
  if (!useQ2Store.getState().lastRead && st.quranLastRead) {
    const { surahId, ayahIndex } = st.quranLastRead;
    if (surahId >= 1 && surahId <= 114 && ayahIndex >= 1) useQ2Store.setState({ lastRead: { s: surahId, a: ayahIndex, at: Date.now() } });
  }
  return added;
}

/** Changes that arrive in the app's own fields (another device) come into the marks, key by key. */
function applyOldChanges(prev: OldMarks, next: OldMarks): void {
  const keys = new Set<string>();
  for (const field of ["quranBookmarks", "quranNotes", "quranHighlights"] as const) {
    if (prev[field] === next[field]) continue;
    for (const k of new Set([...Object.keys(prev[field] ?? {}), ...Object.keys(next[field] ?? {})])) {
      if (prev[field]?.[k] !== next[field]?.[k]) keys.add(k);
    }
  }
  if (!keys.size) return;
  const marks = { ...useQ2Store.getState().marks };
  let changed = false;
  for (const key of keys) {
    if (!validKey(key)) continue;
    const want = oldMarkOf(next, key);
    if (sameMark(marks[key], want)) continue;
    changed = true;
    if (!want.bookmark && !want.color && !want.note) delete marks[key];
    else marks[key] = { ...want, at: Date.now() };
  }
  if (changed) useQ2Store.setState({ marks });
}

/** An ayah read here counts in the app's day (wird, streak, plan, garden). */
export function countAyahsRead(n: number): void {
  if (n <= 0) return;
  const store = useNoorStore.getState();
  store.recordQuranRead(n);
  // With a khatma plan, today's wird is ticked off once its ayahs are read.
  const st = useNoorStore.getState();
  if (!st.khatmaStartISO || !st.khatmaDays) return;
  const today = getLocalDateKey(new Date());
  if (st.khatmaDone?.[today]) return;
  const read = st.quranDailyAyahs?.[ibadahDayKeyOf(st)] ?? 0;
  const plan = { startISO: st.khatmaStartISO, days: st.khatmaDays, version: st.khatmaScheduleVersion, done: st.khatmaDone, dailyAyahs: { [today]: read } };
  if (isKhatmaDayRead(plan, today)) st.setKhatmaDone(today, true);
}

/** Where you stopped, for «تابع القراءة» across the app, and the page for the widgets. */
export function noteLastRead(s: number, a: number, page?: number | null): void {
  const st = useNoorStore.getState();
  if (st.quranLastRead?.surahId !== s || st.quranLastRead?.ayahIndex !== a) st.setQuranLastRead(s, a);
  if (page && page >= 1 && page <= 604 && st.prefs.quranMushafPage !== page) st.setPrefs({ quranMushafPage: page });
}

/** Keeps the marks in step with the account. Call once at start. */
export function startQuranBridge(): () => void {
  const run = () => {
    if (!useQ2Store.getState().adoptedOld) adoptOldMarks();
  };
  // Both stores read their saved state from the device synchronously, but
  // the app's own store may still be moving to the signed-in account.
  run();
  const offQ2 = useQ2Store.subscribe((state, prev) => {
    if (writingOld || state.marks === prev.marks) return;
    for (const key of new Set([...Object.keys(prev.marks), ...Object.keys(state.marks)])) {
      if (state.marks[key] === prev.marks[key]) continue;
      const at = validKey(key);
      if (at) mirrorMarkToOld(at[0], at[1], state.marks[key]);
    }
  });
  // Where you stopped here is where the app's «تابع القراءة» takes you.
  const offLast = useQ2Store.subscribe((state, prev) => {
    const last = state.lastRead;
    if (!last || last === prev.lastRead) return;
    noteLastRead(last.s, last.a);
    void loadQuran2Meta()
      .then((meta) => noteLastRead(last.s, last.a, pageOf(meta, last.s, last.a)))
      .catch(() => undefined);
  });
  const offOld = useNoorStore.subscribe((state, prev) => {
    if (writingOld) return;
    if (state.quranBookmarks === prev.quranBookmarks && state.quranNotes === prev.quranNotes && state.quranHighlights === prev.quranHighlights) return;
    applyOldChanges(
      { quranBookmarks: prev.quranBookmarks ?? {}, quranNotes: prev.quranNotes ?? {}, quranHighlights: prev.quranHighlights ?? {} },
      { quranBookmarks: state.quranBookmarks ?? {}, quranNotes: state.quranNotes ?? {}, quranHighlights: state.quranHighlights ?? {} },
    );
  });
  return () => {
    offQ2();
    offLast();
    offOld();
  };
}
