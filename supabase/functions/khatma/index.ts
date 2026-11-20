/**
 * `khatma` — the shared group khatma.
 *
 *   GET  ?code=XXXXXXXX                 the khatma as everyone sees it
 *   POST { action, code?, … }           create | join | claim | release | done |
 *                                       assign | rename | newRound | leave | delete
 *
 * A member is recognised by the key their phone got on joining
 * (`x-khatma-member`), the owner by the key returned on creating it
 * (`x-khatma-owner`). Only SHA-256 hashes of the keys are stored. A member
 * may take a free juz, give it back, and tick their own; the owner may also
 * give a juz to anyone (or to a name, for someone reading without the app),
 * tick a name's juz, rename, start a new round, or delete the khatma.
 */
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { readTrustedClientIp } from "../leaderboard/clientIp.ts";
import {
  JUZ_COUNT,
  MAX_MEMBERS,
  isToken,
  makeCode,
  normalizeCode,
  parseAction,
  toHex,
  viewOf,
  type KhatmaRow,
  type MemberRow,
  type PartRow,
} from "./logic.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-khatma-member, x-khatma-owner",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
const MAX_BODY_BYTES = 4 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 600; // a flood breaker (one carrier NAT fronts many people)
const MAX_CREATES_PER_HOUR = 20;
const limiter = new Map<string, { at: number; n: number }>();
const creates = new Map<string, { at: number; n: number }>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
const fail = (status: number, error: string) => json({ error }, status);

function within(map: Map<string, { at: number; n: number }>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now - entry.at > windowMs) {
    if (map.size > 20_000) map.clear();
    map.set(key, { at: now, n: 1 });
    return true;
  }
  entry.n += 1;
  return entry.n <= max;
}

async function sha256(text: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}
const newToken = () => toHex(crypto.getRandomValues(new Uint8Array(32)));

// deno-lint-ignore no-explicit-any
type Db = any;

async function load(db: Db, code: string) {
  const { data, error } = await db
    .from("athar_group_khatmas")
    .select("id, code, name, round, created_at, completed_at, admin_token_hash")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as (KhatmaRow & { admin_token_hash: string }) | null;
}

async function membersOf(db: Db, khatmaId: string): Promise<Array<MemberRow & { token_hash: string }>> {
  const { data, error } = await db
    .from("athar_group_khatma_members")
    .select("id, name, token_hash")
    .eq("khatma_id", khatmaId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function partsOf(db: Db, khatmaId: string): Promise<PartRow[]> {
  const { data, error } = await db
    .from("athar_group_khatma_parts")
    .select("juz, member_id, guest_name, done_at")
    .eq("khatma_id", khatmaId);
  if (error) throw error;
  return data ?? [];
}

/** After a change: mark the khatma complete when all 30 are done (or not), and touch it. */
async function settle(db: Db, k: KhatmaRow) {
  const parts = await partsOf(db, k.id);
  const complete = parts.length === JUZ_COUNT && parts.every((p) => p.done_at);
  const completed_at = complete ? (k.completed_at ?? new Date().toISOString()) : null;
  await db.from("athar_group_khatmas").update({ completed_at, updated_at: new Date().toISOString() }).eq("id", k.id);
  return { ...k, completed_at };
}

async function respond(db: Db, k: KhatmaRow, memberId: string | null, isOwner: boolean, extra: Record<string, unknown> = {}) {
  const [members, parts] = await Promise.all([membersOf(db, k.id), partsOf(db, k.id)]);
  return json({
    khatma: viewOf(k, members.map(({ id, name }) => ({ id, name })), parts, { memberId, isOwner }),
    ...extra,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "GET" && req.method !== "POST") return fail(405, "method_not_allowed");

  const ip = readTrustedClientIp(req.headers);
  if (!within(limiter, ip, WINDOW_MS, MAX_REQ_PER_WINDOW)) return fail(429, "rate_limited");

  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const memberHeader = req.headers.get("x-khatma-member") ?? "";
  const ownerHeader = req.headers.get("x-khatma-owner") ?? "";
  const memberHash = isToken(memberHeader) ? await sha256(memberHeader) : null;
  const ownerHash = isToken(ownerHeader) ? await sha256(ownerHeader) : null;

  try {
    if (req.method === "GET") {
      const code = normalizeCode(new URL(req.url).searchParams.get("code"));
      if (!code) return fail(400, "invalid_code");
      const k = await load(db, code);
      if (!k) return fail(404, "not_found");
      const members = await membersOf(db, k.id);
      const me = memberHash ? members.find((m) => m.token_hash === memberHash) : undefined;
      return respond(db, k, me?.id ?? null, ownerHash === k.admin_token_hash);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, "too_large");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(400, "invalid_json");
    }
    const action = parseAction(body);
    if (!action) return fail(400, "invalid_request");

    if (action.action === "create") {
      if (!within(creates, ip, 60 * 60_000, MAX_CREATES_PER_HOUR)) return fail(429, "rate_limited");
      const ownerToken = newToken();
      const memberToken = newToken();
      let row: KhatmaRow | null = null;
      for (let attempt = 0; attempt < 4 && !row; attempt++) {
        const code = makeCode(crypto.getRandomValues(new Uint8Array(8)));
        const { data, error } = await db
          .from("athar_group_khatmas")
          .insert({ code, name: action.name, admin_token_hash: await sha256(ownerToken) })
          .select("id, code, name, round, created_at, completed_at")
          .single();
        if (!error) row = data as KhatmaRow;
        else if (error.code !== "23505") throw error; // anything but a code clash
      }
      if (!row) return fail(503, "try_again");
      const parts = Array.from({ length: JUZ_COUNT }, (_, i) => ({ khatma_id: row!.id, juz: i + 1 }));
      const { error: partsError } = await db.from("athar_group_khatma_parts").insert(parts);
      if (partsError) throw partsError;
      const { data: member, error: memberError } = await db
        .from("athar_group_khatma_members")
        .insert({ khatma_id: row.id, name: action.memberName, token_hash: await sha256(memberToken) })
        .select("id")
        .single();
      if (memberError) throw memberError;
      if (Math.random() < 0.02) await db.rpc("athar_prune_group_khatmas").catch(() => {});
      return respond(db, row, member.id, true, { memberToken, ownerToken });
    }

    const k = await load(db, action.code);
    if (!k) return fail(404, "not_found");
    const isOwner = ownerHash === k.admin_token_hash;
    const members = await membersOf(db, k.id);
    const me = memberHash ? members.find((m) => m.token_hash === memberHash) : undefined;
    const now = new Date().toISOString();
    const parts = db.from("athar_group_khatma_parts");

    switch (action.action) {
      case "join": {
        if (me) return respond(db, k, me.id, isOwner);
        if (members.length >= MAX_MEMBERS) return fail(409, "full");
        const memberToken = newToken();
        const { data, error } = await db
          .from("athar_group_khatma_members")
          .insert({ khatma_id: k.id, name: action.name, token_hash: await sha256(memberToken) })
          .select("id")
          .single();
        if (error) throw error;
        await settle(db, k);
        return respond(db, k, data.id, isOwner, { memberToken });
      }
      case "claim": {
        if (!me) return fail(403, "not_member");
        const { data, error } = await parts
          .update({ member_id: me.id, guest_name: null, updated_at: now })
          .eq("khatma_id", k.id)
          .eq("juz", action.juz)
          .is("member_id", null)
          .is("guest_name", null)
          .select("juz");
        if (error) throw error;
        if (!data?.length) return fail(409, "taken");
        break;
      }
      case "release": {
        if (!me) return fail(403, "not_member");
        const { error } = await parts
          .update({ member_id: null, done_at: null, updated_at: now })
          .eq("khatma_id", k.id)
          .eq("juz", action.juz)
          .eq("member_id", me.id);
        if (error) throw error;
        break;
      }
      case "done": {
        // A member ticks their own juz; the owner may also tick a name's.
        let query = parts.update({ done_at: action.done ? now : null, updated_at: now }).eq("khatma_id", k.id).eq("juz", action.juz);
        if (me && !isOwner) query = query.eq("member_id", me.id);
        else if (!isOwner) return fail(403, "not_member");
        const { data, error } = await query.select("juz");
        if (error) throw error;
        if (!data?.length) return fail(409, "not_yours");
        break;
      }
      case "assign": {
        if (!isOwner) return fail(403, "not_owner");
        if (action.memberId && !members.some((m) => m.id === action.memberId)) return fail(400, "unknown_member");
        const { error } = await parts
          .update({ member_id: action.memberId, guest_name: action.guestName, done_at: null, updated_at: now })
          .eq("khatma_id", k.id)
          .eq("juz", action.juz);
        if (error) throw error;
        break;
      }
      case "rename": {
        if (!isOwner) return fail(403, "not_owner");
        const { error } = await db.from("athar_group_khatmas").update({ name: action.name }).eq("id", k.id);
        if (error) throw error;
        k.name = action.name;
        break;
      }
      case "newRound": {
        if (!isOwner) return fail(403, "not_owner");
        const { error } = await parts.update({ done_at: null, updated_at: now }).eq("khatma_id", k.id);
        if (error) throw error;
        await db.from("athar_group_khatmas").update({ round: k.round + 1 }).eq("id", k.id);
        k.round += 1;
        break;
      }
      case "leave": {
        if (!me) return fail(403, "not_member");
        await parts.update({ member_id: null, done_at: null, updated_at: now }).eq("khatma_id", k.id).eq("member_id", me.id);
        await db.from("athar_group_khatma_members").delete().eq("id", me.id);
        await settle(db, k);
        return json({ left: true });
      }
      case "delete": {
        if (!isOwner) return fail(403, "not_owner");
        const { error } = await db.from("athar_group_khatmas").delete().eq("id", k.id);
        if (error) throw error;
        return json({ deleted: true });
      }
    }
    const settled = await settle(db, k);
    return respond(db, settled, me?.id ?? null, isOwner);
  } catch (error) {
    console.error("khatma", error);
    return fail(500, "server_error");
  }
});
