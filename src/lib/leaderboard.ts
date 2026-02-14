export type LeaderboardBoard = "global" | "dhikr" | "quran" | "prayers" | "section" | "tasbeeh_daily";
export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type LeaderboardEntry = {
  id: string;
  name: string;
  board: LeaderboardBoard;
  score: number;
  day?: string;
  sectionId?: string;
  sectionTitle?: string;
  meta?: Record<string, number | string | boolean | null>;
};

export type LeaderboardIdentity = {
  id: string;
  alias: string;
  secret: string;
};

export type LeaderboardScoreBundle = {
  global: number;
  dhikr: number;
  quran: number;
  prayers: number;
  tasbeehDaily: number;
  sections: Record<string, number>;
};

export type LeaderboardSubmitPayload = {
  v: 1;
  generatedAt: string;
  day: string;
  identity: {
    id: string;
    alias: string;
    fingerprint: string;
  };
  scores: LeaderboardScoreBundle;
  checksum: string;
};

import {
  LEADERBOARD_POLICY,
  sanitizeBoardName,
  sanitizeScores,
  validateSubmitPayload
} from "@/lib/leaderboardPolicy";

const LB_SCHEMA_VERSION = "2";
const LB_SCHEMA_KEY = "noor_lb_schema_version";

const ID_KEY = "noor_lb_id_v2";
const ALIAS_KEY = "noor_lb_alias_v2";
const SECRET_KEY = "noor_lb_secret_v2";
const USER_INDEX_KEY = "noor_lb_user_index_v2";
const USER_COUNTER_KEY = "noor_lb_user_counter_v2";
const QUEUE_KEY = "noor_lb_queue_v2";
const HISTORY_KEY = "noor_lb_history_v2";

function getLeaderboardHeaders(includeContentType: boolean = true): Record<string, string> {
  const apiKey =
    (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    "";

  const headers: Record<string, string> = includeContentType
    ? { "Content-Type": "application/json" }
    : {};

  const isJwtLike = apiKey.split(".").length === 3;

  if (apiKey) {
    headers.apikey = apiKey;
    if (isJwtLike) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
  }

  return headers;
}

async function submitWithFallback(endpoint: string, item: LeaderboardSubmitPayload) {
  const primaryHeaders = getLeaderboardHeaders(true);
  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: primaryHeaders,
      body: JSON.stringify(item)
    });
  } catch {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(item)
    });
  }
}

type LocalHistoryRow = {
  day: string;
  id: string;
  alias: string;
  scores: LeaderboardScoreBundle;
};

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function normalizeScore(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function canonicalAliasFromId(id: string) {
  const idx = (hashString(String(id || "anon")) % 9999) + 1;
  return `مستخدم ${idx}`;
}

function normalizeAlias(alias: unknown, id: string) {
  const value = String(alias ?? "").trim();
  if (/^مستخدم\s+\d+$/i.test(value)) return value;
  return canonicalAliasFromId(id);
}

function ensureMigration() {
  try {
    const seen = localStorage.getItem(LB_SCHEMA_KEY);
    if (seen === LB_SCHEMA_VERSION) return;

    const keysToClear = [
      "noor_lb_id_v1",
      "noor_lb_alias_v1",
      "noor_lb_secret_v1",
      "noor_lb_queue_v1",
      "noor_device_id_v1",
      ID_KEY,
      ALIAS_KEY,
      SECRET_KEY,
      USER_INDEX_KEY,
      USER_COUNTER_KEY,
      QUEUE_KEY,
      HISTORY_KEY
    ];
    keysToClear.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(LB_SCHEMA_KEY, LB_SCHEMA_VERSION);
  } catch {
    // ignore storage migration failures
  }
}

function readHistory() {
  ensureMigration();
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as LocalHistoryRow[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-400) : [];
  } catch {
    return [];
  }
}

function writeHistory(rows: LocalHistoryRow[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(-400)));
  } catch {
    // ignore
  }
}

function rememberLocalRow(input: LocalHistoryRow) {
  const history = readHistory();
  const idx = history.findIndex((h) => h.day === input.day && h.id === input.id);
  if (idx >= 0) history[idx] = input;
  else history.push(input);
  writeHistory(history);
}

function parseISO(dateISO: string) {
  const m = (dateISO ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function inPeriod(day: string, period: LeaderboardPeriod, todayISO: string) {
  const dayDate = parseISO(day);
  const today = parseISO(todayISO);
  if (!dayDate || !today) return false;

  if (period === "daily") return day === todayISO;
  if (period === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return dayDate >= start && dayDate <= today;
  }
  if (period === "monthly") {
    return dayDate.getFullYear() === today.getFullYear() && dayDate.getMonth() === today.getMonth();
  }
  return dayDate.getFullYear() === today.getFullYear();
}

export function getLocalRowsFromHistory(opts: {
  identity: LeaderboardIdentity;
  board: LeaderboardBoard;
  period: LeaderboardPeriod;
  todayISO: string;
  sectionId?: string;
}) {
  const { identity, board, period, todayISO, sectionId } = opts;
  const history = readHistory().filter((h) => h.id === identity.id && inPeriod(h.day, period, todayISO));

  if (history.length === 0) {
    return [] as LeaderboardEntry[];
  }

  let score = 0;
  if (board === "global") {
    score = history.reduce((acc, h) => acc + normalizeScore(h.scores.global), 0);
  } else if (board === "dhikr") {
    score = history.reduce((acc, h) => acc + normalizeScore(h.scores.dhikr), 0);
  } else if (board === "quran") {
    score = history.reduce((acc, h) => acc + normalizeScore(h.scores.quran), 0);
  } else if (board === "prayers") {
    score = history.reduce((acc, h) => acc + normalizeScore(h.scores.prayers), 0);
  } else if (board === "tasbeeh_daily") {
    score = history.reduce((acc, h) => acc + normalizeScore(h.scores.tasbeehDaily), 0);
  } else {
    const sid = sectionId ?? "";
    score = history.reduce((acc, h) => acc + normalizeScore(h.scores.sections?.[sid] ?? 0), 0);
  }

  return [
    {
      id: identity.id,
      name: identity.alias,
      board,
      score,
      day: todayISO,
      sectionId
    }
  ];
}

export function getLeaderboardIdentity(): LeaderboardIdentity {
  ensureMigration();
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = randomId("anon");
      localStorage.setItem(ID_KEY, id);
    }

    let alias = localStorage.getItem(ALIAS_KEY);
    let userIndex = Number(localStorage.getItem(USER_INDEX_KEY) ?? "0");

    if (!Number.isFinite(userIndex) || userIndex <= 0) {
      const counter = Number(localStorage.getItem(USER_COUNTER_KEY) ?? "0");
      userIndex = Math.max(1, counter + 1);
      localStorage.setItem(USER_COUNTER_KEY, String(userIndex));
      localStorage.setItem(USER_INDEX_KEY, String(userIndex));
    }

    const canonicalAlias = canonicalAliasFromId(id);
    alias = normalizeAlias(alias, id);
    if (alias !== canonicalAlias) alias = canonicalAlias;
    localStorage.setItem(ALIAS_KEY, alias);

    let secret = localStorage.getItem(SECRET_KEY);
    if (!secret) {
      secret = randomId("sec");
      localStorage.setItem(SECRET_KEY, secret);
    }

    return { id, alias, secret };
  } catch {
    return {
      id: "anon_fallback",
      alias: "مستخدم 1",
      secret: "fallback_secret"
    };
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildSubmitPayload(day: string, scores: LeaderboardScoreBundle) {
  const identity = getLeaderboardIdentity();
  const alias = canonicalAliasFromId(identity.id);
  const cleanScores = sanitizeScores({
    global: normalizeScore(scores.global),
    dhikr: normalizeScore(scores.dhikr),
    quran: normalizeScore(scores.quran),
    prayers: normalizeScore(scores.prayers),
    tasbeehDaily: normalizeScore(scores.tasbeehDaily),
    sections: Object.fromEntries(
      Object.entries(scores.sections ?? {}).map(([k, v]) => [k, normalizeScore(v)])
    )
  });

  const generatedAt = new Date().toISOString();
  const fingerprint = await sha256(`${identity.id}|${identity.secret}`);
  const preChecksum = JSON.stringify({
    v: 1,
    generatedAt,
    day,
    identity: { id: identity.id, alias, fingerprint },
    scores: cleanScores
  });
  const checksum = await sha256(`${preChecksum}|${identity.secret}`);

  return {
    v: 1,
    generatedAt,
    day,
    identity: { id: identity.id, alias, fingerprint },
    scores: cleanScores,
    checksum
  } satisfies LeaderboardSubmitPayload;
}

function readQueue() {
  ensureMigration();
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LeaderboardSubmitPayload[]) : [];
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed
      .filter((item) => validateSubmitPayload(item).ok)
      .slice(-LEADERBOARD_POLICY.MAX_QUEUE_SIZE);

    if (cleaned.length !== parsed.length) {
      writeQueue(cleaned);
    }

    return cleaned;
  } catch {
    return [];
  }
}

function writeQueue(queue: LeaderboardSubmitPayload[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-LEADERBOARD_POLICY.MAX_QUEUE_SIZE)));
  } catch {
    // ignore
  }
}

export function enqueuePayload(payload: LeaderboardSubmitPayload) {
  const validation = validateSubmitPayload(payload);
  if (!validation.ok) return;

  const queue = readQueue();
  queue.push(payload);
  writeQueue(queue);

  rememberLocalRow({
    day: payload.day,
    id: payload.identity.id,
    alias: payload.identity.alias,
    scores: payload.scores
  });
}

function shouldRetryStatus(status: number) {
  if (status >= 500) return true;
  return [401, 403, 404, 408, 425, 429].includes(status);
}

export async function flushQueue(endpoint: string) {
  if (!endpoint) return { ok: false, sent: 0 };

  const queue = readQueue();
  if (queue.length === 0) return { ok: true, sent: 0 };

  let sent = 0;
  let droppedPermanent = 0;
  let lastError: "rate_limited" | "auth" | "invalid_payload" | "server" | "network_retry" | null = null;
  const remaining: LeaderboardSubmitPayload[] = [];

  for (const item of queue) {
    const validation = validateSubmitPayload(item);
    if (!validation.ok) {
      continue;
    }

    try {
      const res = await submitWithFallback(endpoint, item);
      if (res.ok) {
        sent += 1;
        continue;
      }

      if (shouldRetryStatus(res.status)) {
        remaining.push(item);
        lastError = res.status === 429 ? "rate_limited" : res.status === 401 || res.status === 403 ? "auth" : "network_retry";
      } else {
        droppedPermanent += 1;
        lastError = res.status === 400 || res.status === 422 ? "invalid_payload" : "server";
      }
    } catch {
      remaining.push(item);
      lastError = "network_retry";
    }
  }

  writeQueue(remaining);
  const ok = remaining.length === 0 && (sent > 0 || droppedPermanent === 0);
  return { ok, sent, reason: ok ? null : lastError };
}

export async function fetchBoardRows(opts: {
  endpoint: string;
  board: LeaderboardBoard;
  period: LeaderboardPeriod;
  sectionId?: string;
  day?: string;
}) {
  const { endpoint, board, period, sectionId, day } = opts;
  if (!endpoint) return [] as LeaderboardEntry[];

  const url = new URL(endpoint);
  url.searchParams.set("board", board);
  url.searchParams.set("period", period);
  if (sectionId) url.searchParams.set("sectionId", sectionId);
  if (day) url.searchParams.set("day", day);

  const headers = getLeaderboardHeaders(false);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers
  });
  if (!res.ok) throw new Error("fetch leaderboard failed");

  const json = (await res.json()) as { rows?: LeaderboardEntry[] };
  if (!Array.isArray(json?.rows)) return [];

  return json.rows
    .map((row) => ({
      ...row,
      name: normalizeAlias(row.name, String(row.id ?? "anon")),
      board: sanitizeBoardName(String(row.board ?? "global")),
      score: normalizeScore(row.score)
    }))
    .slice(0, 100);
}

export function resetLeaderboardData() {
  ensureMigration();
  try {
    [ID_KEY, ALIAS_KEY, SECRET_KEY, USER_INDEX_KEY, QUEUE_KEY, HISTORY_KEY].forEach((k) =>
      localStorage.removeItem(k)
    );
  } catch {
    // ignore
  }
}
