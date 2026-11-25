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
import { buildAyahBlock, gatherTafsirs, readAyahRequest } from "./ayah.ts";
import { companionCorsHeaders } from "./cors.ts";
import { EVIDENCE_STEP_SYSTEM, EVIDENCE_TOOL, buildEvidenceBlock, gatherHadith, gatherVerses, loadQuran, readEvidencePlan } from "./evidence.ts";
import { type GuardContext, ReplyGuard, UNAVAILABLE_REPLY, finalizeReplyDetailed, isUsableReply } from "./guard.ts";
import { CLIENT_BASE_PROMPT_OPENING, CLIENT_CONTEXT_HEADING, CREATE_REMINDER_TOOL, SERVER_SYSTEM_PROMPT, focusClientContext } from "./prompt.ts";
import { SEARCH_STEP_SYSTEM, buildTrustedResultsBlock, selectTrustedResults } from "./sources.ts";
import { guardMessage, guardSseStream } from "./stream.ts";

const COMPANION_TOOL_NAMES = new Set(["next_step", "cite", "search_library", "create_reminder"]);
// What is kept of a client's context after it has been focused. The request
// body as a whole is bounded separately.
const MAX_CLIENT_CONTEXT_CHARS = 4_000;
const MAX_MESSAGES = 16;
const MAX_HISTORY_CHARS = 48_000;
const MAX_LATEST_USER_MESSAGE_CHARS = 8_000;

const DEFAULT_MODEL = "MiniMax-M3.1-Flash";
// The answering model, chosen on the server (COMPANION_MODEL secret): the
// default Flash model reasons at a tunable depth; MiniMax-M3 (twice the price)
// takes reasoning on or off. Anything else falls back to the default.
const MINIMAX_MODEL: string = (() => {
  const chosen = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno?.env?.get("COMPANION_MODEL")?.trim();
  return chosen === "MiniMax-M3" || chosen === DEFAULT_MODEL ? chosen : DEFAULT_MODEL;
})();
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
// A question that deserves more thought (a ruling with its evidence, a long
// question, a comparison, a plan, a request for detail) is answered with
// deeper reasoning; everything else stays fast. Deeper reasoning takes longer,
// so its request may run longer too, and a regenerated reply is always fast.
const DEEP_REASONING_EFFORT = "medium";
const DEEP_UPSTREAM_TIMEOUT_MS = 100_000;
const DEEP_QUESTION_MIN_CHARS = 280;
const DETAIL_REQUEST =
  /بالتفصيل|تفصيل|فصّل|فصل لي|اشرح|اشرحي|وضّح|وضح لي|ما الفرق|الفرق بين|قارن|مقارنة|خطة|برنامج|جدول|رتب لي|رتّب لي|خطوات|أدلة|الأدلة|أقوال العلماء|الخلاف|المذاهب/;
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
const RETRY_INSTRUCTION = "تنبيه أخير: اكتب الجواب النهائي وحده، بلا مخطط ولا ملاحظات، بالعربية الفصحى، بحروف عربية فقط، في جمل قصيرة تامة المعنى. لا تكتب بأي لغة أخرى ولا بحروف لاتينية، ولا تروِ عن النبي ﷺ قولًا أو فعلًا بعبارتك؛ الدليل يظهر في كتلته فقط.";
const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 60_000;
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 24;
const MAX_ANON_REQ_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 4096;
const limiter = new Map<string, { count: number; startAt: number }>();

/** The two supported models take different reasoning controls. */
function reasoningSettings(effort: string): Record<string, unknown> {
  if (MINIMAX_MODEL === "MiniMax-M3.1-Flash") return { output_config: { effort } };
  // MiniMax-M3 has no depth setting: it reasons only when asked to.
  return effort === REASONING_EFFORT ? {} : { thinking: { type: "adaptive" } };
}

/** Whether a question is worth deeper reasoning. */
function wantsDeepReasoning(question: string): boolean {
  const text = question.trim();
  if (text.length >= DEEP_QUESTION_MIN_CHARS) return true;
  if (DETAIL_REQUEST.test(text)) return true;
  return RULING_QUESTION.test(text) && text.length >= 40;
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

function jsonError(req: Request, message: string, status: number, type = "invalid_request_error"): Response {
  return new Response(
    JSON.stringify({ type: "error", error: { type, message } }),
    { status, headers: { "Content-Type": "application/json", ...companionCorsHeaders(req) } },
  );
}

/**
 * What the reader is told when the model service itself refuses the request.
 *
 * A rejected or exhausted service key is the server's problem, not the
 * reader's: it is reported as the service being unavailable, never passed
 * through as an authentication error (which the app would read as "sign in
 * again" and which retrying can never fix).
 */
function upstreamFailure(status: number): { status: number; type: string; message: string } {
  if (status === 401 || status === 403 || status === 402) {
    return { status: 503, type: "service_unavailable", message: "model service unavailable" };
  }
  if (status === 429 || status === 529) return { status: 503, type: "overloaded_error", message: "model service busy" };
  return { status: 502, type: "api_error", message: "model service error" };
}

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
}

/**
 * Progress the app shows while a reply is prepared. Sent as events of their
 * own type, which clients that do not know them skip.
 */
type Stage = "gathering" | "searching" | "writing" | "verifying";

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

  let body: { model?: unknown; max_tokens?: unknown; stream?: boolean; system?: unknown; messages?: unknown; tools?: unknown; athar_ayah?: unknown };
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

  // «اسأل عن الآية» from «القرآن ٢»: answered only from that ayah's tafsirs,
  // which the server fetches itself (see ayah.ts). A malformed reference is
  // refused rather than answered as an ordinary question.
  const ayahRequest = body.athar_ayah === undefined ? null : readAyahRequest(body.athar_ayah);
  if (body.athar_ayah !== undefined && !ayahRequest) return jsonError(req, "invalid ayah", 400);

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
      // Only reminders remain a tool, defined by the server. Buttons to a page
      // are written as an action block (one way, not two that the model mixed
      // up), and library excerpts are no longer given to the model, so there
      // is nothing for the citation tool to point at.
      if (name === "create_reminder" && !clientTools.includes(CREATE_REMINDER_TOOL)) clientTools.push(CREATE_REMINDER_TOOL);
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
  const deep = wantsDeepReasoning(boundedMessages.messages[boundedMessages.messages.length - 1]?.content ?? "");
  const buildUpstreamBody = (serverBlocks: string[], fast = false): Record<string, unknown> => {
    const thinkDeeper = deep && !fast;
    // The base instructions are the server's. Of what a client sends after
    // its own base instructions, the description of the moment is kept.
    // A question about an ayah is answered from the server's tafsir block alone.
    const clientBlocks: Array<{ type: string; text: string }> = ayahRequest ? [] : (Array.isArray(body.system) ? body.system : [body.system])
      .map((block) => (typeof block === "string" ? block : String((block as { text?: unknown } | null)?.text ?? "")))
      .filter((text) => text && !text.trimStart().startsWith(CLIENT_BASE_PROMPT_OPENING))
      .map((text) => focusClientContext(text).slice(0, MAX_CLIENT_CONTEXT_CHARS))
      .filter(Boolean)
      .map((text) => ({ type: "text", text: `${CLIENT_CONTEXT_HEADING}\n${text}` }));
    const system = [
      { type: "text", text: SERVER_SYSTEM_PROMPT },
      ...clientBlocks,
      ...serverBlocks.filter(Boolean).map((text) => ({ type: "text", text })),
    ];
    return {
      model: MINIMAX_MODEL,
      // Reasoning counts toward max_tokens: a deeper answer gets the full room.
      max_tokens: thinkDeeper ? MAX_TOKENS_CAP : maxOutputTokens,
      stream: body.stream === true,
      system,
      messages: boundedMessages.messages,
      ...(clientTools.length > 0 ? { tools: clientTools } : {}),
      ...reasoningSettings(thinkDeeper ? DEEP_REASONING_EFFORT : REASONING_EFFORT),
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
  type Gathered = {
    plan: typeof NO_PLAN & { followUps?: string[] };
    guardContext: GuardContext;
    serverBlocks: string[];
    /** A question about an ayah: how many of its tafsirs were found. */
    tafsirs?: number;
  };
  const gatherForAyah = async (request: NonNullable<typeof ayahRequest>, onStage: (stage: Stage) => void): Promise<Gathered> => {
    onStage("gathering");
    const [quran, tafsirs] = await Promise.all([
      loadQuran(denoRuntime.env.get("QURAN_DATA_URL")),
      gatherTafsirs(request),
    ]);
    const verse = gatherVerses(quran, [`${request.surah}:${request.ayah}`])[0];
    return {
      plan: NO_PLAN,
      guardContext: {
        quran,
        hadith: [],
        // Only the tafsirs may be quoted (and the Quran, checked by the guard).
        trustedTexts: tafsirs.map((t) => t.text),
        sourceUrls: [],
        userTexts: boundedMessages.messages.filter((message) => message.role === "user").slice(-2).map((message) => message.content),
      },
      serverBlocks: [buildAyahBlock(request, verse?.text ?? "", tafsirs)],
      tafsirs: tafsirs.length,
    };
  };
  const gather = async (onStage: (stage: Stage) => void): Promise<Gathered> => {
    if (ayahRequest) return gatherForAyah(ayahRequest, onStage);
    if (substantive) onStage("gathering");
    if (searchEarly && substantive) onStage("searching");
    const earlySearch = searchTrustedSources(searchEarly).catch(() => []);
    const [plan, quran] = await Promise.all([
      planEvidence().catch(() => NO_PLAN),
      loadQuran(denoRuntime.env.get("QURAN_DATA_URL")),
    ]);
    if (!searchEarly && plan.needsSources) onStage("searching");
    const [hadith, webResults] = await Promise.all([
      gatherHadith(plan.hadithQueries, plan.wantsWording),
      searchEarly ? earlySearch : searchTrustedSources(plan.needsSources).catch(() => []),
    ]);
    const verses = gatherVerses(quran, plan.quranReferences);
    return {
      plan,
      guardContext: {
        quran,
        hadith,
        // The app's own library excerpts arrive in the system prompt; together
        // with the trusted web excerpts they are the only other quotable text.
        trustedTexts: [systemText, ...webResults.map((result) => result.excerpt)],
        sourceUrls: webResults.map((result) => result.url),
        userTexts: boundedMessages.messages.filter((message) => message.role === "user").slice(-2).map((message) => message.content),
      },
      serverBlocks: [
        webResults.length > 0 ? buildTrustedResultsBlock(webResults) : "",
        buildEvidenceBlock(hadith, verses),
      ],
    };
  };

  // Every reply is cleaned and verified before it reaches the reader. A reply
  // that is not usable Arabic, or that lost much of its content in cleaning,
  // is regenerated once and the better of the two is kept. If neither is
  // usable the reader gets a plain message instead of fragments.
  const makeFinalize = ({ guardContext, serverBlocks }: Gathered) => async (rawText: string): Promise<string> => {
    if (!rawText.trim()) return "";
    const first = isUsableReply(rawText) ? finalizeReplyDetailed(rawText, new ReplyGuard(guardContext)) : null;
    if (first && first.text && first.damage < RETRY_DAMAGE_THRESHOLD) return first.text;
    let second: { text: string; damage: number } | null = null;
    try {
      const retry = await fetch(MINIMAX_UPSTREAM, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify({ ...buildUpstreamBody([...serverBlocks, RETRY_INSTRUCTION], true), stream: false, tools: undefined }),
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

  // The answering call. Its failures are reported, never passed through.
  type Answer = { ok: true; upstream: Response; gathered: Gathered } | { ok: false; status: number; type: string; message: string };
  const answer = async (onStage: (stage: Stage) => void): Promise<Answer> => {
    const gathered = await gather(onStage);
    onStage("writing");
    const upstreamSignal = AbortSignal.timeout(deep ? DEEP_UPSTREAM_TIMEOUT_MS : UPSTREAM_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(MINIMAX_UPSTREAM, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify(buildUpstreamBody(gathered.serverBlocks)),
        signal: upstreamSignal,
      });
    } catch {
      return upstreamSignal.aborted
        ? { ok: false, status: 504, type: "api_error", message: "model request timed out" }
        : { ok: false, status: 502, type: "api_error", message: "model service unavailable" };
    }
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel().catch(() => undefined);
      const failure = upstreamFailure(upstream.status);
      console.error(`companion: model service answered ${upstream.status}`);
      return { ok: false, ...failure };
    }
    return { ok: true, upstream, gathered };
  };

  // A streamed request is answered at once, and the reader sees each step
  // (gathering evidence, searching, writing, verifying) while it happens.
  // The reply text itself still arrives only once it has been verified.
  if (body.stream === true) {
    const encoder = new TextEncoder();
    const headers = new Headers(companionCorsHeaders(req));
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (text: string) => {
          try { controller.enqueue(encoder.encode(text)); } catch { /* reader gone */ }
        };
        const sent = new Set<Stage>();
        const onStage = (stage: Stage) => {
          if (sent.has(stage)) return;
          sent.add(stage);
          send(sseEvent("athar_status", { stage }));
        };
        try {
          const result = await answer(onStage);
          if (!result.ok) {
            send(sseEvent("error", { error: { type: result.type, message: result.message } }));
            return;
          }
          const followUps = result.gathered.plan.followUps ?? [];
          if (followUps.length > 0) send(sseEvent("athar_followups", { items: followUps }));
          // The app shows an answer about an ayah only after this confirmation
          // that it was bound to the ayah's tafsirs (an older server would not send it).
          if (result.gathered.tafsirs !== undefined) send(sseEvent("athar_ayah", { tafsirs: result.gathered.tafsirs }));
          const reader = guardSseStream(result.upstream.body!, makeFinalize(result.gathered), () => onStage("verifying")).getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch {
          send(sseEvent("error", { error: { type: "api_error", message: "model service error" } }));
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });
    return new Response(stream, { status: 200, headers });
  }

  const result = await answer(() => undefined);
  if (!result.ok) return jsonError(req, result.message, result.status, result.type);
  const { upstream } = result;
  const finalize = makeFinalize(result.gathered);

  const headers = new Headers(companionCorsHeaders(req));
  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");

  // Every reply passes through the guard before it reaches the reader.
  if (contentType.includes("text/event-stream")) {
    return new Response(guardSseStream(upstream.body!, finalize), { status: upstream.status, headers });
  }
  if (contentType.includes("application/json")) {
    try {
      return new Response(JSON.stringify(await guardMessage(await upstream.json(), finalize)), { status: upstream.status, headers });
    } catch {
      return jsonError(req, "model service unavailable", 502, "api_error");
    }
  }
  return new Response(upstream.body, { status: upstream.status, headers });
});
