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
// Small in-memory cache + bounded rate/concurrency controls avoid hammering
// dorar.net on repeated searches. The Edge gateway's client-IP header is
// preferred over caller-supplied forwarding headers.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 60;
const MAX_TRACKED_CLIENTS = 4_096;
const limiter = new Map();

const CACHE_MAX_ENTRIES = 500;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // grading opinions don't change day to day
const cache = new Map();

const MAX_QUERY_LENGTH = 200;
const MAX_CONCURRENT_UPSTREAM = 8;
const UPSTREAM_TIMEOUT_MS = 10_000;
let activeUpstreamRequests = 0;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function readClientKey(req) {
  // Supabase's Edge gateway provides this Cloudflare client-IP header. Do not
  // trust x-forwarded-for: clients can rotate that value to bypass the limit.
  const edgeIp = req.headers.get("cf-connecting-ip")?.trim();
  if (!edgeIp || edgeIp.length > 64) return "unknown";
  return edgeIp;
}

function rateLimit(req) {
  const key = readClientKey(req);
  const now = Date.now();
  let entry = limiter.get(key);

  if (entry && now - entry.startAt > WINDOW_MS) {
    limiter.delete(key);
    entry = undefined;
  }

  if (!entry) {
    if (limiter.size >= MAX_TRACKED_CLIENTS) {
      for (const [clientKey, clientEntry] of limiter) {
        if (now - clientEntry.startAt > WINDOW_MS) limiter.delete(clientKey);
      }
      if (limiter.size >= MAX_TRACKED_CLIENTS) {
        const leastRecentlyUsedKey = limiter.keys().next().value;
        if (leastRecentlyUsedKey !== undefined) limiter.delete(leastRecentlyUsedKey);
      }
    }
    limiter.set(key, { count: 1, startAt: now });
    return true;
  }

  if (entry.count >= MAX_REQ_PER_WINDOW) return false;

  // Map insertion order doubles as a small LRU list, so active clients stay
  // tracked and expired/abusive keys cannot make this Map grow without bound.
  limiter.delete(key);
  limiter.set(key, { count: entry.count + 1, startAt: entry.startAt });
  return true;
}

async function reserveSharedRequest(req) {
  const supabaseUrl = denoRuntime.env.get("SUPABASE_URL")?.trim().replace(/\/$/, "");
  const serviceRoleKey = denoRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) throw new Error("rate-limit-unavailable");

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serviceRoleKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode(readClientKey(req)),
  );
  const clientHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const response = await fetch(supabaseUrl + "/rest/v1/rpc/reserve_dorar_request", {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: "Bearer " + serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_client_hash: clientHash }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("rate-limit-unavailable");

  const allowed = await response.json();
  if (typeof allowed !== "boolean") throw new Error("rate-limit-invalid-response");
  return allowed;
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
if (!denoRuntime?.serve || !denoRuntime.env?.get) {
  throw new Error("Deno runtime is required for this function");
}

denoRuntime.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "GET") return json({ ok: false, error: "method-not-allowed" }, 405);
  if (!rateLimit(req)) return json({ ok: false, error: "rate-limited" }, 429);

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!query || query.length < 3) return json({ ok: false, error: "missing-query" }, 400);
  if (query.length > MAX_QUERY_LENGTH) return json({ ok: false, error: "query-too-long" }, 400);

  const cached = cacheGet(query);
  if (cached) return json({ ok: true, cached: true, result: cached });

  try {
    if (!await reserveSharedRequest(req)) return json({ ok: false, error: "rate-limited" }, 429);
  } catch (e) {
    console.error("dorar quota reservation failed:", e);
    return json({ ok: false, error: "rate-limit-unavailable" }, 503);
  }

  if (activeUpstreamRequests >= MAX_CONCURRENT_UPSTREAM) {
    return json({ ok: false, error: "upstream-busy" }, 503);
  }

  activeUpstreamRequests += 1;
  try {
    const upstream = await fetch("https://dorar.net/dorar_api.json?skey=" + encodeURIComponent(query), {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) return json({ ok: false, error: "upstream-" + upstream.status }, 502);
    const data = await upstream.json();
    const result = data?.ahadith?.result ?? "";
    cacheSet(query, result);
    return json({ ok: true, cached: false, result });
  } catch (e) {
    console.error("dorar fetch failed:", e);
    return json({ ok: false, error: "fetch-failed" }, 502);
  } finally {
    activeUpstreamRequests -= 1;
  }
});
