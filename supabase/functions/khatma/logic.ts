/** Pure helpers for the shared group khatma (no I/O), tested on their own. */

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const MAX_MEMBERS = 30;
export const JUZ_COUNT = 30;

const INVISIBLE = /[​-‏⁠﻿]/g;

/** A display name: trimmed, single spaces, no invisible marks, at most `max` characters. */
export function cleanName(input: unknown, max = 40): string | null {
  if (typeof input !== "string") return null;
  const name = input.replace(INVISIBLE, "").replace(/\s+/g, " ").trim().slice(0, max);
  if (!name || !/^[\p{L}\p{N}\p{M} _.'()\-]+$/u.test(name)) return null;
  return name;
}

export function isCode(input: unknown): input is string {
  return typeof input === "string" && /^[A-HJ-NP-Z2-9]{8}$/.test(input);
}

/** Codes are typed by hand: accept lower case, spaces and dashes. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return isCode(code) ? code : null;
}

export function isToken(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{64}$/.test(input);
}

export function isJuz(input: unknown): input is number {
  return Number.isInteger(input) && (input as number) >= 1 && (input as number) <= JUZ_COUNT;
}

export function makeCode(randomBytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[randomBytes[i]! % CODE_ALPHABET.length];
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type KhatmaRow = { id: string; code: string; name: string; round: number; created_at: string; completed_at: string | null };
export type MemberRow = { id: string; name: string };
export type PartRow = { juz: number; member_id: string | null; guest_name: string | null; done_at: string | null };

export type KhatmaView = {
  code: string;
  name: string;
  round: number;
  createdAt: string;
  completedAt: string | null;
  members: Array<{ id: string; name: string; juz: number[]; done: number }>;
  parts: Array<{ juz: number; holder: string | null; memberId: string | null; guest: boolean; done: boolean }>;
  done: number;
  you: { memberId: string | null; isOwner: boolean };
};

/** What every member sees. Keys never leave the server; member ids are opaque. */
export function viewOf(k: KhatmaRow, members: MemberRow[], parts: PartRow[], you: KhatmaView["you"]): KhatmaView {
  const byId = new Map(members.map((m) => [m.id, m]));
  const sorted = [...parts].sort((a, b) => a.juz - b.juz);
  const view = sorted.map((p) => {
    const member = p.member_id ? byId.get(p.member_id) : undefined;
    return {
      juz: p.juz,
      holder: member?.name ?? p.guest_name ?? null,
      memberId: member ? member.id : null,
      guest: !member && Boolean(p.guest_name),
      done: Boolean(p.done_at),
    };
  });
  return {
    code: k.code,
    name: k.name,
    round: k.round,
    createdAt: k.created_at,
    completedAt: k.completed_at,
    members: members.map((m) => {
      const mine = view.filter((p) => p.memberId === m.id);
      return { id: m.id, name: m.name, juz: mine.map((p) => p.juz), done: mine.filter((p) => p.done).length };
    }),
    parts: view,
    done: view.filter((p) => p.done).length,
    you,
  };
}

export type Action =
  | { action: "create"; name: string; memberName: string }
  | { action: "join"; code: string; name: string }
  | { action: "claim" | "release"; code: string; juz: number }
  | { action: "done"; code: string; juz: number; done: boolean }
  | { action: "assign"; code: string; juz: number; memberId: string | null; guestName: string | null }
  | { action: "newRound" | "delete" | "leave"; code: string }
  | { action: "rename"; code: string; name: string };

/** Validate a request body; null when it is not one we accept. */
export function parseAction(body: unknown): Action | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const code = normalizeCode(b.code);
  switch (b.action) {
    case "create": {
      const name = cleanName(b.name, 60);
      const memberName = cleanName(b.memberName);
      return name && memberName ? { action: "create", name, memberName } : null;
    }
    case "join": {
      const name = cleanName(b.name);
      return code && name ? { action: "join", code, name } : null;
    }
    case "claim":
    case "release":
      return code && isJuz(b.juz) ? { action: b.action, code, juz: b.juz } : null;
    case "done":
      return code && isJuz(b.juz) && typeof b.done === "boolean" ? { action: "done", code, juz: b.juz, done: b.done } : null;
    case "assign": {
      if (!code || !isJuz(b.juz)) return null;
      const memberId = typeof b.memberId === "string" && /^[0-9a-f-]{36}$/.test(b.memberId) ? b.memberId : null;
      const guestName = b.guestName == null ? null : cleanName(b.guestName);
      if (b.guestName != null && !guestName) return null;
      if (memberId && guestName) return null;
      return { action: "assign", code, juz: b.juz, memberId, guestName };
    }
    case "rename": {
      const name = cleanName(b.name, 60);
      return code && name ? { action: "rename", code, name } : null;
    }
    case "newRound":
    case "delete":
    case "leave":
      return code ? { action: b.action, code } : null;
    default:
      return null;
  }
}
