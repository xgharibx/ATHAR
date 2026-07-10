/**
 * companion — Anthropic-Messages-API proxy for the رفيق أثر AI companion.
 *
 * The app's Anthropic SDK points its baseURL here; this function forwards the
 * request to the right upstream (by model name) and injects the API key
 * server-side, so no key ever ships inside the app bundle:
 *   - MiniMax-*  → https://api.minimax.io/anthropic (MINIMAX_API_KEY secret)
 *   - claude-*   → https://api.anthropic.com        (ANTHROPIC_API_KEY secret)
 *
 * Also solves browser CORS: MiniMax's API sends no CORS headers, so a direct
 * browser call is impossible — this proxy responds with permissive CORS and
 * streams SSE straight through.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // "*" here is a literal wildcard, valid because Access-Control-Allow-Origin
  // is also "*" (no credentialed request). The Anthropic SDK sends several
  // x-stainless-* diagnostic headers the browser's real preflight checks for
  // — an explicit allow-list has to name every one of them or the browser
  // silently blocks the actual request after the preflight succeeds.
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

// Only the models the app actually offers — nobody can burn the key on other models.
const ALLOWED_MODELS = new Set([
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5",
  "MiniMax-M3",
]);

const MAX_TOKENS_CAP = 8192;
const MAX_BODY_BYTES = 256 * 1024; // generous for long conversations, blocks abuse
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 20; // per IP per minute — chat is human-paced
const limiter = new Map<string, { count: number; startAt: number }>();

function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function rateLimit(req: Request): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const prev = limiter.get(key);
  if (!prev || now - prev.startAt > WINDOW_MS) {
    limiter.set(key, { count: 1, startAt: now });
    return true;
  }
  if (prev.count >= MAX_REQ_PER_WINDOW) return false;
  prev.count += 1;
  return true;
}

function jsonError(message: string, status: number): Response {
  // Anthropic-style error envelope so the SDK surfaces it cleanly.
  return new Response(
    JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }),
    { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
  );
}

const denoRuntime = (globalThis as { Deno?: { serve: (h: (req: Request) => Promise<Response> | Response) => void; env: { get(k: string): string | undefined } } }).Deno;
if (!denoRuntime?.serve || !denoRuntime?.env?.get) {
  throw new Error("Deno runtime is required for this function");
}

denoRuntime.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonError("method-not-allowed", 405);

  // The Anthropic SDK appends /v1/messages to its baseURL.
  const url = new URL(req.url);
  if (!url.pathname.endsWith("/v1/messages")) return jsonError("not-found", 404);

  if (!rateLimit(req)) return jsonError("rate-limited — try again in a minute", 429);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError("request too large", 413);

  let body: { model?: string; max_tokens?: number; stream?: boolean };
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError("invalid JSON", 400);
  }

  const model = String(body.model ?? "");
  if (!ALLOWED_MODELS.has(model)) return jsonError(`model not allowed: ${model}`, 400);
  if (typeof body.max_tokens === "number" && body.max_tokens > MAX_TOKENS_CAP) {
    body.max_tokens = MAX_TOKENS_CAP;
  }

  const isMinimax = model.startsWith("MiniMax");
  const upstreamUrl = isMinimax
    ? "https://api.minimax.io/anthropic/v1/messages"
    : "https://api.anthropic.com/v1/messages";
  const apiKey = isMinimax
    ? denoRuntime.env.get("MINIMAX_API_KEY")
    : denoRuntime.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return jsonError(`no server key configured for ${isMinimax ? "MiniMax" : "Anthropic"} models`, 503);

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  // Pass the upstream response through untouched (JSON or SSE stream alike),
  // adding CORS so browsers accept it.
  const headers = new Headers(CORS_HEADERS);
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
});
