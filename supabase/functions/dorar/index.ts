// Server-side proxy for dorar.net's hadith-grading search
// (https://dorar.net/dorar_api.json?skey=...).
//
// dorar.net returns a 403 with no browser-like User-Agent, and even with
// one, browsers can't read the response cross-origin (no CORS headers on
// dorar.net's side) — verified directly: curl with a UA gets a real 200,
// a browser fetch() gets "Failed to fetch". Since Deno's server-side fetch
// has no CORS restriction, this function does the real fetch here and
// re-serves it with our own CORS headers so the app can read it.
//
// Small in-memory cache + rate limit so repeated identical lookups from
// many users don't hammer dorar.net on every request.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 60;
const limiter = new Map();

const CACHE_MAX_ENTRIES = 500;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // grading opinions don't change day to day
const cache = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
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

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { data, at: Date.now() });
}

const denoRuntime = globalThis.Deno;
if (!denoRuntime?.serve) {
  throw new Error("Deno runtime is required for this function");
}

denoRuntime.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "GET") return json({ ok: false, error: "method-not-allowed" }, 405);
  if (!rateLimit(req)) return json({ ok: false, error: "rate-limited" }, 429);

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!query || query.length < 3) return json({ ok: false, error: "missing-query" }, 400);

  const cached = cacheGet(query);
  if (cached) return json({ ok: true, cached: true, result: cached });

  try {
    const upstream = await fetch(`https://dorar.net/dorar_api.json?skey=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!upstream.ok) return json({ ok: false, error: `upstream-${upstream.status}` }, 502);
    const data = await upstream.json();
    const result = data?.ahadith?.result ?? "";
    cacheSet(query, result);
    return json({ ok: true, cached: false, result });
  } catch (e) {
    return json({ ok: false, error: "fetch-failed", detail: String(e?.message ?? e) }, 502);
  }
});
