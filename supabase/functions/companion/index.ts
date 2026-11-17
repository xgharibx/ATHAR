/**
 * companion — Messages-API proxy for رفيق أثر.
 *
 * Routes requests to MiniMax only. The app has a single assistant surface;
 * provider and model selection are not exposed to clients and are not honoured
 * here if attempted. The client SDK points its base URL at this function; the
 * function injects the upstream key, applies CORS, and streams SSE through.
 *
 * Only an explicit set of request fields is forwarded, and generation settings
 * are owned by the server.
 *
 * Before answering, the function gathers the texts the model may quote:
 * authentic hadith from the Dorar encyclopedia, exact Quran text, and, when a
 * client asks for web search, excerpts from the trusted source list only. The
 * reply then passes through a guard that replaces every verse and hadith with
 * its verified text and removes any that cannot be verified.
 */
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { companionCorsHeaders } from "./cors.ts";
import { EVIDENCE_STEP_SYSTEM, EVIDENCE_TOOL, buildEvidenceBlock, gatherHadith, gatherVerses, loadQuran, readEvidencePlan } from "./evidence.ts";
import { ReplyGuard, UNAVAILABLE_REPLY, finalizeReplyDetailed, isUsableReply } from "./guard.ts";
import { CLIENT_BASE_PROMPT_OPENING, SERVER_SYSTEM_PROMPT, focusClientContext } from "./prompt.ts";
import { SEARCH_STEP_SYSTEM, buildTrustedResultsBlock, selectTrustedResults } from "./sources.ts";
import { guardMessage, guardSseStream } from "./stream.ts";

const COMPANION_TOOL_NAMES = new Set(["next_step", "cite", "search_library", "create_reminder"]);
// What is kept of a client's context after it has been focused. The request
// body as a whole is bounded separately.
const MAX_CLIENT_CONTEXT_CHARS = 4_000;
const MAX_MESSAGES = 16;
const MAX_HISTORY_CHARS = 48_000;
const MAX_LATEST_USER_MESSAGE_CHARS = 8_000;

const MINIMAX_MODEL: string = "MiniMax-M3.1-Flash";
const MINIMAX_UPSTREAM = "https://api.minimax.io/anthropic/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// This model always reasons before answering, and reasoning tokens count
// toward max_tokens. The floor keeps a small client value from ending a reply
// before any visible text. Measured against the live service, "low" effort
// answered in about a quarter of the time of "medium" with cleaner Arabic,
// and "high" exceeded the request timeout.
const MAX_TOKENS_CAP = 8192;
const MIN_MAX_TOKENS = 4096;
const REASONING_EFFORT = "low";
// The quota functions accept at most this many output tokens per reservation.
const MAX_RESERVED_OUTPUT_TOKENS = 4096;
const WEB_SEARCH_TOOL_NAME = "web_search";
// The search step runs before the answer and must not hold it up for long.
const SEARCH_TIMEOUT_MS = 20_000;
const SEARCH_MAX_TOKENS = 2048;
const SEARCH_MAX_QUESTION_CHARS = 600;
// Greetings and one-word messages are never worth a search.
const SEARCH_MIN_QUESTION_CHARS = 15;
// The evidence step decides which source texts to fetch; it is short.
const EVIDENCE_TIMEOUT_MS = 15_000;
const EVIDENCE_MAX_TOKENS = 1024;
const EVIDENCE_CONTEXT_MESSAGES = 3;
const EVIDENCE_CONTEXT_CHARS = 600;
const RETRY_TIMEOUT_MS = 40_000;
// Dropped clauses and sentences beyond which a reply is worth writing again.
const RETRY_DAMAGE_THRESHOLD = 3;
const RETRY_INSTRUCTION = "تنبيه أخير: اكتب الجواب كله بالعربية الفصحى، بحروف عربية فقط، في جمل قصيرة تامة المعنى. لا تكتب بأي لغة أخرى ولا بحروف لاتينية، ولا تروِ عن النبي ﷺ قولًا أو فعلًا بعبارتك؛ الدليل يظهر في كتلته فقط.";
const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 60_000;
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 24;
const MAX_ANON_REQ_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 4096;
const limiter = new Map<string, { count: number; startAt: number }>();

/** The two supported models take different reasoning controls. */
function reasoningSettings(effort: string): Record<string, unknown> {
  return MINIMAX_MODEL === "MiniMax-M3.1-Flash"
    ? { output_config: { effort } }
    : {};
}

/** Wording that marks a question as needing a scholarly ruling or explanation. */
const RULING_QUESTION =
  /حكم|يجوز|حلال|حرام|مكروه|واجب|فرض|سنة|سنّة|مستحب|بدعة|يبطل|يفسد|كفار|قضاء|فدية|زكاة|صيام|صوم|صلاة|طهار|وضوء|غسل|تيمم|نجاس|حج|عمرة|نكاح|طلاق|ميراث|ربا|فتوى|تفسير|معنى|صحة حديث|صحّة حديث|درجة حديث|الدليل|دليل/;

const NO_PLAN = { hadithQueries: [] as string[], quranReferences: [] as string[], needsSources: false, wantsWording: false };

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
      // Library excerpts are no longer given to the model, so there is nothing
      // for the citation tool to point at.
      if (name !== "cite") clientTools.push(tool);
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
  // model; whatever a caller names is replaced with it. The provider's own
  // search tool is never handed to the answering call: its results are
  // unfiltered, so the search runs as a separate step below.
  const buildUpstreamBody = (serverBlocks: string[]): Record<string, unknown> => {
    // The base instructions are the server's. Of what a client sends after
    // its own base instructions, the description of the moment is kept.
    const clientBlocks: Array<{ type: string; text: string }> = (Array.isArray(body.system) ? body.system : [body.system])
      .map((block) => (typeof block === "string" ? block : String((block as { text?: unknown } | null)?.text ?? "")))
      .filter((text) => text && !text.trimStart().startsWith(CLIENT_BASE_PROMPT_OPENING))
      .map((text) => focusClientContext(text).slice(0, MAX_CLIENT_CONTEXT_CHARS))
      .filter(Boolean)
      .map((text) => ({ type: "text", text }));
    const system = [
      { type: "text", text: SERVER_SYSTEM_PROMPT },
      ...clientBlocks,
      ...serverBlocks.filter(Boolean).map((text) => ({ type: "text", text })),
    ];
    return {
      model: MINIMAX_MODEL,
      max_tokens: maxOutputTokens,
      stream: body.stream === true,
      system,
      messages: boundedMessages.messages,
      ...(clientTools.length > 0 ? { tools: clientTools } : {}),
      ...reasoningSettings(REASONING_EFFORT),
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

  const upstreamHeaders = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };

  const question = boundedMessages.messages[boundedMessages.messages.length - 1]?.content.trim() ?? "";
  const substantive = question.length >= SEARCH_MIN_QUESTION_CHARS;

  // Evidence step: ask which hadith and verses bear on the question, then
  // fetch authentic narrations and the exact verse texts. Any failure simply
  // leaves less to quote; it never lets unverified text through.
  const planEvidence = async () => {
    if (!substantive) return NO_PLAN;
    let recent = boundedMessages.messages.slice(-EVIDENCE_CONTEXT_MESSAGES);
    while (recent[0]?.role === "assistant") recent = recent.slice(1);
    const response = await fetch(MINIMAX_UPSTREAM, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        max_tokens: EVIDENCE_MAX_TOKENS,
        stream: false,
        system: EVIDENCE_STEP_SYSTEM,
        messages: recent.map((message) => ({ role: message.role, content: message.content.slice(0, EVIDENCE_CONTEXT_CHARS) })),
        tools: [EVIDENCE_TOOL],
        ...reasoningSettings("low"),
      }),
      signal: AbortSignal.timeout(EVIDENCE_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return NO_PLAN;
    }
    return readEvidencePlan((await response.json() as { content?: unknown }).content);
  };

  // Search step: one provider search, then keep only results from the trusted
  // list. The provider does not enforce a domain restriction itself.
  const searchTrustedSources = async (wanted: boolean) => {
    if (!wanted || !substantive) return [];
    const response = await fetch(MINIMAX_UPSTREAM, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        max_tokens: SEARCH_MAX_TOKENS,
        stream: false,
        system: SEARCH_STEP_SYSTEM,
        messages: [{ role: "user", content: question.slice(0, SEARCH_MAX_QUESTION_CHARS) }],
        tools: [{ type: "web_search_20250305", name: WEB_SEARCH_TOOL_NAME }],
        ...reasoningSettings("low"),
      }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return [];
    }
    return selectTrustedResults((await response.json() as { content?: unknown }).content);
  };

  // A question that needs a ruling is answered from trusted sources, whether
  // or not the client asked for a search. When the wording already shows
  // that, the search starts at once, alongside the evidence step.
  const searchEarly = webSearchRequested || RULING_QUESTION.test(question);
  const earlySearch = searchTrustedSources(searchEarly).catch(() => []);
  const [plan, quran] = await Promise.all([
    planEvidence().catch(() => NO_PLAN),
    loadQuran(denoRuntime.env.get("QURAN_DATA_URL")),
  ]);
  const [hadith, webResults] = await Promise.all([
    gatherHadith(plan.hadithQueries, plan.wantsWording),
    searchEarly ? earlySearch : searchTrustedSources(plan.needsSources).catch(() => []),
  ]);
  const verses = gatherVerses(quran, plan.quranReferences);

  const guardContext = {
    quran,
    hadith,
    // The app's own library excerpts arrive in the system prompt; together
    // with the trusted web excerpts they are the only other quotable text.
    trustedTexts: [systemText, ...webResults.map((result) => result.excerpt)],
    sourceUrls: webResults.map((result) => result.url),
    userTexts: boundedMessages.messages.filter((message) => message.role === "user").slice(-2).map((message) => message.content),
  };
  const serverBlocks = [
    webResults.length > 0 ? buildTrustedResultsBlock(webResults) : "",
    buildEvidenceBlock(hadith, verses),
  ];

  // Every reply is cleaned and verified before it reaches the reader. A reply
  // that is not usable Arabic, or that lost much of its content in cleaning,
  // is regenerated once and the better of the two is kept. If neither is
  // usable the reader gets a plain message instead of fragments.
  const finalize = async (rawText: string): Promise<string> => {
    if (!rawText.trim()) return "";
    const first = isUsableReply(rawText) ? finalizeReplyDetailed(rawText, new ReplyGuard(guardContext)) : null;
    if (first && first.text && first.damage < RETRY_DAMAGE_THRESHOLD) return first.text;
    let second: { text: string; damage: number } | null = null;
    try {
      const retry = await fetch(MINIMAX_UPSTREAM, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify({ ...buildUpstreamBody([...serverBlocks, RETRY_INSTRUCTION]), stream: false, tools: undefined }),
        signal: AbortSignal.timeout(RETRY_TIMEOUT_MS),
      });
      if (retry.ok) {
        const content = (await retry.json() as { content?: unknown }).content;
        const text = Array.isArray(content)
          ? content.map((block) => ((block as { type?: unknown })?.type === "text" ? String((block as { text?: unknown }).text ?? "") : "")).filter((part) => part.trim()).join("\n\u3000\n")
          : "";
        if (text.trim() && isUsableReply(text)) second = finalizeReplyDetailed(text, new ReplyGuard(guardContext));
      } else {
        await retry.body?.cancel().catch(() => undefined);
      }
    } catch {
      second = null;
    }
    const candidates = [first, second].filter((reply): reply is { text: string; damage: number } => Boolean(reply && reply.text));
    if (candidates.length === 0) return UNAVAILABLE_REPLY;
    return candidates.reduce((best, reply) => (reply.damage < best.damage ? reply : best)).text;
  };

  const upstreamSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(MINIMAX_UPSTREAM, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(buildUpstreamBody(serverBlocks)),
      signal: upstreamSignal,
    });
  } catch {
    return jsonError(req, upstreamSignal.aborted ? "model request timed out" : "model service unavailable", upstreamSignal.aborted ? 504 : 502);
  }

  const headers = new Headers(companionCorsHeaders(req));
  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  if (!upstream.ok || !upstream.body) return new Response(upstream.body, { status: upstream.status, headers });

  // Every reply passes through the guard before it reaches the reader.
  if (contentType.includes("text/event-stream")) {
    return new Response(guardSseStream(upstream.body, finalize), { status: upstream.status, headers });
  }
  if (contentType.includes("application/json")) {
    try {
      return new Response(JSON.stringify(await guardMessage(await upstream.json(), finalize)), { status: upstream.status, headers });
    } catch {
      return jsonError(req, "model service unavailable", 502);
    }
  }
  return new Response(upstream.body, { status: upstream.status, headers });
});
