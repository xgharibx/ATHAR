/**
 * The assistant's model on OpenAI (GPT-6 Luna), behind the message shape the
 * rest of this function, and the app, already speak.
 *
 * Every step here (the evidence step, the trusted search, the answer and its
 * retry) builds a Messages-style request: system blocks, user and assistant
 * turns, tools with an input schema, and a reasoning depth. `openAiRequest`
 * turns that into a Responses API request; `openAiMessage` turns the reply
 * back into a message with text, tool_use and web_search_tool_result blocks;
 * and `openAiEventStream` turns the streamed reply into the same server-sent
 * events (message_start, content_block_*, message_delta, message_stop), so the
 * guard in stream.ts and the app's reader are unchanged.
 *
 * Web search: OpenAI's search tool is restricted to the trusted domains by the
 * tool itself. It returns no page text, only the model's own sentences with a
 * citation for each source, so those sentences become the search results'
 * excerpts. Being written by the model, they are given to the answering model
 * as information but are never trusted as quotable text (see index.ts).
 */
import { TRUSTED_SOURCE_DOMAINS } from "./sources.ts";

export const OPENAI_UPSTREAM = "https://api.openai.com/v1/responses";
export const OPENAI_DEFAULT_MODEL = "gpt-6-luna";
/** Models the server may be pointed at (COMPANION_MODEL); anything else falls back to Luna. */
export const OPENAI_MODELS = new Set([OPENAI_DEFAULT_MODEL, "gpt-6-sol"]);

type Block = { type?: string; text?: string };
type MessagesTool = { type?: string; name?: string; description?: string; input_schema?: unknown };
export type MessagesRequest = {
  model?: string;
  max_tokens?: number;
  stream?: boolean;
  system?: string | Block[];
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: MessagesTool[];
  output_config?: { effort?: string };
  thinking?: unknown;
};

const EFFORTS = new Set(["minimal", "low", "medium", "high"]);

function systemText(system: MessagesRequest["system"]): string {
  if (typeof system === "string") return system;
  if (!Array.isArray(system)) return "";
  return system.map((block) => String(block?.text ?? "")).filter((text) => text.trim()).join("\n\n");
}

/** A Messages-style request as an OpenAI Responses request. */
export function openAiRequest(body: MessagesRequest, model: string, forceTool = false): Record<string, unknown> {
  const tools: Record<string, unknown>[] = [];
  for (const tool of body.tools ?? []) {
    if (!tool || typeof tool !== "object") continue;
    if (typeof tool.type === "string" && tool.type.startsWith("web_search")) {
      // The allowed sources are enforced by the tool, not only by instruction.
      tools.push({ type: "web_search", filters: { allowed_domains: TRUSTED_SOURCE_DOMAINS } });
      continue;
    }
    if (typeof tool.name !== "string") continue;
    tools.push({
      type: "function",
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.input_schema ?? { type: "object", properties: {} },
      strict: false,
    });
  }
  const effort = body.output_config?.effort;
  const request: Record<string, unknown> = {
    model,
    instructions: systemText(body.system),
    input: (body.messages ?? []).map((message) => ({ role: message.role, content: message.content })),
    max_output_tokens: body.max_tokens,
    stream: body.stream === true,
    store: false,
    reasoning: { effort: typeof effort === "string" && EFFORTS.has(effort) ? effort : "low" },
  };
  if (tools.length > 0) {
    request.tools = tools;
    // A step that exists to call its tool (the evidence step, the search) must call it.
    if (forceTool) request.tool_choice = "required";
  }
  return request;
}

type OutputItem = {
  type?: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; url?: string; title?: string; start_index?: number; end_index?: number }> }>;
};

function parseArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** What the model wrote for one source: the text between the previous citation and this one. */
function citedSpan(text: string, from: number, to: number): string {
  const span = text.slice(Math.max(0, from), Math.max(0, Math.min(to, text.length)));
  return span
    .replace(/\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The model's sources, from its citations: one result per page. */
function citationResults(items: OutputItem[]): Array<{ type: string; url: string; title: string; content: string }> {
  const byUrl = new Map<string, { type: string; url: string; title: string; content: string }>();
  for (const item of items) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      const text = String(part.text ?? "");
      const notes = (part.annotations ?? [])
        .filter((note) => note.type === "url_citation" && typeof note.url === "string")
        .sort((a, b) => (a.start_index ?? 0) - (b.start_index ?? 0));
      let previousEnd = 0;
      for (const note of notes) {
        const url = String(note.url).replace(/[?&]utm_source=openai$/, "");
        const start = note.start_index ?? 0;
        const excerpt = citedSpan(text, previousEnd, start);
        previousEnd = Math.max(previousEnd, note.end_index ?? start);
        const known = byUrl.get(url);
        if (known) {
          if (excerpt && !known.content.includes(excerpt)) known.content = `${known.content} ${excerpt}`.trim();
          continue;
        }
        byUrl.set(url, { type: "web_search_result", url, title: String(note.title ?? ""), content: excerpt });
      }
    }
  }
  return [...byUrl.values()];
}

function stopReason(response: { status?: string; incomplete_details?: { reason?: string } | null }, hasToolUse: boolean): string {
  if (response.status === "incomplete") {
    return response.incomplete_details?.reason === "content_filter" ? "refusal" : "max_tokens";
  }
  return hasToolUse ? "tool_use" : "end_turn";
}

/** A Responses API reply as a message with text, tool_use and web_search_tool_result blocks. */
export function openAiMessage(response: unknown, model: string): Record<string, unknown> {
  const reply = (response ?? {}) as {
    id?: string;
    status?: string;
    incomplete_details?: { reason?: string } | null;
    output?: OutputItem[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const items = Array.isArray(reply.output) ? reply.output : [];
  const content: Record<string, unknown>[] = [];
  const results = citationResults(items);
  if (results.length > 0) content.push({ type: "web_search_tool_result", tool_use_id: "web_search", content: results });
  for (const item of items) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && typeof part.text === "string") content.push({ type: "text", text: part.text });
        if (part.type === "refusal") content.push({ type: "text", text: "" });
      }
    } else if (item.type === "function_call" && typeof item.name === "string") {
      content.push({ type: "tool_use", id: item.call_id ?? item.id ?? "call", name: item.name, input: parseArguments(item.arguments) });
    }
  }
  const hasToolUse = content.some((block) => block.type === "tool_use");
  const refused = items.some((item) => item.type === "message" && (item.content ?? []).some((part) => part.type === "refusal"));
  return {
    id: reply.id ?? "msg",
    type: "message",
    role: "assistant",
    model,
    content: content.filter((block) => block.type !== "text" || String(block.text ?? "") !== "" || !refused),
    stop_reason: refused ? "refusal" : stopReason(reply, hasToolUse),
    stop_sequence: null,
    usage: { input_tokens: reply.usage?.input_tokens ?? 0, output_tokens: reply.usage?.output_tokens ?? 0 },
  };
}

function sse(type: string, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
}

/**
 * The streamed Responses API reply as Messages-style server-sent events:
 * each output text and each function call becomes a content block.
 */
export function openAiEventStream(upstream: ReadableStream<Uint8Array>, model: string): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  let buffer = "";
  let started = false;
  let finished = false;
  let nextIndex = 0;
  let hasToolUse = false;
  let outputTokens = 0;
  // Content block index of each text part ("item:part") and function call (item id).
  const textBlocks = new Map<string, number>();
  const callBlocks = new Map<string, number>();
  const open = new Set<number>();

  const start = (): string => {
    if (started) return "";
    started = true;
    return sse("message_start", {
      message: { id: "msg", type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } },
    });
  };
  const closeAll = (): string => {
    let out = "";
    for (const index of [...open].sort((a, b) => a - b)) out += sse("content_block_stop", { index });
    open.clear();
    return out;
  };
  const finish = (reason: string): string => {
    if (finished) return "";
    finished = true;
    return start() + closeAll()
      + sse("message_delta", { delta: { stop_reason: reason, stop_sequence: null }, usage: { output_tokens: outputTokens } })
      + sse("message_stop", {});
  };

  const handle = (event: Record<string, unknown>): string => {
    const type = String(event.type ?? "");
    let out = start();
    if (type === "response.output_text.delta") {
      const key = `${event.item_id ?? event.output_index}:${event.content_index ?? 0}`;
      let index = textBlocks.get(key);
      if (index === undefined) {
        index = nextIndex++;
        textBlocks.set(key, index);
        open.add(index);
        out += sse("content_block_start", { index, content_block: { type: "text", text: "" } });
      }
      out += sse("content_block_delta", { index, delta: { type: "text_delta", text: String(event.delta ?? "") } });
    } else if (type === "response.output_text.done") {
      const index = textBlocks.get(`${event.item_id ?? event.output_index}:${event.content_index ?? 0}`);
      if (index !== undefined && open.delete(index)) out += sse("content_block_stop", { index });
    } else if (type === "response.output_item.added") {
      const item = (event.item ?? {}) as OutputItem;
      if (item.type === "function_call" && typeof item.name === "string") {
        const index = nextIndex++;
        callBlocks.set(String(item.id ?? item.call_id), index);
        open.add(index);
        hasToolUse = true;
        out += sse("content_block_start", { index, content_block: { type: "tool_use", id: item.call_id ?? item.id ?? "call", name: item.name, input: {} } });
      }
    } else if (type === "response.function_call_arguments.delta") {
      const index = callBlocks.get(String(event.item_id));
      if (index !== undefined) out += sse("content_block_delta", { index, delta: { type: "input_json_delta", partial_json: String(event.delta ?? "") } });
    } else if (type === "response.output_item.done") {
      const item = (event.item ?? {}) as OutputItem;
      const index = callBlocks.get(String(item.id ?? item.call_id));
      if (index !== undefined && open.delete(index)) out += sse("content_block_stop", { index });
    } else if (type === "response.completed" || type === "response.incomplete") {
      const response = (event.response ?? {}) as { status?: string; incomplete_details?: { reason?: string } | null; usage?: { output_tokens?: number } };
      outputTokens = response.usage?.output_tokens ?? outputTokens;
      out += finish(stopReason(response, hasToolUse));
    } else if (type === "response.refusal.delta" || type === "response.refusal.done") {
      if (type === "response.refusal.done") out += finish("refusal");
    } else if (type === "response.failed" || type === "error") {
      out += closeAll() + sse("error", { error: { type: "api_error", message: "model service error" } });
      finished = true;
    }
    return out;
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          // A stream cut short still closes as a message.
          const tail = finished ? "" : finish("end_turn");
          if (tail) controller.enqueue(encoder.encode(tail));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let out = "";
        for (;;) {
          const boundary = /\r?\n\r?\n/.exec(buffer);
          if (!boundary) break;
          const raw = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);
          const data = raw.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("");
          if (!data || data === "[DONE]") continue;
          try {
            out += handle(JSON.parse(data) as Record<string, unknown>);
          } catch {
            // An event that is not JSON carries nothing to pass on.
          }
        }
        if (out) {
          controller.enqueue(encoder.encode(out));
          return;
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/**
 * Calls OpenAI with a Messages-style request and answers as the Messages API
 * would: JSON for a single reply, server-sent events for a streamed one, and
 * the provider's own status when it fails.
 */
export async function callOpenAi(body: MessagesRequest, apiKey: string, model: string, signal: AbortSignal, forceTool = false): Promise<Response> {
  const upstream = await fetch(OPENAI_UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(openAiRequest(body, model, forceTool)),
    signal,
  });
  if (!upstream.ok || !upstream.body) return upstream;
  if (body.stream === true) {
    return new Response(openAiEventStream(upstream.body, model), {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }
  const message = openAiMessage(await upstream.json(), model);
  return new Response(JSON.stringify(message), { status: 200, headers: { "Content-Type": "application/json" } });
}
