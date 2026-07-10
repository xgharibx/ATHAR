/**
 * Companion chat history — local-first, per-device (this app has no login
 * system anywhere; "per user" here means per device, same as every other
 * store in Athar). Stored in IndexedDB via Dexie, matching hadithIDB.ts.
 */
import Dexie, { type Table } from "dexie";
import type { CompanionMessage } from "@/lib/companionAI";

export interface CompanionConversation {
  id: string;
  title: string;
  messages: CompanionMessage[];
  createdAt: number;
  updatedAt: number;
}

class CompanionDexie extends Dexie {
  conversations!: Table<CompanionConversation, string>;

  constructor() {
    super("athar-companion-v1");
    this.version(1).stores({ conversations: "id, updatedAt" });
  }
}

let _db: CompanionDexie | null = null;
function getDB(): CompanionDexie {
  if (!_db) _db = new CompanionDexie();
  return _db;
}

/** Most-recently-updated first. */
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
    // Autosave failure is non-fatal — the chat stays usable in memory.
  }
}

export async function renameConversation(id: string, title: string): Promise<void> {
  try {
    await getDB().conversations.update(id, { title, updatedAt: Date.now() });
  } catch {
    // non-fatal
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await getDB().conversations.delete(id);
  } catch {
    // non-fatal
  }
}

export function newConversationId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Derive a short title from the first user message. */
export function titleFromMessages(messages: CompanionMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const t = firstUser?.content.trim().replace(/\s+/g, " ") ?? "";
  if (!t) return "محادثة جديدة";
  return t.length > 40 ? t.slice(0, 40) + "…" : t;
}
