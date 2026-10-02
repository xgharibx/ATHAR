/**
 * Public, read-only proxy for the two translations offered by the app.
 * Quran Foundation Content API credentials and access tokens stay server-side.
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.athark.org",
  "https://athark.org",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const TRANSLATION_IDS = new Set([22, 234]);
const MAX_BODY_BYTES = 2048;
const MAX_REQ_PER_WINDOW = 60;
const WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 4096;
const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_EARLY_REFRESH_MS = 30_000;
const rateLimits = new Map<string, { count: number; startedAt: number }>();

type AccessToken = { value: string; expiresAt: number };
let cachedToken: AccessToken | null = null;
let tokenRequest: Promise<AccessToken> | null = null;

const runtime = (globalThis as {
  Deno?: { serve: (handler: (request: Request) => Response | Promise<Response>) => void; env: { get: (name: string) => string | undefined } };
}).Deno;

if (!runtime?.serve || !runtime.env?.get) {
  throw new Error("Deno runtime is required for quran-translations");
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  ).slice(0, 64);
}

async function reserveSharedRequest(request: Request): Promise<boolean> {
  const supabaseUrl = runtime!.env.get("SUPABASE_URL")?.trim().replace(/\/$/, "");
  const serviceRoleKey = runtime!.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) throw new Error("translation-rate-limit-unavailable");

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serviceRoleKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(clientKey(request)));
  const clientHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_quran_translation_request`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_client_hash: clientHash }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("translation-rate-limit-unavailable");
  const allowed: unknown = await response.json();
  if (typeof allowed !== "boolean") throw new Error("translation-rate-limit-invalid-response");
  return allowed;
}

function allowRequest(request: Request): boolean {
  const key = clientKey(request);
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    if (!current && rateLimits.size >= MAX_TRACKED_CLIENTS) {
      for (const [trackedKey, tracked] of rateLimits) {
        if (now - tracked.startedAt >= WINDOW_MS) rateLimits.delete(trackedKey);
      }
      if (rateLimits.size >= MAX_TRACKED_CLIENTS) {
        const oldest = rateLimits.keys().next().value;
        if (oldest !== undefined) rateLimits.delete(oldest);
      }
    }
    rateLimits.set(key, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= MAX_REQ_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) throw new Error("too-large");
  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    let reading = true;
    while (reading) {
      const chunk = await reader.read();
      if (chunk.done) {
        reading = false;
        continue;
      }
      const { value } = chunk;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const payload = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload));
}

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, decimal: string) => {
      const codePoint = Number(decimal);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : "";
    })
    .replace(/&#x([\da-f]+);/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function apiBases(): { oauth: string; api: string } | null {
  const environment = runtime!.env.get("QF_ENV")?.trim() || "production";
  if (environment === "production") {
    return { oauth: "https://oauth2.quran.foundation", api: "https://apis.quran.foundation" };
  }
  if (environment === "prelive") {
    return { oauth: "https://prelive-oauth2.quran.foundation", api: "https://apis-prelive.quran.foundation" };
  }
  return null;
}

async function requestAccessToken(): Promise<AccessToken> {
  const clientId = runtime!.env.get("QF_CLIENT_ID")?.trim();
  const clientSecret = runtime!.env.get("QF_CLIENT_SECRET")?.trim();
  const bases = apiBases();
  if (!clientId || !clientSecret || !bases) throw new Error("translation-service-unconfigured");

  const body = new URLSearchParams({ grant_type: "client_credentials", scope: "content" });
  const response = await fetch(`${bases.oauth}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("translation-auth-failed");

  const payload = await response.json() as { access_token?: unknown; expires_in?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token || typeof payload.expires_in !== "number") {
    throw new Error("translation-auth-invalid-response");
  }
  return {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(1, payload.expires_in) * 1000,
  };
}

async function getAccessToken(): Promise<AccessToken> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_EARLY_REFRESH_MS) return cachedToken;
  if (!tokenRequest) {
    tokenRequest = requestAccessToken()
      .then((token) => {
        cachedToken = token;
        return token;
      })
      .finally(() => { tokenRequest = null; });
  }
  return tokenRequest;
}

async function fetchTranslationChapter(translationId: number, chapterNumber: number): Promise<unknown> {
  const bases = apiBases();
  if (!bases) throw new Error("translation-service-unconfigured");
  const url = `${bases.api}/content/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}&fields=verse_key`;

  let token = await getAccessToken();
  let response = await fetch(url, {
    headers: { "x-auth-token": token.value, "x-client-id": runtime!.env.get("QF_CLIENT_ID")!.trim() },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401) {
    if (cachedToken?.value === token.value) cachedToken = null;
    token = await getAccessToken();
    response = await fetch(url, {
      headers: { "x-auth-token": token.value, "x-client-id": runtime!.env.get("QF_CLIENT_ID")!.trim() },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
  if (!response.ok) throw new Error(response.status === 429 ? "translation-rate-limited" : "translation-upstream-failed");

  const payload = await response.json() as {
    translations?: Array<{ verse_key?: unknown; text?: unknown }>;
    meta?: { translation_name?: unknown; author_name?: unknown; filters?: unknown };
  };
  if (!Array.isArray(payload.translations) || payload.translations.length === 0) {
    throw new Error("translation-invalid-response");
  }

  const seen = new Set<string>();
  const translations = payload.translations.flatMap((row) => {
    if (typeof row?.verse_key !== "string" || typeof row.text !== "string") return [];
    const keyMatch = /^(\d+):(\d+)$/.exec(row.verse_key);
    if (!keyMatch || Number(keyMatch[1]) !== chapterNumber || seen.has(row.verse_key)) return [];
    const text = plainText(row.text);
    if (!text || text.length > 5000) return [];
    seen.add(row.verse_key);
    return [{ verse_key: row.verse_key, text }];
  });
  if (translations.length === 0) throw new Error("translation-invalid-response");

  return {
    translations,
    meta: {
      translation_name: typeof payload.meta?.translation_name === "string" ? payload.meta.translation_name.slice(0, 160) : "",
      author_name: typeof payload.meta?.author_name === "string" ? payload.meta.author_name.slice(0, 160) : "",
      filters: { chapter_number: chapterNumber },
    },
  };
}

runtime.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response("forbidden", { status: 403, headers: corsHeaders(request) });
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "method-not-allowed" }, 405);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "origin-not-allowed" }, 403);
  if (!allowRequest(request)) return json(request, { error: "rate-limited" }, 429);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return error instanceof Error && error.message === "too-large"
      ? json(request, { error: "request-too-large" }, 413)
      : json(request, { error: "invalid-json" }, 400);
  }

  const input = body && typeof body === "object" && !Array.isArray(body)
    ? body as { translationId?: unknown; chapterNumber?: unknown }
    : {};
  if (!Number.isInteger(input.translationId) || !TRANSLATION_IDS.has(input.translationId as number) ||
      !Number.isInteger(input.chapterNumber) || (input.chapterNumber as number) < 1 || (input.chapterNumber as number) > 114) {
    return json(request, { error: "invalid-translation-request" }, 400);
  }

  let quotaReserved: boolean;
  try {
    quotaReserved = await reserveSharedRequest(request);
  } catch {
    return json(request, { error: "translation-rate-limit-unavailable" }, 503);
  }
  if (!quotaReserved) return json(request, { error: "translation-rate-limited" }, 429);

  try {
    const translations = await fetchTranslationChapter(input.translationId as number, input.chapterNumber as number);
    return json(request, translations);
  } catch (error) {
    if (error instanceof Error && error.message === "translation-service-unconfigured") {
      return json(request, { error: "translation-service-unavailable" }, 503);
    }
    if (error instanceof Error && error.message === "translation-rate-limited") {
      return json(request, { error: "translation-rate-limited" }, 429);
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return json(request, { error: "translation-service-timeout" }, 504);
    }
    return json(request, { error: "translation-service-unavailable" }, 502);
  }
});
