import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-leaderboard-admin-token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 60;
const MAX_SCORE = 1_000_000;
const MAX_SECTION_ITEMS = 64;
const MAX_DAY_SKEW = 3;
const MAX_GENERATED_AT_SKEW_MS = 36 * 60 * 60 * 1000;
const MAX_EVENTS_PER_USER_PER_DAY = 2000;
const MAX_ALIAS_LENGTH = 40;
const limiter = new Map();
const blocklistCache = { loadedAt: 0, rows: [] };
const BLOCKLIST_CACHE_MS = 60_000;

const INVISIBLE_ALIAS_CHARS_RE = /[\u200B-\u200F\u2060\uFEFF]/g;
const MULTI_SPACE_RE = /\s+/g;
const ALIAS_ALLOWED_RE = /^[\p{L}\p{N} _.-]+$/u;
const RESERVED_ALIAS_PATTERNS = [
  /^admin$/iu,
  /^administrator$/iu,
  /^support$/iu,
  /^moderator$/iu,
  /^mod$/iu,
  /^owner$/iu,
  /^system$/iu,
  /^athar$/iu,
  /^أثر$/u,
  /^الادارة$/u,
  /^الإدارة$/u,
  /^مشرف$/u,
  /^الدعم$/u
];

function hashString(input) {
  let h = 0;
  const s = String(input ?? "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function canonicalAliasFromUserId(userId) {
  const idx = (hashString(userId || "anon") % 9999) + 1;
  return `مستخدم ${idx}`;
}

function normalizeAliasInput(input) {
  return String(input ?? "")
    .replace(INVISIBLE_ALIAS_CHARS_RE, "")
    .replace(MULTI_SPACE_RE, " ")
    .trim()
    .slice(0, MAX_ALIAS_LENGTH);
}

function normalizeAliasKey(input) {
  return normalizeAliasInput(input).toLocaleLowerCase();
}

function cleanPlainText(input, max = 180) {
  return String(input ?? "").replace(INVISIBLE_ALIAS_CHARS_RE, "").replace(MULTI_SPACE_RE, " ").trim().slice(0, max);
}

function validateAliasInput(input) {
  const value = normalizeAliasInput(input);
  if (!value) return { ok: false, reason: "empty", value };
  if (value.length < 3) return { ok: false, reason: "too-short", value };
  if (/(https?:\/\/|www\.)/iu.test(value)) return { ok: false, reason: "link", value };
  if (!ALIAS_ALLOWED_RE.test(value)) return { ok: false, reason: "bad-chars", value };
  if (/(.)\1{5,}/u.test(value)) return { ok: false, reason: "spam", value };
  if (RESERVED_ALIAS_PATTERNS.some((re) => re.test(value))) return { ok: false, reason: "reserved", value };
  return { ok: true, value };
}

function isMissingRelationError(error) {
  return error?.code === "42P01" || String(error?.message ?? "").includes("does not exist");
}

async function readNameBlocklist(db) {
  if (Date.now() - blocklistCache.loadedAt < BLOCKLIST_CACHE_MS) {
    return blocklistCache.rows;
  }

  const res = await db
    .from("leaderboard_name_blocklist")
    .select("term,match_mode,is_active")
    .eq("is_active", true)
    .limit(500);

  if (res.error) {
    if (!isMissingRelationError(res.error)) {
      console.error("leaderboard_name_blocklist read failed", res.error);
    }
    return [];
  }

  blocklistCache.rows = Array.isArray(res.data) ? res.data : [];
  blocklistCache.loadedAt = Date.now();
  return blocklistCache.rows;
}

async function readUserModeration(db, userId) {
  const res = await db
    .from("leaderboard_user_moderation")
    .select("user_id,hidden,forced_alias,reason,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (res.error) {
    if (!isMissingRelationError(res.error)) {
      console.error("leaderboard_user_moderation read failed", res.error);
    }
    return null;
  }

  return res.data ?? null;
}

async function readUserModerationMap(db, userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return new Map();

  const res = await db
    .from("leaderboard_user_moderation")
    .select("user_id,hidden,forced_alias,reason,updated_at")
    .in("user_id", userIds);

  if (res.error) {
    if (!isMissingRelationError(res.error)) {
      console.error("leaderboard_user_moderation map read failed", res.error);
    }
    return new Map();
  }

  return new Map((res.data ?? []).map((row) => [row.user_id, row]));
}

function aliasBlockedByList(alias, rows) {
  const value = normalizeAliasInput(alias).toLocaleLowerCase();
  for (const row of rows ?? []) {
    const term = normalizeAliasInput(row?.term).toLocaleLowerCase();
    if (!term) continue;
    const mode = row?.match_mode === "exact" ? "exact" : "contains";
    if ((mode === "exact" && value === term) || (mode === "contains" && value.includes(term))) {
      return true;
    }
  }
  return false;
}

function publicAliasOrCanonical(userId, _alias, moderationRow, _blocklistRows) {
  const canonical = canonicalAliasFromUserId(userId);

  if (moderationRow?.forced_alias) {
    const forced = normalizeAliasInput(moderationRow.forced_alias);
    return forced || canonical;
  }

  return canonical;
}

async function claimAliasForUser(db, userId, alias) {
  const aliasDisplay = normalizeAliasInput(alias);
  const aliasNormalized = normalizeAliasKey(aliasDisplay);
  if (!aliasNormalized) return { ok: false, reason: "empty" };

  const existingRes = await db
    .from("leaderboard_alias_registry")
    .select("user_id")
    .eq("alias_normalized", aliasNormalized)
    .maybeSingle();

  if (existingRes.error) {
    if (isMissingRelationError(existingRes.error)) {
      return { ok: true };
    }
    console.error("leaderboard_alias_registry read failed", existingRes.error);
    return { ok: true };
  }

  if (existingRes.data?.user_id && existingRes.data.user_id !== userId) {
    return { ok: false, reason: "duplicate" };
  }

  const upsertRes = await db
    .from("leaderboard_alias_registry")
    .upsert(
      {
        user_id: userId,
        alias_normalized: aliasNormalized,
        alias_display: aliasDisplay,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (upsertRes.error) {
    if (upsertRes.error.code === "23505") {
      return { ok: false, reason: "duplicate" };
    }
    if (!isMissingRelationError(upsertRes.error)) {
      console.error("leaderboard_alias_registry upsert failed", upsertRes.error);
    }
  }

  return { ok: true };
}

async function releaseAliasClaimForUser(db, userId) {
  const res = await db.from("leaderboard_alias_registry").delete().eq("user_id", userId);
  if (res.error && !isMissingRelationError(res.error)) {
    console.error("leaderboard_alias_registry delete failed", res.error);
  }
}

async function resolveAliasDecision(db, userId, _requestedAlias) {
  const canonical = canonicalAliasFromUserId(userId);
  const moderationRow = await readUserModeration(db, userId);

  if (moderationRow?.hidden) {
    return { alias: publicAliasOrCanonical(userId, canonical, moderationRow, []), hidden: true, status: "hidden", reason: moderationRow.reason ?? "hidden" };
  }

  if (moderationRow?.forced_alias) {
    const forcedAlias = publicAliasOrCanonical(userId, canonical, moderationRow, []);
    const forcedClaim = await claimAliasForUser(db, userId, forcedAlias);
    if (!forcedClaim.ok) {
      return { alias: canonical, hidden: false, status: "duplicate", reason: forcedClaim.reason };
    }
    return { alias: forcedAlias, hidden: false, status: "forced", reason: moderationRow.reason ?? "forced-alias" };
  }

  await releaseAliasClaimForUser(db, userId);
  return { alias: canonical, hidden: false, status: "canonical", reason: null };
}

async function auditAliasDecision(db, input) {
  const res = await db.from("leaderboard_alias_audit").insert(input);
  if (res.error && !isMissingRelationError(res.error)) {
    console.error("leaderboard_alias_audit insert failed", res.error);
  }
}

function readAdminToken(req) {
  const header = req.headers.get("x-leaderboard-admin-token")?.trim();
  if (header) return header;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (/^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  return "";
}

function requireAdmin(req, denoEnv) {
  const expected = denoEnv.get("LEADERBOARD_ADMIN_TOKEN") ?? "";
  if (!expected) return { ok: false, status: 500, error: "admin-secret-missing" };
  const got = readAdminToken(req);
  if (!got || got !== expected) return { ok: false, status: 401, error: "forbidden" };
  return { ok: true };
}

async function readBlocklistSnapshot(db) {
  const res = await db
    .from("leaderboard_name_blocklist")
    .select("id,term,match_mode,is_active,note,created_at")
    .order("id", { ascending: false })
    .limit(100);

  if (res.error) {
    if (!isMissingRelationError(res.error)) {
      console.error("leaderboard_name_blocklist snapshot failed", res.error);
    }
    return [];
  }

  return (res.data ?? []).map((row) => ({
    id: row.id,
    term: row.term,
    matchMode: row.match_mode === "exact" ? "exact" : "contains",
    isActive: row.is_active !== false,
    note: row.note ?? null,
    createdAt: row.created_at
  }));
}

async function readAliasAuditSnapshot(db, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const res = await db
    .from("leaderboard_alias_audit")
    .select("id,user_id,requested_alias,resolved_alias,status,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (res.error) {
    if (!isMissingRelationError(res.error)) {
      console.error("leaderboard_alias_audit snapshot failed", res.error);
    }
    return [];
  }

  return (res.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    requestedAlias: row.requested_alias ?? null,
    resolvedAlias: row.resolved_alias,
    status: row.status,
    reason: row.reason ?? null,
    createdAt: row.created_at
  }));
}

async function handleAdminGet(req, db, denoEnv) {
  const auth = requireAdmin(req, denoEnv);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "snapshot";

  if (view === "snapshot") {
    const auditLimit = url.searchParams.get("auditLimit") || "20";
    return json({
      ok: true,
      blocklist: await readBlocklistSnapshot(db),
      audits: await readAliasAuditSnapshot(db, auditLimit)
    });
  }

  if (view === "user") {
    const userId = cleanPlainText(url.searchParams.get("userId"), 120);
    if (!userId) return json({ ok: false, error: "missing-userId" }, 400);

    const moderation = await readUserModeration(db, userId);
    return json({
      ok: true,
      userModeration: moderation
        ? {
            userId: moderation.user_id,
            hidden: moderation.hidden === true,
            forcedAlias: moderation.forced_alias ?? null,
            reason: moderation.reason ?? null,
            updatedAt: moderation.updated_at ?? null
          }
        : null
    });
  }

  return json({ ok: false, error: "unknown-admin-view" }, 400);
}

async function handleAdminPost(req, db, denoEnv, body) {
  const auth = requireAdmin(req, denoEnv);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const action = String(body?.adminAction ?? "").trim();
  if (!action) return json({ ok: false, error: "missing-admin-action" }, 400);

  if (action === "upsertBlockTerm") {
    const term = cleanPlainText(body?.term, 80);
    const matchMode = body?.matchMode === "exact" ? "exact" : "contains";
    const note = cleanPlainText(body?.note, 180) || null;
    if (!term) return json({ ok: false, error: "missing-term" }, 400);

    const existing = await db
      .from("leaderboard_name_blocklist")
      .select("id")
      .eq("match_mode", matchMode)
      .ilike("term", term)
      .maybeSingle();

    if (existing.error && !isMissingRelationError(existing.error)) {
      return json({ ok: false, error: "blocklist-read-failed" }, 500);
    }

    if (existing.data?.id) {
      const updateRes = await db
        .from("leaderboard_name_blocklist")
        .update({ term, note, is_active: true })
        .eq("id", existing.data.id);
      if (updateRes.error) return json({ ok: false, error: "blocklist-update-failed" }, 500);
    } else {
      const insertRes = await db
        .from("leaderboard_name_blocklist")
        .insert({ term, match_mode: matchMode, note, is_active: true });
      if (insertRes.error) return json({ ok: false, error: "blocklist-insert-failed" }, 500);
    }

    blocklistCache.loadedAt = 0;
    return json({ ok: true });
  }

  if (action === "deleteBlockTerm") {
    const id = Number(body?.id ?? 0);
    if (!Number.isFinite(id) || id <= 0) return json({ ok: false, error: "bad-id" }, 400);
    const delRes = await db.from("leaderboard_name_blocklist").delete().eq("id", id);
    if (delRes.error) return json({ ok: false, error: "blocklist-delete-failed" }, 500);
    blocklistCache.loadedAt = 0;
    return json({ ok: true });
  }

  if (action === "setUserModeration") {
    const userId = cleanPlainText(body?.userId, 120);
    const hidden = body?.hidden === true;
    const forcedAlias = cleanPlainText(body?.forcedAlias, MAX_ALIAS_LENGTH) || null;
    const reason = cleanPlainText(body?.reason, 180) || null;
    if (!userId) return json({ ok: false, error: "missing-userId" }, 400);

    if (forcedAlias) {
      const validation = validateAliasInput(forcedAlias);
      if (!validation.ok) return json({ ok: false, error: `bad-forced-alias:${validation.reason}` }, 400);
      const blocklistRows = await readNameBlocklist(db);
      if (aliasBlockedByList(validation.value, blocklistRows)) {
        return json({ ok: false, error: "forced-alias-blocked" }, 400);
      }
      const claim = await claimAliasForUser(db, userId, validation.value);
      if (!claim.ok) return json({ ok: false, error: "duplicate-alias" }, 409);
    }

    const shouldDelete = !hidden && !forcedAlias && !reason;
    if (shouldDelete) {
      const delRes = await db.from("leaderboard_user_moderation").delete().eq("user_id", userId);
      if (delRes.error) return json({ ok: false, error: "user-moderation-delete-failed" }, 500);
      return json({ ok: true, userModeration: null });
    }

    const upsertRes = await db
      .from("leaderboard_user_moderation")
      .upsert(
        {
          user_id: userId,
          hidden,
          forced_alias: forcedAlias,
          reason,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    if (upsertRes.error) return json({ ok: false, error: "user-moderation-upsert-failed" }, 500);

    return json({
      ok: true,
      userModeration: {
        userId,
        hidden,
        forcedAlias,
        reason,
        updatedAt: new Date().toISOString()
      }
    });
  }

  if (action === "clearUserModeration") {
    const userId = cleanPlainText(body?.userId, 120);
    const releaseAliasClaim = body?.releaseAliasClaim === true;
    if (!userId) return json({ ok: false, error: "missing-userId" }, 400);

    const delRes = await db.from("leaderboard_user_moderation").delete().eq("user_id", userId);
    if (delRes.error) return json({ ok: false, error: "user-moderation-delete-failed" }, 500);
    if (releaseAliasClaim) {
      await releaseAliasClaimForUser(db, userId);
    }
    return json({ ok: true, userModeration: null });
  }

  if (action === "resetLeaderboardScores") {
    const deleteEvents = await db.from("leaderboard_score_events").delete().not("day", "is", null);
    if (deleteEvents.error) return json({ ok: false, error: "score-events-reset-failed" }, 500);

    const deleteRollups = await db.from("leaderboard_rollups").delete().not("day", "is", null);
    if (deleteRollups.error) return json({ ok: false, error: "rollups-reset-failed" }, 500);

    return json({ ok: true, reset: { scope: "all-scores" } });
  }

  return json({ ok: false, error: "unknown-admin-action" }, 400);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

function clampInt(n, max = MAX_SCORE) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.floor(v)));
}

function validDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function dayDiff(day) {
  const [y, m, d] = day.split("-").map(Number);
  const a = new Date(y, m - 1, d);
  const b = new Date();
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / ms);
}

function sanitizePayload(payload) {
  const rawScores = payload?.scores ?? {};
  const sectionEntries = Object.entries(rawScores.sections ?? {})
    .slice(0, MAX_SECTION_ITEMS)
    .map(([k, v]) => [k, clampInt(v)]);

  return {
    ...payload,
    identity: {
      ...payload.identity,
      alias: normalizeAliasInput(payload?.identity?.alias)
    },
    scores: {
      global: clampInt(rawScores.global),
      dhikr: clampInt(rawScores.dhikr),
      quran: clampInt(rawScores.quran),
      prayers: clampInt(rawScores.prayers),
      tasbeehDaily: clampInt(rawScores.tasbeehDaily),
      sections: Object.fromEntries(sectionEntries)
    }
  };
}

function validatePayload(payload) {
  if (!payload || payload.v !== 1) return { ok: false, reason: "bad-version" };
  if (!payload.identity?.id || !payload.identity?.fingerprint) return { ok: false, reason: "bad-identity" };
  if (!validDay(payload.day)) return { ok: false, reason: "bad-day" };
  if (Math.abs(dayDiff(payload.day)) > MAX_DAY_SKEW) return { ok: false, reason: "day-skew" };
  if (!payload.generatedAt || Number.isNaN(Date.parse(payload.generatedAt))) return { ok: false, reason: "bad-generatedAt" };
  if (Math.abs(Date.now() - Date.parse(payload.generatedAt)) > MAX_GENERATED_AT_SKEW_MS) {
    return { ok: false, reason: "generatedAt-skew" };
  }
  if (!payload.checksum || !/^[a-f0-9]{64}$/i.test(String(payload.checksum))) {
    return { ok: false, reason: "bad-checksum" };
  }
  return { ok: true };
}

function readClientKey(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  return ip || cf || real || "unknown";
}

function rateLimit(req) {
  const key = readClientKey(req);
  const now = Date.now();
  const prev = limiter.get(key);
  if (!prev || now - prev.startAt > WINDOW_MS) {
    limiter.set(key, { count: 1, startAt: now });
    return true;
  }
  if (prev.count >= MAX_REQ_PER_WINDOW) return false;
  prev.count += 1;
  limiter.set(key, prev);
  return true;
}

function parsePeriod(input) {
  if (input === "weekly" || input === "monthly" || input === "yearly") return input;
  return "daily";
}

function parseBoard(input) {
  if (input === "dhikr" || input === "quran" || input === "prayers" || input === "section" || input === "tasbeeh_daily") return input;
  return "global";
}

function dateOnly(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function periodRange(anchorISO, period) {
  const anchor = new Date(anchorISO);
  const end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const start = new Date(end);

  if (period === "daily") return { from: dateOnly(end), to: dateOnly(end) };
  if (period === "weekly") {
    start.setDate(end.getDate() - 6);
    return { from: dateOnly(start), to: dateOnly(end) };
  }
  if (period === "monthly") {
    const first = new Date(end.getFullYear(), end.getMonth(), 1);
    return { from: dateOnly(first), to: dateOnly(end) };
  }
  const first = new Date(end.getFullYear(), 0, 1);
  return { from: dateOnly(first), to: dateOnly(end) };
}

function eventRows(payload, resolvedAlias) {
  const base = {
    generated_at: payload.generatedAt,
    day: payload.day,
    user_id: payload.identity.id,
    alias: resolvedAlias,
    fingerprint: payload.identity.fingerprint,
    checksum: payload.checksum,
    period: "daily",
    source: "edge_function_v1",
    payload
  };

  const rows = [
    { ...base, board: "global", section_id: null, score: payload.scores.global },
    { ...base, board: "dhikr", section_id: null, score: payload.scores.dhikr },
    { ...base, board: "quran", section_id: null, score: payload.scores.quran },
    { ...base, board: "prayers", section_id: null, score: payload.scores.prayers },
    { ...base, board: "tasbeeh_daily", section_id: null, score: payload.scores.tasbeehDaily }
  ];

  for (const [sectionId, score] of Object.entries(payload.scores.sections ?? {})) {
    rows.push({ ...base, board: "section", section_id: sectionId, score: clampInt(score) });
  }

  return rows;
}

function aggregateRows(input, strategy = "sum") {
  const map = new Map();
  for (const r of input) {
    const key = `${r.user_id}::${r.section_id ?? ""}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { userId: r.user_id, alias: r.alias, score: clampInt(r.score), sectionId: r.section_id });
      continue;
    }
    prev.alias = String(r.alias ?? prev.alias ?? "");
    if (strategy === "max") {
      prev.score = Math.max(prev.score, clampInt(r.score));
    } else {
      prev.score += clampInt(r.score);
    }
    map.set(key, prev);
  }
  return [...map.values()];
}

function scoreSignature(scores) {
  const sections = Object.entries(scores?.sections ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sectionId, score]) => [sectionId, clampInt(score)]);

  return JSON.stringify({
    global: clampInt(scores?.global),
    dhikr: clampInt(scores?.dhikr),
    quran: clampInt(scores?.quran),
    prayers: clampInt(scores?.prayers),
    tasbeehDaily: clampInt(scores?.tasbeehDaily),
    sections
  });
}

function aggregateRollupRows(input) {
  const byDay = new Map();

  for (const row of input) {
    const dayKey = `${row.day}::${row.user_id}::${row.section_id ?? ""}`;
    const prev = byDay.get(dayKey);
    if (!prev) {
      byDay.set(dayKey, {
        user_id: row.user_id,
        alias: row.alias,
        section_id: row.section_id,
        score: clampInt(row.score)
      });
      continue;
    }

    prev.alias = String(row.alias ?? prev.alias ?? "");
    prev.score = Math.max(prev.score, clampInt(row.score));
    byDay.set(dayKey, prev);
  }

  return aggregateRows([...byDay.values()], "sum");
}

const denoRuntime = globalThis.Deno;

if (!denoRuntime?.serve || !denoRuntime?.env?.get) {
  throw new Error("Deno runtime is required for this function");
}

denoRuntime.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (!rateLimit(req)) return json({ ok: false, error: "rate-limited" }, 429);

  const supabaseUrl = denoRuntime.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = denoRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "missing-env" }, 500);

  const db = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "invalid-json" }, 400);
    }

    if (body?.adminAction) {
      return await handleAdminPost(req, db, denoRuntime.env, body);
    }

    const payload = sanitizePayload(body);
    const validation = validatePayload(payload);
    if (!validation.ok) return json({ ok: false, error: validation.reason }, 400);

    const aliasDecision = await resolveAliasDecision(db, payload.identity.id, payload.identity.alias);
    await auditAliasDecision(db, {
      user_id: payload.identity.id,
      requested_alias: normalizeAliasInput(payload.identity.alias),
      resolved_alias: aliasDecision.alias,
      status: aliasDecision.status,
      reason: aliasDecision.reason
    });

    if (aliasDecision.hidden) {
      return json({ ok: true, hidden: true, alias: aliasDecision.alias, aliasStatus: aliasDecision.status });
    }

    const incomingScoreSignature = scoreSignature(payload.scores);

    const lastSnapshotRes = await db
      .from("leaderboard_score_events")
      .select("payload")
      .eq("day", payload.day)
      .eq("user_id", payload.identity.id)
      .eq("board", "global")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastSnapshotRes.error && lastSnapshotRes.data?.payload?.scores) {
      const previousScoreSignature = scoreSignature(lastSnapshotRes.data.payload.scores);
      if (previousScoreSignature === incomingScoreSignature) {
        return json({ ok: true, deduped: true, alias: aliasDecision.alias, aliasStatus: aliasDecision.status, hidden: false });
      }
    }

    const duplicateRes = await db
      .from("leaderboard_score_events")
      .select("id")
      .eq("day", payload.day)
      .eq("user_id", payload.identity.id)
      .eq("checksum", payload.checksum)
      .limit(1);

    if (!duplicateRes.error && (duplicateRes.data?.length ?? 0) > 0) {
      return json({ ok: true, deduped: true });
    }

    const dayCountRes = await db
      .from("leaderboard_score_events")
      .select("id", { count: "exact", head: true })
      .eq("day", payload.day)
      .eq("user_id", payload.identity.id);

    if (!dayCountRes.error && (dayCountRes.count ?? 0) > MAX_EVENTS_PER_USER_PER_DAY) {
      return json({ ok: false, error: "daily-limit" }, 429);
    }

    const rows = eventRows(payload, aliasDecision.alias);
    const insertEvents = await db.from("leaderboard_score_events").insert(rows);
    if (insertEvents.error) return json({ ok: false, error: "event-insert-failed" }, 500);

    const boardSet = new Set(["global", "dhikr", "quran", "prayers", "tasbeeh_daily", "section"]);

    for (const board of boardSet) {
      const query = db
        .from("leaderboard_score_events")
        .select("user_id,alias,score,section_id")
        .eq("day", payload.day)
        .eq("board", board);

      const selected = board === "section" ? query : query.is("section_id", null);
      const eventsRes = await selected;
      if (eventsRes.error) continue;

      const grouped = aggregateRows(eventsRes.data ?? [], "max");
      const rollupRows = grouped.map((g) => ({
        day: payload.day,
        period: "daily",
        board,
        section_id: board === "section" ? g.sectionId : null,
        user_id: g.userId,
        alias: publicAliasOrCanonical(g.userId, g.alias, null, []),
        score: g.score,
        updated_at: new Date().toISOString()
      }));

      const rollupDelete = board === "section"
        ? await db
            .from("leaderboard_rollups")
            .delete()
            .eq("day", payload.day)
            .eq("period", "daily")
            .eq("board", board)
            .not("section_id", "is", null)
        : await db
            .from("leaderboard_rollups")
            .delete()
            .eq("day", payload.day)
            .eq("period", "daily")
            .eq("board", board)
            .is("section_id", null);

      if (rollupDelete.error) return json({ ok: false, error: "rollup-delete-failed" }, 500);
      if (rollupRows.length === 0) continue;

      const rollupInsert = await db.from("leaderboard_rollups").insert(rollupRows);
      if (rollupInsert.error) return json({ ok: false, error: "rollup-insert-failed" }, 500);
    }

    return json({ ok: true, alias: aliasDecision.alias, aliasStatus: aliasDecision.status, hidden: false });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("admin") === "1") {
      return await handleAdminGet(req, db, denoRuntime.env);
    }

    const board = parseBoard(url.searchParams.get("board"));
    const period = parsePeriod(url.searchParams.get("period"));
    const sectionId = url.searchParams.get("sectionId");
    const day = url.searchParams.get("day") || dateOnly(new Date());
    if (!validDay(day)) return json({ ok: false, error: "bad-day" }, 400);

    const { from, to } = periodRange(day, period);

    let query = db
      .from("leaderboard_rollups")
      .select("day,board,section_id,user_id,alias,score")
      .gte("day", from)
      .lte("day", to)
      .eq("period", "daily")
      .eq("board", board);

    if (board === "section") {
      if (!sectionId) return json({ ok: false, error: "missing-sectionId" }, 400);
      query = query.eq("section_id", sectionId);
    } else {
      query = query.is("section_id", null);
    }

    const rowsRes = await query;
    if (rowsRes.error) return json({ ok: false, error: "read-failed" }, 500);

    const moderationMap = await readUserModerationMap(
      db,
      [...new Set((rowsRes.data ?? []).map((row) => row.user_id).filter(Boolean))]
    );
    const blocklistRows = await readNameBlocklist(db);

    const grouped = aggregateRollupRows(rowsRes.data ?? [])
      .map((r) => ({
        id: r.userId,
        name: publicAliasOrCanonical(r.userId, r.alias, moderationMap.get(r.userId) ?? null, blocklistRows),
        board,
        score: r.score,
        day,
        sectionId: r.sectionId ?? undefined
      }))
      .filter((row) => !(moderationMap.get(row.id)?.hidden))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    return json({ rows: grouped });
  }

  return json({ ok: false, error: "method-not-allowed" }, 405);
});
