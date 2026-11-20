/**
 * What «السماع» remembers about your listening, on this device:
 *
 *   history      the last tracks, each with where you stopped (to resume)
 *   days         seconds listened per day (streaks, the week's chart, the daily goal)
 *   heard        how many times each surah was heard to the end
 *   khatma       the listening khatma: the 114 surahs, each heard in full once
 *   byArtist     time per reciter or munshid (your most listened)
 *   favorites    tracks and reciters you saved
 *   playlists    your own lists
 *   downloads    tracks saved on the phone for listening offline (the apps)
 *   autoSave     save what you listen to as you listen (the apps)
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ListenTrack } from "@/lib/listen/catalog";

export type HistoryEntry = { track: ListenTrack; at: number; positionMs: number; durationMs: number };
export type Playlist = { id: string; name: string; tracks: ListenTrack[]; createdAt: number };

type ListenData = {
  history: HistoryEntry[];
  days: Record<string, number>;
  heard: Record<string, number>;
  khatma: { startedAt: number; done: number[]; completedAt?: number; rounds: number };
  byArtist: Record<string, number>;
  favorites: Record<string, ListenTrack>;
  favoriteReciters: number[];
  playlists: Playlist[];
  totalSeconds: number;
  dailyGoalMinutes: number;
  preferred: { reciterId: number; moshafId: number } | null;
  rate: number;
  downloads: Record<string, ListenTrack & { savedAt: number }>;
  autoSave: boolean;
};

type ListenActions = {
  recordProgress(track: ListenTrack, positionMs: number, durationMs: number): void;
  addListened(track: ListenTrack, seconds: number): void;
  markCompleted(track: ListenTrack): void;
  toggleFavorite(track: ListenTrack): void;
  toggleFavoriteReciter(id: number): void;
  createPlaylist(name: string, tracks?: ListenTrack[]): string;
  addToPlaylist(id: string, track: ListenTrack): void;
  removeFromPlaylist(id: string, trackId: string): void;
  renamePlaylist(id: string, name: string): void;
  deletePlaylist(id: string): void;
  clearHistory(): void;
  restartKhatma(): void;
  setDailyGoal(minutes: number): void;
  setPreferred(reciterId: number, moshafId: number): void;
  setRate(rate: number): void;
  markDownloaded(tracks: ListenTrack[]): void;
  forgetDownloads(ids: string[]): void;
  setAutoSave(on: boolean): void;
};

export type ListenState = ListenData & ListenActions;

const HISTORY_MAX = 80;

export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const initial: ListenData = {
  history: [],
  days: {},
  heard: {},
  khatma: { startedAt: Date.now(), done: [], rounds: 0 },
  byArtist: {},
  favorites: {},
  favoriteReciters: [],
  playlists: [],
  totalSeconds: 0,
  dailyGoalMinutes: 15,
  preferred: null,
  rate: 1,
  downloads: {},
  autoSave: true,
};

export const useListenStore = create<ListenState>()(
  persist(
    (set) => ({
      ...initial,

      recordProgress(track, positionMs, durationMs) {
        set((s) => {
          const rest = s.history.filter((h) => h.track.id !== track.id);
          const entry: HistoryEntry = { track, at: Date.now(), positionMs: Math.max(0, Math.round(positionMs)), durationMs: Math.max(0, Math.round(durationMs)) };
          return { history: [entry, ...rest].slice(0, HISTORY_MAX) };
        });
      },

      addListened(track, seconds) {
        if (!(seconds > 0) || seconds > 600) return; // a single report never covers more than a few minutes
        set((s) => {
          const key = dayKey();
          return {
            days: { ...s.days, [key]: (s.days[key] ?? 0) + seconds },
            byArtist: { ...s.byArtist, [track.artist]: (s.byArtist[track.artist] ?? 0) + seconds },
            totalSeconds: s.totalSeconds + seconds,
          };
        });
      },

      markCompleted(track) {
        set((s) => {
          const heard = track.surah ? { ...s.heard, [String(track.surah)]: (s.heard[String(track.surah)] ?? 0) + 1 } : s.heard;
          let khatma = s.khatma;
          if (track.surah && (track.kind === "surah" || track.kind === "qiyam") && !khatma.done.includes(track.surah)) {
            const done = [...khatma.done, track.surah];
            khatma = done.length >= 114
              ? { ...khatma, done, completedAt: Date.now(), rounds: khatma.rounds + 1 }
              : { ...khatma, done };
          }
          // A finished track resumes from the start next time.
          const history = s.history.map((h) => (h.track.id === track.id ? { ...h, positionMs: 0 } : h));
          return { heard, khatma, history };
        });
      },

      toggleFavorite(track) {
        set((s) => {
          const favorites = { ...s.favorites };
          if (favorites[track.id]) delete favorites[track.id];
          else favorites[track.id] = track;
          return { favorites };
        });
      },

      toggleFavoriteReciter(id) {
        set((s) => ({
          favoriteReciters: s.favoriteReciters.includes(id) ? s.favoriteReciters.filter((x) => x !== id) : [id, ...s.favoriteReciters],
        }));
      },

      createPlaylist(name, tracks = []) {
        const id = `p${Date.now().toString(36)}`;
        set((s) => ({ playlists: [{ id, name: name.trim() || "قائمتي", tracks, createdAt: Date.now() }, ...s.playlists] }));
        return id;
      },

      addToPlaylist(id, track) {
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === id && !p.tracks.some((t) => t.id === track.id) ? { ...p, tracks: [...p.tracks, track] } : p)),
        }));
      },

      removeFromPlaylist(id, trackId) {
        set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p)) }));
      },

      renamePlaylist(id, name) {
        set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)) }));
      },

      deletePlaylist(id) {
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
      },

      clearHistory() {
        set({ history: [] });
      },

      restartKhatma() {
        set((s) => ({ khatma: { startedAt: Date.now(), done: [], rounds: s.khatma.rounds } }));
      },

      setDailyGoal(minutes) {
        set({ dailyGoalMinutes: Math.max(5, Math.min(240, Math.round(minutes))) });
      },

      setPreferred(reciterId, moshafId) {
        set({ preferred: { reciterId, moshafId } });
      },

      setRate(rate) {
        set({ rate: Math.max(0.5, Math.min(2, rate)) });
      },

      markDownloaded(tracks) {
        if (!tracks.length) return;
        set((s) => {
          const downloads = { ...s.downloads };
          const at = Date.now();
          for (const t of tracks) downloads[t.id] = { ...t, savedAt: downloads[t.id]?.savedAt ?? at };
          return { downloads };
        });
      },

      forgetDownloads(ids) {
        if (!ids.length) return;
        set((s) => {
          const downloads = { ...s.downloads };
          for (const id of ids) delete downloads[id];
          return { downloads };
        });
      },

      setAutoSave(on) {
        set({ autoSave: on });
      },
    }),
    {
      name: "athar_listen_v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Consecutive days with at least a minute of listening, ending today (or yesterday). */
export function listeningStreak(days: Record<string, number>, today = new Date()): number {
  let streak = 0;
  const d = new Date(today);
  if ((days[dayKey(d)] ?? 0) < 60) d.setDate(d.getDate() - 1);
  for (;;) {
    if ((days[dayKey(d)] ?? 0) < 60) return streak;
    streak++;
    d.setDate(d.getDate() - 1);
  }
}

/** The last seven days, oldest first: [{ key, label, seconds }]. */
export function lastSevenDays(days: Record<string, number>, today = new Date()) {
  const names = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return { key, label: names[d.getDay()]!, seconds: days[key] ?? 0 };
  });
}

/** Tracks still worth resuming: started, not near their end, newest first. */
export function resumable(history: HistoryEntry[]): HistoryEntry[] {
  return history.filter((h) => h.positionMs > 20_000 && (!h.durationMs || h.positionMs < h.durationMs - 15_000));
}
