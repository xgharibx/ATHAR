/**
 * Companion chat history — local-first, per-device (this app has no login
 * system anywhere; "per user" here means per device, same as every other
 * store in Athar). Stored in IndexedDB via Dexie, matching hadithIDB.ts.
 *
 * Also: a small key/value store for partial-stream recovery (so a closed tab
 * mid-reply doesn't lose work) and search.
 */
import Dexie, { type Table } from "dexie";
import type { CompanionMessage } from "@/lib/companionAI";

export interface CompanionConversation {
  id: string;
  title: string;
  messages: CompanionMessage[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  pinnedAt?: number;
  topic?: string;
}

class CompanionDexie extends Dexie {
  conversations!: Table<CompanionConversation, string>;

  constructor() {
    super("athar-companion-v1");
    this.version(1).stores({ conversations: "id, updatedAt" });
    this.version(2).stores({ conversations: "id, updatedAt, pinned, pinnedAt" });
  }
}

let _db: CompanionDexie | null = null;
function getDB(): CompanionDexie {
  if (!_db) _db = new CompanionDexie();
  return _db;
}

export async function listConversations(): Promise<CompanionConversation[]> {
  try {
    return await getDB().conversations.orderBy("updatedAt").reverse().toArray();
  } catch {
    return [];
  }
}

export async function getConversation(id: string): Promise<CompanionConversation | null> {
  try {
    return (await getDB().conversations.get(id)) ?? null;
  } catch {
    return null;
  }
}

export async function saveConversation(conv: CompanionConversation): Promise<void> {
  try {
    await getDB().conversations.put(conv);
  } catch {
    /* autosave failure is non-fatal */
  }
}

export async function renameConversation(id: string, title: string): Promise<void> {
  try {
    await getDB().conversations.update(id, { title, updatedAt: Date.now() });
  } catch { /* ignore */ }
}

export async function pinConversation(id: string, pinned: boolean): Promise<void> {
  try {
    await getDB().conversations.update(id, {
      pinned,
      pinnedAt: pinned ? Date.now() : undefined,
    });
  } catch { /* ignore */ }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await getDB().conversations.delete(id);
  } catch { /* ignore */ }
}

export function newConversationId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromMessages(messages: CompanionMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const t = firstUser?.content.trim().replace(/\s+/g, " ") ?? "";
  if (!t) return "محادثة جديدة";
  const max = 40;
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 8 ? slice.slice(0, lastSpace) : slice;
  return trimmed + "…";
}

/* ─── Partial-stream survival ─────────────────────────────────────────── */

const PARTIAL_KEY = "noor_companion_partial_v1";

export type PartialStream = {
  conversationId: string;
  messages: CompanionMessage[];
  text: string;
  updatedAt: number;
};

export function savePartialStream(conversationId: string, messages: CompanionMessage[], text: string): void {
  try {
    const payload: PartialStream = { conversationId, messages, text, updatedAt: Date.now() };
    localStorage.setItem(PARTIAL_KEY, JSON.stringify(payload));
  } catch { /* best-effort */ }
}

export function loadPartialStream(): PartialStream | null {
  try {
    const raw = localStorage.getItem(PARTIAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartialStream;
    if (!parsed?.conversationId || !Array.isArray(parsed.messages)) return null;
    if (Date.now() - parsed.updatedAt > 30 * 60 * 1000) return null; // 30 min TTL
    return parsed;
  } catch {
    return null;
  }
}

export function clearPartialStream(): void {
  try { localStorage.removeItem(PARTIAL_KEY); } catch { /* ignore */ }
}

/* ─── Local "pins" — saved assistant replies, separate from Favorites ─ */

const PIN_KEY = "noor_companion_pins_v1";

export type PinnedReply = { id: string; text: string; savedAt: number };

export function addPin(text: string): PinnedReply {
  const entry: PinnedReply = { id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text, savedAt: Date.now() };
  try {
    const arr = listPins();
    arr.unshift(entry);
    localStorage.setItem(PIN_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch { /* ignore */ }
  return entry;
}

export function listPins(): PinnedReply[] {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    const arr = raw ? (JSON.parse(raw) as PinnedReply[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function removePin(id: string): void {
  try {
    const arr = listPins().filter((p) => p.id !== id);
    localStorage.setItem(PIN_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}
