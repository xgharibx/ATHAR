/**
 * companion — Anthropic-Messages-API proxy for رفيق أثر.
 *
 * Routes requests to MiniMax only. The app has a single AI surface for users;
 * provider/model selection is not exposed client-side and is not honored here
 * if attempted. The Anthropic SDK points baseURL at this function; we inject
 * the upstream key server-side, solve browser CORS for the upstream (which
 * sends none), and stream SSE straight through.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { companionCorsHeaders } from "./cors.ts";

const COMPANION_TOOL_NAMES = new Set(["next_step", "cite", "search_library", "create_reminder"]);
const MAX_SYSTEM_CHARS = 20_000;
const MAX_MESSAGES = 60;

const MINIMAX_MODEL = "MiniMax-M3";
const MINIMAX_UPSTREAM = "https://api.minimax.io/anthropic/v1/messages";

const MAX_TOKENS_CAP = 4096;
const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 60_000;
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 24;
const MAX_ANON_REQ_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 4096;
const limiter = new Map<string, { count: number; startAt: number }>();

function clientKey(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  ).slice(0, 64);
}

function rateLimit(req: Request, maxRequests = MAX_REQ_PER_WINDOW): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const prev = limiter.get(key);
  if (!prev || now - prev.startAt > WINDOW_MS) {
    if (!prev && limiter.size >= MAX_TRACKED_CLIENTS) {
      for (const [trackedKey, tracked] of limiter) {
        if (now - tracked.startAt > WINDOW_MS) limiter.delete(trackedKey);
      }
      if (limiter.size >= MAX_TRACKED_CLIENTS) {
        const oldestKey = limiter.keys().next().value;
        if (oldestKey !== undefined) limiter.delete(oldestKey);
      }
    }
    limiter.set(key, { count: 1, startAt: now });
    return true;
  }
  if (prev.count >= maxRequests) return false;
  prev.count += 1;
  return true;
}

function jsonError(req: Request, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }),
    { status, headers: { "Content-Type": "application/json", ...companionCorsHeaders(req) } },
  );
}

type BoundedBody = { ok: true; text: string; byteLength: number } | { ok: false; reason: "too-large" | "invalid-utf8" };

async function readBoundedBody(req: Request, maxBytes: number): Promise<BoundedBody> {
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return { ok: false, reason: "too-large" };

  if (!req.body) return { ok: true, text: "", byteLength: 0 };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let reading = true;
  try {
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        continue;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), byteLength: totalBytes };
  } catch {
    return { ok: false, reason: "invalid-utf8" };
  }
}

const denoRuntime = (globalThis as { Deno?: { serve: (h: (req: Request) => Promise<Response> | Response) => void; env: { get(k: string): string | undefined } } }).Deno;
if (!denoRuntime?.serve || !denoRuntime?.env?.get) {
  throw new Error("Deno runtime is required for this function");
}

denoRuntime.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: companionCorsHeaders(req) });
  if (req.method !== "POST") return jsonError(req, "method-not-allowed", 405);

  const url = new URL(req.url);
  if (!url.pathname.endsWith("/v1/messages")) return jsonError(req, "not-found", 404);

  const authorization = req.headers.get("authorization") ?? "";
  const bearer = /^Bearer\s+(\S+)$/i.exec(authorization);
  const anonKey = denoRuntime.env.get("SUPABASE_ANON_KEY") ?? "";
  const guestRequest = Boolean(anonKey && bearer?.[1] === anonKey);
  if (!rateLimit(req, guestRequest ? MAX_ANON_REQ_PER_WINDOW : MAX_REQ_PER_WINDOW)) {
    return jsonError(req, "rate-limited — try again in a minute", 429);
  }

  let boundedBody: BoundedBody;
  try {
    boundedBody = await readBoundedBody(req, MAX_BODY_BYTES);
  } catch {
    return jsonError(req, "could not read request body", 400);
  }
  if (!boundedBody.ok) {
    return boundedBody.reason === "too-large"
      ? jsonError(req, "request too large", 413)
      : jsonError(req, "invalid UTF-8", 400);
  }
  const raw = boundedBody.text;

  let body: { model?: unknown; max_tokens?: unknown; stream?: boolean; system?: unknown; messages?: unknown; tools?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(req, "invalid JSON", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(req, "request body must be an object", 400);
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
  if (body.max_tokens !== undefined && (
    typeof body.max_tokens !== "number" || !Number.isSafeInteger(body.max_tokens) || body.max_tokens < 1
  )) return jsonError(req, "invalid max_tokens", 400);
  const maxOutputTokens = typeof body.max_tokens === "number"
    ? Math.min(body.max_tokens, MAX_TOKENS_CAP)
    : MAX_TOKENS_CAP;
  body = { ...body, max_tokens: maxOutputTokens };

  const apiKey = denoRuntime.env.get("MINIMAX_API_KEY");
  if (!apiKey) return jsonError(req, "no server key configured", 503);

  if (!bearer) return jsonError(req, "sign-in-required", 401);

  const supabaseUrl = denoRuntime.env.get("SUPABASE_URL");
  const serviceRoleKey = denoRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonError(req, "authorization service unavailable", 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userId: string | null = null;
  if (!guestRequest) {
    try {
      const { data, error } = await supabase.auth.getUser(bearer[1]);
      if (error || !data.user?.id) return jsonError(req, "invalid authorization", 401);
      userId = data.user.id;
    } catch {
      return jsonError(req, "authorization service unavailable", 503);
    }
  }

  let reservation: { data: unknown; error: unknown };
  try {
    reservation = guestRequest
      ? await supabase.rpc("reserve_companion_anonymous_request", {
        p_request_bytes: boundedBody.byteLength,
        p_max_output_tokens: maxOutputTokens,
      })
      : await supabase.rpc("reserve_companion_request", {
        p_user_id: userId,
        p_request_bytes: boundedBody.byteLength,
        p_max_output_tokens: maxOutputTokens,
      });
  } catch {
    return jsonError(req, "usage quota unavailable", 503);
  }
  if (reservation.error) return jsonError(req, "usage quota unavailable", 503);
  if (reservation.data !== true) return jsonError(req, "usage limit reached — try again later", 429);

  const upstreamSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(MINIMAX_UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: upstreamSignal,
    });
  } catch {
    return jsonError(req, upstreamSignal.aborted ? "model request timed out" : "model service unavailable", upstreamSignal.aborted ? 504 : 502);
  }

  const headers = new Headers(companionCorsHeaders(req));
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
});
