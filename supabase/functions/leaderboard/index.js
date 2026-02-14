import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 60;
const MAX_SCORE = 1_000_000;
const MAX_SECTION_ITEMS = 64;
const MAX_DAY_SKEW = 3;
const MAX_GENERATED_AT_SKEW_MS = 36 * 60 * 60 * 1000;
const MAX_EVENTS_PER_USER_PER_DAY = 2000;
const limiter = new Map();

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
  const userId = String(payload?.identity?.id ?? "");
  const sectionEntries = Object.entries(payload.scores.sections ?? {})
    .slice(0, MAX_SECTION_ITEMS)
    .map(([k, v]) => [k, clampInt(v)]);

  return {
    ...payload,
    identity: {
      ...payload.identity,
      alias: canonicalAliasFromUserId(userId)
    },
    scores: {
      global: clampInt(payload.scores.global),
      dhikr: clampInt(payload.scores.dhikr),
      quran: clampInt(payload.scores.quran),
      prayers: clampInt(payload.scores.prayers),
      tasbeehDaily: clampInt(payload.scores.tasbeehDaily),
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

function eventRows(payload) {
  const base = {
    generated_at: payload.generatedAt,
    day: payload.day,
    user_id: payload.identity.id,
    alias: payload.identity.alias,
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

function aggregateRows(input) {
  const map = new Map();
  for (const r of input) {
    const key = `${r.user_id}::${r.section_id ?? ""}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { userId: r.user_id, alias: r.alias, score: clampInt(r.score), sectionId: r.section_id });
      continue;
    }
    prev.score += clampInt(r.score);
    map.set(key, prev);
  }
  return [...map.values()];
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

    const payload = sanitizePayload(body);
    const validation = validatePayload(payload);
    if (!validation.ok) return json({ ok: false, error: validation.reason }, 400);

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

    const rows = eventRows(payload);
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

      const grouped = aggregateRows(eventsRes.data ?? []);
      const rollupRows = grouped.map((g) => ({
        day: payload.day,
        period: "daily",
        board,
        section_id: board === "section" ? g.sectionId : null,
        user_id: g.userId,
        alias: g.alias,
        score: g.score,
        updated_at: new Date().toISOString()
      }));

      if (rollupRows.length === 0) continue;
      await db
        .from("leaderboard_rollups")
        .upsert(rollupRows, { onConflict: "day,period,board,section_id,user_id" });
    }

    return json({ ok: true });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
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

    const grouped = aggregateRows(rowsRes.data ?? [])
      .map((r) => ({
        id: r.userId,
        name: canonicalAliasFromUserId(r.userId),
        board,
        score: r.score,
        day,
        sectionId: r.sectionId ?? undefined
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    return json({ rows: grouped });
  }

  return json({ ok: false, error: "method-not-allowed" }, 405);
});
