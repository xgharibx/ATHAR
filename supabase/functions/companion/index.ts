/**
 * companion — Messages-API proxy for رفيق أثر.
 *
 * Routes requests to MiniMax only. The app has a single assistant surface;
 * provider and model selection are not exposed to clients and are not honoured
 * here if attempted. The client SDK points its base URL at this function; the
 * function injects the upstream key, applies CORS, and streams SSE through.
 *
 * Only an explicit set of request fields is forwarded. Generation settings and
 * the web-search configuration are owned by the server, so a direct caller
 * cannot widen them.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { companionCorsHeaders } from "./cors.ts";
import { TRUSTED_SOURCE_DOMAINS, WEB_SEARCH_SYSTEM_RULES } from "./sources.ts";

const COMPANION_TOOL_NAMES = new Set(["next_step", "cite", "search_library", "create_reminder"]);
const MAX_SYSTEM_CHARS = 20_000;
const MAX_MESSAGES = 16;
const MAX_HISTORY_CHARS = 48_000;
const MAX_LATEST_USER_MESSAGE_CHARS = 8_000;

const MINIMAX_MODEL = "MiniMax-M3.1-Flash";
const MINIMAX_UPSTREAM = "https://api.minimax.io/anthropic/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// This model always reasons before answering, and reasoning tokens count
// toward max_tokens. The floor keeps a small client value from ending a reply
// before any visible text; the effort level keeps reasoning proportionate.
const MAX_TOKENS_CAP = 8192;
const MIN_MAX_TOKENS = 4096;
const REASONING_EFFORT = "medium";
// The quota functions accept at most this many output tokens per reservation.
const MAX_RESERVED_OUTPUT_TOKENS = 4096;
const WEB_SEARCH_TOOL_NAME = "web_search";
const WEB_SEARCH_MAX_USES = 2;
const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 60_000;
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 24;
const MAX_ANON_REQ_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 4096;
const limiter = new Map<string, { count: number; startAt: number }>();

type CompanionTextMessage = { role: "user" | "assistant"; content: string };
type BoundedMessagesResult =
  | { ok: true; messages: CompanionTextMessage[] }
  | { ok: false; reason: "invalid-messages" | "latest-message-too-large" };

/** Enforce the same outbound limits as the app, even for older or direct callers. */
function boundCompanionMessages(input: unknown): BoundedMessagesResult {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, reason: "invalid-messages" };

  const messages: CompanionTextMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, reason: "invalid-messages" };
    }
    const candidate = item as { role?: unknown; content?: unknown };
    if ((candidate.role !== "user" && candidate.role !== "assistant") || typeof candidate.content !== "string") {
      return { ok: false, reason: "invalid-messages" };
    }
    messages.push({ role: candidate.role, content: candidate.content });
  }

  const latestMessage = messages[messages.length - 1];
  if (!latestMessage || latestMessage.role !== "user") return { ok: false, reason: "invalid-messages" };
  if (latestMessage.content.length > MAX_LATEST_USER_MESSAGE_CHARS) {
    return { ok: false, reason: "latest-message-too-large" };
  }

  let bounded = messages.slice(-MAX_MESSAGES);
  while (bounded[0]?.role === "assistant") bounded = bounded.slice(1);
  while (bounded.reduce((total, message) => total + message.content.length, 0) > MAX_HISTORY_CHARS) {
    bounded = bounded.slice(1);
    while (bounded[0]?.role === "assistant") bounded = bounded.slice(1);
  }
  if (bounded.length === 0 || bounded[bounded.length - 1]?.role !== "user") {
    return { ok: false, reason: "invalid-messages" };
  }
  return { ok: true, messages: bounded };
}

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

  const boundedMessages = boundCompanionMessages(body.messages);
  if (!boundedMessages.ok) {
    return boundedMessages.reason === "latest-message-too-large"
      ? jsonError(req, "latest message too large", 413)
      : jsonError(req, "invalid messages", 400);
  }

  // Only the tool names Athar itself defines are allowed through — blocks
  // arbitrary tool-schema injection from a direct caller. A client opts in to
  // web search by naming the tool; its definition is always replaced with the
  // server's own, so the allowed sources cannot be changed by a caller.
  const clientTools: unknown[] = [];
  let webSearchRequested = false;
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) return jsonError(req, "unrecognized tool definition", 400);
    for (const tool of body.tools) {
      const name = tool && typeof tool === "object" ? (tool as { name?: unknown }).name : undefined;
      if (name === WEB_SEARCH_TOOL_NAME) {
        webSearchRequested = true;
        continue;
      }
      if (typeof name !== "string" || !COMPANION_TOOL_NAMES.has(name)) {
        return jsonError(req, "unrecognized tool definition", 400);
      }
      clientTools.push(tool);
    }
  }

  if (body.max_tokens !== undefined && (
    typeof body.max_tokens !== "number" || !Number.isSafeInteger(body.max_tokens) || body.max_tokens < 1
  )) return jsonError(req, "invalid max_tokens", 400);
  const maxOutputTokens = typeof body.max_tokens === "number"
    ? Math.max(MIN_MAX_TOKENS, Math.min(body.max_tokens, MAX_TOKENS_CAP))
    : MAX_TOKENS_CAP;
  const reservedOutputTokens = Math.min(maxOutputTokens, MAX_RESERVED_OUTPUT_TOKENS);

  // Rebuild the upstream request from known fields only. The app ships one
  // model; whatever a caller names is replaced with it.
  const buildUpstreamBody = (withWebSearch: boolean): Record<string, unknown> => {
    const tools = withWebSearch
      ? [...clientTools, {
        type: "web_search_20250305",
        name: WEB_SEARCH_TOOL_NAME,
        max_uses: WEB_SEARCH_MAX_USES,
        allowed_domains: TRUSTED_SOURCE_DOMAINS,
      }]
      : clientTools;
    const system = withWebSearch
      ? [
        ...(Array.isArray(body.system) ? body.system : [{ type: "text", text: systemText }]),
        { type: "text", text: WEB_SEARCH_SYSTEM_RULES },
      ]
      : body.system;
    return {
      model: MINIMAX_MODEL,
      max_tokens: maxOutputTokens,
      stream: body.stream === true,
      system,
      messages: boundedMessages.messages,
      ...(tools.length > 0 ? { tools } : {}),
      output_config: { effort: REASONING_EFFORT },
    };
  };

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
        p_max_output_tokens: reservedOutputTokens,
      })
      : await supabase.rpc("reserve_companion_request", {
        p_user_id: userId,
        p_request_bytes: boundedBody.byteLength,
        p_max_output_tokens: reservedOutputTokens,
      });
  } catch {
    return jsonError(req, "usage quota unavailable", 503);
  }
  if (reservation.error) return jsonError(req, "usage quota unavailable", 503);
  if (reservation.data !== true) return jsonError(req, "usage limit reached — try again later", 429);

  const upstreamSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const callUpstream = (withWebSearch: boolean): Promise<Response> =>
    fetch(MINIMAX_UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(buildUpstreamBody(withWebSearch)),
      signal: upstreamSignal,
    });
  let upstream: Response;
  try {
    upstream = await callUpstream(webSearchRequested);
    // If the provider rejects the restricted search configuration, answer
    // from the app's own library rather than search without the restriction.
    if (webSearchRequested && upstream.status === 400) {
      await upstream.body?.cancel().catch(() => undefined);
      upstream = await callUpstream(false);
    }
  } catch {
    return jsonError(req, upstreamSignal.aborted ? "model request timed out" : "model service unavailable", upstreamSignal.aborted ? 504 : 502);
  }

  const headers = new Headers(companionCorsHeaders(req));
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
});
