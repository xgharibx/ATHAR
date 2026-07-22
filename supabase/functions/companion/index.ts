/**
 * companion — Anthropic-Messages-API proxy for رفيق أثر.
 *
 * Routes requests to MiniMax only. The app has a single AI surface for users;
 * provider/model selection is not exposed client-side and is not honored here
 * if attempted. The Anthropic SDK points baseURL at this function; we inject
 * the upstream key server-side, solve browser CORS for the upstream (which
 * sends none), and stream SSE straight through.
 */

// The app's real origins: the web PWA (custom domain, via CNAME) and the two
// native WebView origins Capacitor uses with this project's config (no
// server.url override, androidScheme: "https"). Anything else doesn't get a
// CORS grant, so a browser can't read the response cross-origin.
const ALLOWED_ORIGINS = new Set([
  "https://www.athark.org",
  "https://athark.org",
  "capacitor://localhost",
  "https://localhost",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

const COMPANION_TOOL_NAMES = new Set(["next_step", "cite", "search_library", "create_reminder"]);
const MAX_SYSTEM_CHARS = 20_000;
const MAX_MESSAGES = 60;

const MINIMAX_MODEL = "MiniMax-M3";
const MINIMAX_UPSTREAM = "https://api.minimax.io/anthropic/v1/messages";

const MAX_TOKENS_CAP = 4096;
const MAX_BODY_BYTES = 256 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 24;
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

function jsonError(req: Request, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders(req) } },
  );
}

const denoRuntime = (globalThis as { Deno?: { serve: (h: (req: Request) => Promise<Response> | Response) => void; env: { get(k: string): string | undefined } } }).Deno;
if (!denoRuntime?.serve || !denoRuntime?.env?.get) {
  throw new Error("Deno runtime is required for this function");
}

denoRuntime.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonError(req, "method-not-allowed", 405);

  const url = new URL(req.url);
  if (!url.pathname.endsWith("/v1/messages")) return jsonError(req, "not-found", 404);

  if (!rateLimit(req)) return jsonError(req, "rate-limited — try again in a minute", 429);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(req, "request too large", 413);

  let body: { model?: string; max_tokens?: number; stream?: boolean; system?: unknown; messages?: unknown; tools?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(req, "invalid JSON", 400);
  }

  // Athar's own client always sends a system prompt and a non-empty message
  // history. Requests missing either aren't coming from the real app.
  const systemText = Array.isArray(body.system)
    ? body.system.map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text?: unknown }).text ?? "") : "")).join("")
    : typeof body.system === "string" ? body.system : "";
  if (!systemText) return jsonError(req, "missing system prompt", 400);
  if (systemText.length > MAX_SYSTEM_CHARS) return jsonError(req, "system prompt too large", 413);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError(req, "missing messages", 400);
  }
  if (body.messages.length > MAX_MESSAGES) return jsonError(req, "too many messages", 413);

  // Only the tool names Athar itself defines are allowed through — blocks
  // arbitrary tool-schema injection from a direct caller.
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools) || body.tools.some((t) => {
      const name = t && typeof t === "object" ? (t as { name?: unknown }).name : undefined;
      return typeof name !== "string" || !COMPANION_TOOL_NAMES.has(name);
    })) {
      return jsonError(req, "unrecognized tool definition", 400);
    }
  }

  // The app ships only one model. Anything else is treated as the locked model
  // — there's no UI to pick anything else, and no reason to honor it if hit.
  const requested = String(body.model ?? "");
  if (requested && requested !== MINIMAX_MODEL) {
    body = { ...body, model: MINIMAX_MODEL };
  }
  if (typeof body.max_tokens === "number" && body.max_tokens > MAX_TOKENS_CAP) {
    body.max_tokens = MAX_TOKENS_CAP;
  }

  const apiKey = denoRuntime.env.get("MINIMAX_API_KEY");
  if (!apiKey) return jsonError(req, "no server key configured", 503);

  const upstream = await fetch(MINIMAX_UPSTREAM, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const headers = new Headers(corsHeaders(req));
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
});
