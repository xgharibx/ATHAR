import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const quranJson = fs.readFileSync(path.resolve("public/data/quran.json"), "utf8");

type Options = {
  userId?: string | null;
  userLookupError?: boolean;
  quotaAllowed?: boolean | null;
  quotaError?: boolean;
  upstreamFailure?: boolean;
  upstreamTimeout?: boolean;
  searchContent?: unknown[];
  planContent?: unknown[];
  dorarHtml?: string;
  quranUnavailable?: boolean;
  answer?: string;
  retryAnswer?: string;
  searchFailure?: boolean;
  upstreamStatus?: number;
  sseAnswer?: string;
  /** Answer through OpenAI (OPENAI_API_KEY set): output items of a Responses reply. */
  openai?: { output?: unknown[]; searchOutput?: unknown[]; stream?: string; key?: string };
};

function edge(options: Options = {}) {
  let handler: (request: Request) => Promise<Response> | Response;
  let clientConfig: unknown[] | undefined;
  const calls: { type: string; detail?: unknown }[] = [];
  const client = {
    auth: {
      getUser: async (token: string) => {
        calls.push({ type: "auth", detail: token });
        return options.userLookupError || token !== "synthetic-user-token"
          ? { data: { user: null }, error: { message: "invalid token" } }
          : { data: { user: { id: options.userId ?? "synthetic-user-id" } }, error: null };
      },
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ type: "rpc", detail: { name, args } });
      return options.quotaError
        ? { data: null, error: { message: "quota RPC unavailable" } }
        : { data: options.quotaAllowed ?? true, error: null };
    },
  };
  const sourcePath = path.resolve("supabase/functions/companion/index.ts");
  const source = fs.readFileSync(sourcePath, "utf8").replace(/^import .*;\r?\n/gm, "");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  // Supporting modules are loaded into the same context, in dependency order.
  const moduleJs = ["text", "quran", "ayah", "hadith", "sources", "openai", "evidence", "guard", "prompt", "stream", "cors"] /* dependency order */.map((name) => {
    const moduleSource = fs.readFileSync(path.resolve(`supabase/functions/companion/${name}.ts`), "utf8")
      .replace(/^import .*;\r?\n/gm, "")
      .replace(/^export /gm, "");
    return ts.transpileModule(moduleSource, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText;
  });
  const sandbox = {
    console,
    createClient: (...args: unknown[]) => { clientConfig = args; return client; },
    Request,
    Response,
    Headers,
    URL,
    TextDecoder,
    TextEncoder,
    ReadableStream,
    fetch: async (url: string, init: RequestInit = {}) => {
      if (String(url).includes("quran.json")) {
        return new Response(options.quranUnavailable ? "unavailable" : quranJson, { status: options.quranUnavailable ? 503 : 200 });
      }
      if (String(url).includes("api.quran.com/api/v4/tafsirs/")) {
        const id = /tafsirs\/(\d+)\//.exec(String(url))?.[1];
        calls.push({ type: "tafsir", detail: { url: String(url) } });
        return new Response(JSON.stringify({ tafsir: { text: `<p>شرح التفسير رقم ${id} لهذه الآية<sup>1</sup>، وفيه أن الله هو الحي القيوم.</p>` } }), { status: 200 });
      }
      if (String(url).includes("dorar.net")) {
        calls.push({ type: "dorar", detail: { url: decodeURIComponent(String(url)) } });
        return new Response(JSON.stringify({ ahadith: { result: options.dorarHtml ?? "" } }), { status: 200 });
      }
      if (String(url).startsWith("https://api.openai.com/")) {
        const body = String(init.body);
        const kind = body.includes('"find_evidence"') ? "plan" : "upstream";
        calls.push({ type: kind, detail: { ...init, url: String(url) } });
        const reply = (output: unknown[]) => new Response(JSON.stringify({ id: "resp", status: "completed", output, usage: { input_tokens: 3, output_tokens: 4 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        if (kind === "plan") return reply([]);
        if (body.includes('"web_search"')) return reply(options.openai?.searchOutput ?? []);
        if (body.includes('"stream":true') && options.openai?.stream !== undefined) {
          return new Response(options.openai.stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
        }
        return reply(options.openai?.output ?? []);
      }
      if (String(init.body).includes('"find_evidence"')) {
        calls.push({ type: "plan", detail: init });
        return new Response(JSON.stringify({ content: options.planContent ?? [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      calls.push({ type: "upstream", detail: init });
      if (options.upstreamTimeout || options.upstreamFailure) throw new Error("synthetic upstream failure");
      if (String(init.body).includes("web_search_20250305")) {
        if (options.searchFailure) return new Response("search unavailable", { status: 500 });
        return new Response(JSON.stringify({ content: options.searchContent ?? [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (options.upstreamStatus) {
        return new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "token is unusable" } }), {
          status: options.upstreamStatus,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (options.sseAnswer !== undefined && String(init.body).includes('"stream":true')) {
        const ev = (type: string, data: Record<string, unknown>) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
        const body = ev("message_start", { message: { id: "m", type: "message", role: "assistant", content: [], usage: { input_tokens: 1, output_tokens: 1 } } })
          + ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } })
          + ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: options.sseAnswer } })
          + ev("content_block_stop", { index: 0 })
          + ev("message_delta", { delta: { stop_reason: "end_turn" }, usage: { output_tokens: 5 } })
          + ev("message_stop", {});
        return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
      }
      if (options.answer !== undefined) {
        const retried = String(init.body).includes("تنبيه أخير");
        const text = retried && options.retryAnswer !== undefined ? options.retryAnswer : options.answer;
        return new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("synthetic-upstream", { status: 200, headers: { "Content-Type": "text/plain" } });
    },
    AbortSignal: {
      timeout: (ms: number) => options.upstreamTimeout
        ? AbortSignal.abort(new DOMException("synthetic timeout", "TimeoutError"))
        : AbortSignal.timeout(ms),
    },
    Deno: {
      serve: (fn: typeof handler) => { handler = fn; },
      env: {
        get: (name: string) => ({
          MINIMAX_API_KEY: "synthetic-provider-key",
          ...(options.openai ? { OPENAI_API_KEY: options.openai.key ?? "synthetic-openai-key" } : {}),
          SUPABASE_URL: "https://synthetic.supabase.co",
          SUPABASE_ANON_KEY: "synthetic-publishable-key",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
        } as Record<string, string>)[name],
      },
    },
  };
  const context = vm.createContext(sandbox);
  for (const js of moduleJs) vm.runInContext(js, context);
  vm.runInContext(js, context);

  const sendRaw = (body: string, authorization?: string) => handler(new Request("https://synthetic.invalid/companion/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: "synthetic-publishable-key",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
  }));

  const send = (authorization?: string) => sendRaw(JSON.stringify({
      model: "MiniMax-M3",
      max_tokens: 512,
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "synthetic question" }],
    }), authorization);

  return { send, sendRaw, sendRequest: (request: Request) => handler(request), calls, getClientConfig: () => clientConfig };
}

describe("Companion Edge Function access controls", () => {
  it("allows the authenticated SDK headers through browser preflight", async () => {
    const app = edge();
    const sdkRequestHeaders = [
      "authorization", "apikey", "cache-control", "content-type", "x-api-key", "x-client-info",
      "anthropic-version", "anthropic-dangerous-direct-browser-access", "x-stainless-retry-count",
      "x-stainless-timeout", "x-stainless-lang", "x-stainless-package-version", "x-stainless-os",
      "x-stainless-arch", "x-stainless-runtime", "x-stainless-runtime-version", "x-stainless-helper",
    ];
    const response = await app.sendRequest(new Request("https://synthetic.invalid/companion/v1/messages", {
      method: "OPTIONS",
      headers: {
        Origin: "https://athark.org",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": sdkRequestHeaders.join(", "),
      },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://athark.org");
    const allowedHeaders = response.headers.get("Access-Control-Allow-Headers")?.toLowerCase() ?? "";
    const allowedHeaderNames = allowedHeaders.split(",").map((header) => header.trim());
    for (const name of sdkRequestHeaders) {
      expect(allowedHeaderNames).toContain(name);
    }
    expect(app.calls).toEqual([]);
  });

  it("allows guest calls with the public key and reserves the shared anonymous budget", async () => {
    const app = edge();
    const response = await app.send("Bearer synthetic-publishable-key");

    expect(response.status).toBe(200);
    expect(app.calls.map((call) => call.type)).toEqual(["rpc", "plan", "upstream"]);
    expect(app.calls[0]?.detail).toMatchObject({
      name: "reserve_companion_anonymous_request",
      args: { p_request_bytes: expect.any(Number), p_max_output_tokens: 4096 },
    });
  });

  it("rejects missing bearer credentials", async () => {
    const app = edge();
    const response = await app.send();

    expect(response.status).toBe(401);
    expect(app.calls.some((call) => call.type === "upstream")).toBe(false);
  });

  it("stops anonymous requests when the shared usage budget is exhausted", async () => {
    const app = edge({ quotaAllowed: false });
    const response = await app.send("Bearer synthetic-publishable-key");

    expect(response.status).toBe(429);
    expect(app.calls).toHaveLength(1);
    expect(app.calls.some((call) => call.type === "upstream")).toBe(false);
  });

  it("limits guest requests to five per minute per client", async () => {
    const app = edge();
    const responses: Response[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await app.send("Bearer synthetic-publishable-key"));
    }

    expect(responses.slice(0, 5).every((response) => response.status === 200)).toBe(true);
    expect(responses[5]?.status).toBe(429);
    expect(app.calls.filter((call) => call.type === "rpc")).toHaveLength(5);
    expect(app.calls.filter((call) => call.type === "upstream")).toHaveLength(5);
  });

  it("requires a valid Supabase user and a persistent quota reservation before spending", async () => {
    const app = edge();
    const response = await app.send("Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    expect(app.calls.map((call) => call.type)).toEqual(["auth", "rpc", "plan", "upstream"]);
    expect(app.calls[1]?.detail).toMatchObject({
      name: "reserve_companion_request",
      args: { p_user_id: "synthetic-user-id" },
    });
    expect(app.getClientConfig()).toEqual([
      "https://synthetic.supabase.co",
      "synthetic-service-key",
      { auth: { persistSession: false, autoRefreshToken: false } },
    ]);
    const upstreamCall = app.calls.find((call) => call.type === "upstream");
    expect((upstreamCall?.detail as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it("reserves the UTF-8 request size and effective output-token cap before spending", async () => {
    const app = edge();
    const payload = {
      model: "MiniMax-M3",
      max_tokens: 512,
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "السؤال" }],
    };
    const raw = JSON.stringify(payload);
    const response = await app.sendRaw(raw, "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    expect(app.calls[1]?.detail).toMatchObject({
      name: "reserve_companion_request",
      args: {
        p_user_id: "synthetic-user-id",
        p_request_bytes: new TextEncoder().encode(raw).byteLength,
        p_max_output_tokens: 4096,
      },
    });
  });

  it("bounds server-side history to the app privacy limits while keeping the newest question", async () => {
    const app = edge();
    const messages = Array.from({ length: 16 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `old-${index}:${"x".repeat(4_000)}`,
    }));
    messages.push({ role: "user", content: "latest question" });
    const response = await app.sendRaw(JSON.stringify({
      system: "synthetic system prompt",
      messages,
    }), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const upstreamCall = app.calls.find((call) => call.type === "upstream");
    const forwarded = JSON.parse(String((upstreamCall?.detail as RequestInit).body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(forwarded.messages.length).toBeLessThanOrEqual(16);
    expect(forwarded.messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(48_000);
    expect(forwarded.messages[0]?.role).toBe("user");
    expect(forwarded.messages.at(-1)?.content).toBe("latest question");
    expect(forwarded.messages.some((message) => message.content.includes("old-0:"))).toBe(false);
  });

  it("rejects an oversized latest question before auth, quota, or provider calls", async () => {
    const app = edge();
    const response = await app.sendRaw(JSON.stringify({
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "x".repeat(8_001) }],
    }), "Bearer synthetic-user-token");

    expect(response.status).toBe(413);
    expect(app.calls).toEqual([]);
  });

  it("rejects non-text message payloads that could bypass the character ceiling", async () => {
    const app = edge();
    const response = await app.sendRaw(JSON.stringify({
      system: "synthetic system prompt",
      messages: [{ role: "user", content: [{ type: "text", text: "synthetic question" }] }],
    }), "Bearer synthetic-user-token");

    expect(response.status).toBe(400);
    expect(app.calls).toEqual([]);
  });

  it("sets and reserves an output cap when a caller omits max_tokens", async () => {
    const app = edge();
    const payload = {
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "synthetic question" }],
    };
    const response = await app.sendRaw(JSON.stringify(payload), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    expect(app.calls[1]?.detail).toMatchObject({
      name: "reserve_companion_request",
      args: { p_max_output_tokens: 4096 },
    });
    const upstreamCall = app.calls.find((call) => call.type === "upstream");
    expect(JSON.parse(String((upstreamCall?.detail as RequestInit).body))).toMatchObject({
      max_tokens: 8192,
    });
  });

  it("reserves and forwards only the server output cap when a caller requests more", async () => {
    const app = edge();
    const payload = {
      max_tokens: 9000,
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "synthetic question" }],
    };
    const response = await app.sendRaw(JSON.stringify(payload), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    expect(app.calls[1]?.detail).toMatchObject({
      name: "reserve_companion_request",
      args: { p_max_output_tokens: 4096 },
    });
    const upstreamCall = app.calls.find((call) => call.type === "upstream");
    expect(JSON.parse(String((upstreamCall?.detail as RequestInit).body))).toMatchObject({
      max_tokens: 8192,
    });
  });

  it.each([
    ["zero", 0],
    ["fractional", 1.5],
    ["string", "512"],
  ])("rejects an invalid output-token budget (%s) before auth or quota", async (_label, max_tokens) => {
    const app = edge();
    const response = await app.sendRaw(JSON.stringify({
      max_tokens,
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "synthetic question" }],
    }), "Bearer synthetic-user-token");

    expect(response.status).toBe(400);
    expect(app.calls).toEqual([]);
  });

  it("fails closed when the durable quota store is unavailable", async () => {
    const app = edge({ quotaError: true });
    const response = await app.send("Bearer synthetic-user-token");

    expect(response.status).toBe(503);
    expect(app.calls.some((call) => call.type === "upstream")).toBe(false);
  });

  it("rejects an exhausted daily or per-minute quota before MiniMax", async () => {
    const app = edge({ quotaAllowed: false });
    const response = await app.send("Bearer synthetic-user-token");

    expect(response.status).toBe(429);
    expect(app.calls.some((call) => call.type === "upstream")).toBe(false);
  });

  it("rejects an invalid user JWT before quota reservation", async () => {
    const app = edge({ userLookupError: true });
    const response = await app.send("Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(app.calls.map((call) => call.type)).toEqual(["auth"]);
  });

  it("returns a bounded gateway error when the provider is unreachable", async () => {
    const app = edge({ upstreamFailure: true });
    const response = await app.send("Bearer synthetic-user-token");

    expect(response.status).toBe(502);
    expect(app.calls.map((call) => call.type)).toEqual(["auth", "rpc", "plan", "upstream"]);
  });

  it.each(["null", "[]", "\"text\"", "42"])(
    "returns a client error for valid JSON that is not an object (%s)",
    async (body) => {
      const app = edge();
      const response = await app.sendRaw(body);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { type: "invalid_request_error" },
      });
      expect(app.calls).toEqual([]);
    },
  );

  it("returns a gateway timeout when the upstream deadline expires", async () => {
    const app = edge({ upstreamTimeout: true });
    const response = await app.send("Bearer synthetic-user-token");

    expect(response.status).toBe(504);
    expect(app.calls.map((call) => call.type)).toEqual(["auth", "rpc", "plan", "upstream"]);
  });

  it("measures request size in UTF-8 bytes instead of JavaScript characters", async () => {
    const app = edge();
    const oversizedUtf8Body = JSON.stringify({
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "ع".repeat(140_000) }],
    });
    expect(oversizedUtf8Body.length).toBeLessThan(256 * 1024);
    expect(new TextEncoder().encode(oversizedUtf8Body).byteLength).toBeGreaterThan(256 * 1024);

    const response = await app.sendRaw(oversizedUtf8Body, "Bearer synthetic-user-token");

    expect(response.status).toBe(413);
    expect(app.calls).toEqual([]);
  });

  it("cancels an oversized streaming body as soon as the byte cap is crossed", async () => {
    const app = edge();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(256 * 1024 + 1));
      },
      cancel() { cancelled = true; },
    });
    const request = new Request("https://synthetic.invalid/companion/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit);

    const response = await app.sendRequest(request);

    expect(response.status).toBe(413);
    expect(cancelled).toBe(true);
    expect(app.calls).toEqual([]);
  });
  const upstreamBodies = (app: ReturnType<typeof edge>) => app.calls
    .filter((call) => call.type === "upstream")
    .map((call) => JSON.parse(String((call.detail as RequestInit).body)) as Record<string, unknown>);

  it("forwards only known fields and locks the model and reasoning settings", async () => {
    const app = edge();
    const response = await app.sendRaw(JSON.stringify({
      model: "some-other-model",
      max_tokens: 512,
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "synthetic question" }],
      temperature: 2,
      thinking: { type: "disabled" },
      tool_choice: { type: "any" },
      metadata: { user_id: "x" },
      mcp_servers: [{ url: "https://attacker.invalid" }],
    }), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const [body] = upstreamBodies(app);
    expect(Object.keys(body ?? {}).sort()).toEqual(["max_tokens", "messages", "model", "output_config", "stream", "system"]);
    expect(body).toMatchObject({ model: "MiniMax-M3.1-Flash", output_config: { effort: "low" } });
  });

  it("thinks deeper, with the full token room, only for questions that deserve it", async () => {
    const ask = async (content: string) => {
      const app = edge();
      await app.sendRaw(JSON.stringify({ max_tokens: 512, system: "synthetic system prompt", messages: [{ role: "user", content }] }), "Bearer synthetic-user-token");
      return upstreamBodies(app).at(-1) ?? {};
    };
    expect(await ask("السلام عليكم")).toMatchObject({ output_config: { effort: "low" }, max_tokens: 4096 });
    expect(await ask("اشرح لي الفرق بين الفرض والواجب بالتفصيل")).toMatchObject({ output_config: { effort: "medium" }, max_tokens: 8192 });
    expect(await ask("ما حكم قضاء الصلاة الفائتة لمن تركها سنوات عمدًا؟")).toMatchObject({ output_config: { effort: "medium" } });
    expect(await ask("كم مرة أقول سبحان الله؟")).toMatchObject({ output_config: { effort: "low" } });
  });

  const searchQuestion = {
    system: "synthetic system prompt",
    messages: [{ role: "user", content: "synthetic question that is long enough to search" }],
    tools: [{ type: "web_search_20250305", name: "web_search", allowed_domains: ["attacker.invalid"] }],
  };
  const searchContent = [{
    type: "web_search_tool_result",
    content: [
      { type: "web_search_result", title: "Untrusted", url: "https://www.youtube.com/watch?v=x", content: "untrusted text" },
      { type: "web_search_result", title: "Lookalike", url: "https://dorar.net.attacker.invalid/a", content: "lookalike text" },
      { type: "web_search_result", title: "Plain http", url: "http://dorar.net/a", content: "insecure text" },
      { type: "web_search_result", title: "Trusted", url: "https://www.islamweb.net/ar/fatwa/1", content: "trusted text" },
    ],
  }];

  it("runs the search itself and gives the model only trusted results", async () => {
    const app = edge({ searchContent });
    const response = await app.sendRaw(JSON.stringify(searchQuestion), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const [search, answer] = upstreamBodies(app);
    expect(search).toMatchObject({ model: "MiniMax-M3.1-Flash", stream: false });
    expect(JSON.stringify(search?.tools)).not.toContain("attacker.invalid");
    const system = JSON.stringify(answer?.system);
    expect(system).toContain("https://www.islamweb.net/ar/fatwa/1");
    expect(system).toContain("trusted text");
    expect(system).not.toContain("youtube.com");
    expect(system).not.toContain("attacker.invalid");
    expect(system).not.toContain("insecure text");
    // The answering call never receives the provider's unfiltered search tool.
    expect(JSON.stringify(answer)).not.toContain("web_search_20250305");
    expect(app.calls.filter((call) => call.type === "rpc")).toHaveLength(1);
  });

  it("does not search unless the caller asks for it", async () => {
    const app = edge({ searchContent });
    await app.send("Bearer synthetic-user-token");
    expect(upstreamBodies(app)).toHaveLength(1);
  });

  it("does not search for a greeting", async () => {
    const app = edge({ searchContent });
    await app.sendRaw(JSON.stringify({
      ...searchQuestion,
      messages: [{ role: "user", content: "hello" }],
    }), "Bearer synthetic-user-token");
    expect(upstreamBodies(app)).toHaveLength(1);
  });

  it.each([
    ["the search fails", { searchFailure: true }],
    ["no result is from a trusted source", { searchContent: [{ type: "web_search_tool_result", content: [{ url: "https://example.com/", title: "x", content: "y" }] }] }],
  ])("still answers, without search results, when %s", async (_label, options) => {
    const app = edge(options);
    const response = await app.sendRaw(JSON.stringify(searchQuestion), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const bodies = upstreamBodies(app);
    expect(bodies).toHaveLength(2);
    const system = JSON.stringify(bodies[1]?.system);
    expect(system).toContain("synthetic system prompt");
    expect(system).not.toContain("### نتائج بحث من مصادر موثوقة");
    expect(system).not.toContain("example.com");
  });
  const dorarHtml = `<div class="hadith" style="text-align:justify;">1 -  إنَّما الأعمالُ بالنِّيَّاتِ، وإنَّما لِكُلِّ امرئٍ ما نَوَى  .</div>
<div class="hadith-info">
    <span class="info-subtitle">الراوي:</span> عمر بن الخطاب</span>
    <span class="info-subtitle">المحدث:</span> البخاري
    <span class="info-subtitle">المصدر:</span>  صحيح البخاري
    <span class="info-subtitle">الصفحة أو الرقم:</span>  1
    <span class="info-subtitle">خلاصة حكم المحدث:</span>  <span >[صحيح]</span>
</div>`;
  const planContent = [{ type: "tool_use", name: "find_evidence", input: { hadith_queries: ["الأعمال بالنيات"], quran_refs: ["98:5"] } }];
  const longQuestion = {
    system: "synthetic system prompt",
    messages: [{ role: "user", content: "ما أهمية النية في العبادات وما الدليل عليها؟" }],
  };

  it("gathers authentic hadith and verses and gives them to the answering call", async () => {
    const app = edge({ planContent, dorarHtml });
    const response = await app.sendRaw(JSON.stringify(longQuestion), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    expect(app.calls.filter((call) => call.type === "dorar")).toHaveLength(1);
    // The wording of this question also starts a trusted-source search.
    const bodies = upstreamBodies(app);
    expect(bodies).toHaveLength(2);
    const system = JSON.stringify(bodies[1]?.system);
    expect(system).toContain("[H1] «إنما الأعمال بالنيات");
    expect(system).toContain("[98:5]");
    expect(system).toContain("قواعد الاستشهاد");
  });

  it("replaces what the model quotes with verified text and removes inventions", async () => {
    const answer = [
      "النية أساس العمل.",
      ":::hadith(H1)",
      ":::",
      ":::verse(98:5)",
      ":::",
      "وقال النبي ﷺ: «من نوى خيرًا في التطبيق كُتب له أجر سبعين شهيدًا» رواه مسلم.",
      "قال تعالى: ﴿ومن نوى خيرًا فله الجنة بغير حساب ولا عقاب﴾",
    ].join("\n");
    const app = edge({ planContent, dorarHtml, answer });
    const response = await app.sendRaw(JSON.stringify(longQuestion), "Bearer synthetic-user-token");
    const text = (await response.json() as { content: Array<{ text: string }> }).content[0]?.text ?? "";

    expect(text).toContain("«إنَّما الأعمالُ بالنِّيَّاتِ، وإنَّما لِكُلِّ امرئٍ ما نَوَى»");
    expect(text).toContain("المصدر: صحيح البخاري (1)");
    expect(text).toContain("— سورة البينة: ٥");
    expect(text).not.toContain("سبعين شهيدًا");
    expect(text).not.toContain("بغير حساب");
    expect(text).toContain("حُذف من هذا الجواب نصٌّ لم يمكن توثيقه");
  });

  it("removes every hadith and verse when no evidence could be gathered", async () => {
    const answer = "النية أساس كل عمل صالح.\nقال النبي ﷺ: «إنما الأعمال بالنيات وإنما لكل امرئ ما نوى»\n:::verse(98:5)\n:::";
    const app = edge({ quranUnavailable: true, answer });
    const response = await app.sendRaw(JSON.stringify(longQuestion), "Bearer synthetic-user-token");
    const text = (await response.json() as { content: Array<{ text: string }> }).content[0]?.text ?? "";

    expect(text).not.toContain("الأعمال بالنيات");
    expect(text).not.toContain(":::verse");
    expect(text).toContain("النية أساس كل عمل صالح.");
    expect(text).toContain("حُذف من هذا الجواب نصٌّ لم يمكن توثيقه");
  });

  it("skips evidence gathering for a greeting", async () => {
    const app = edge({ planContent, dorarHtml });
    await app.sendRaw(JSON.stringify({ system: "synthetic system prompt", messages: [{ role: "user", content: "hello" }] }), "Bearer synthetic-user-token");
    expect(app.calls.filter((call) => call.type === "plan" || call.type === "dorar")).toHaveLength(0);
  });
  const english = "The hadith is not authentic; scholars graded it as fabricated and it has no sound chain.";

  it("regenerates a reply that is not in Arabic", async () => {
    const app = edge({ answer: english, retryAnswer: "هذا الحديث لا يصح، وقد حكم عليه أهل العلم بالوضع." });
    const response = await app.sendRaw(JSON.stringify(longQuestion), "Bearer synthetic-user-token");
    const text = (await response.json() as { content: Array<{ text: string }> }).content[0]?.text ?? "";
    expect(text).toBe("هذا الحديث لا يصح، وقد حكم عليه أهل العلم بالوضع.");
    expect(app.calls.filter((call) => call.type === "rpc")).toHaveLength(1);
  });

  it("gives a plain message when the regenerated reply is unusable too", async () => {
    const app = edge({ answer: english });
    const response = await app.sendRaw(JSON.stringify(longQuestion), "Bearer synthetic-user-token");
    const text = (await response.json() as { content: Array<{ text: string }> }).content[0]?.text ?? "";
    expect(text).toContain("تعذَّر إعداد جوابٍ موثوقٍ");
  });
  it("accepts a large client context and keeps only the focused part of it", async () => {
    const passages = Array.from({ length: 5 }, (_unused, index) =>
      `${index + 1}. [معرّف المصدر: sharh:${index}] [مصدر: كتاب] ${"نص طويل غير متصل بالسؤال ".repeat(260)}`).join("\n");
    const context = `اليوم: يوم الثلاثاء (2026-11-17)\n\nالمسارات الصالحة في التطبيق (استخدم هذه بالضبط):\n- /quran → القرآن\n\nمقاطع من الموسوعة الداخلية للتطبيق قد تفيدك في الاستشهاد:\n${passages}`;
    expect(context.length).toBeGreaterThan(25_000);
    const app = edge();
    const response = await app.sendRaw(JSON.stringify({
      system: [{ type: "text", text: "أنت «أثر»، رفيق إيماني." }, { type: "text", text: context }],
      messages: [{ role: "user", content: "hello" }],
    }), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const system = JSON.stringify(upstreamBodies(app)[0]?.system);
    expect(system).toContain("يوم الثلاثاء");
    expect(system).not.toContain("معرّف المصدر");
    expect(system).not.toContain("المسارات الصالحة في التطبيق (استخدم");
    expect(system).not.toContain("نص طويل غير متصل");
  });

  describe("streamed replies", () => {
    const streamed = (content: string) => JSON.stringify({
      stream: true,
      system: "synthetic system prompt",
      messages: [{ role: "user", content }],
    });
    const events = (text: string) => text.split("\n\n").filter(Boolean).map((raw) => JSON.parse(raw.split("\n").find((line) => line.startsWith("data:"))!.slice(5)) as Record<string, unknown>);

    it("shows each step while the reply is prepared, then the verified reply", async () => {
      const planContent = [{ type: "tool_use", name: "find_evidence", input: { hadith_queries: [], quran_refs: [], follow_ups: ["ما فضل صيام الخميس؟", "bad <b>html</b>", "كيف أقضي ما فاتني من الصيام؟"] } }];
      const app = edge({ planContent, sseAnswer: "الصيام يوم الجمعة وحده مكروه عند جمهور العلماء." });
      const response = await app.sendRaw(streamed("ما حكم صيام يوم الجمعة منفردا؟"), "Bearer synthetic-user-token");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      const list = events(await response.text());
      const stages = list.filter((event) => event.type === "athar_status").map((event) => event.stage);
      expect(stages).toEqual(["gathering", "searching", "writing", "verifying"]);
      const followUps = list.find((event) => event.type === "athar_followups");
      expect(followUps?.items).toEqual(["ما فضل صيام الخميس؟", "كيف أقضي ما فاتني من الصيام؟"]);
      const text = list.filter((event) => event.type === "content_block_delta").map((event) => (event.delta as { text: string }).text).join("");
      expect(text).toBe("الصيام يوم الجمعة وحده مكروه عند جمهور العلماء.");
      expect(list.at(-1)?.type).toBe("message_stop");
      // The progress comes before the reply, the verifying step just before its text.
      const indexOf = (predicate: (event: Record<string, unknown>) => boolean) => list.findIndex(predicate);
      expect(indexOf((event) => event.stage === "verifying")).toBeLessThan(indexOf((event) => event.type === "content_block_delta"));
    });

    it("skips the steps for a greeting", async () => {
      const app = edge({ sseAnswer: "وعليكم السلام ورحمة الله." });
      const list = events(await (await app.sendRaw(streamed("السلام عليكم"), "Bearer synthetic-user-token")).text());
      expect(list.filter((event) => event.type === "athar_status").map((event) => event.stage)).toEqual(["writing", "verifying"]);
    });

    it("reports a rejected service key as the service being unavailable, not as a sign-in problem", async () => {
      const app = edge({ upstreamStatus: 401 });
      const list = events(await (await app.sendRaw(streamed("السلام عليكم"), "Bearer synthetic-user-token")).text());
      expect(list.at(-1)).toMatchObject({ type: "error", error: { type: "service_unavailable" } });
      expect(JSON.stringify(list)).not.toContain("token is unusable");
    });

    it("does the same for a request that is not streamed", async () => {
      const app = edge({ upstreamStatus: 401 });
      const response = await app.send("Bearer synthetic-user-token");
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: { type: "service_unavailable" } });
    });

    it("still refuses before streaming when the quota is spent", async () => {
      const app = edge({ quotaAllowed: false });
      const response = await app.sendRaw(streamed("السلام عليكم"), "Bearer synthetic-user-token");
      expect(response.status).toBe(429);
    });
  });

  describe("a question about one ayah («القرآن الكريم»)", () => {
    const ask = (athar_ayah: unknown) => JSON.stringify({
      system: [{ type: "text", text: "أنت «أثر»، رفيق إيماني." }, { type: "text", text: "سياق خاص من العميل لا يُعتمد" }],
      messages: [{ role: "user", content: "ما معنى القيوم في هذه الآية؟" }],
      athar_ayah,
    });

    it("answers from the ayah's tafsirs, fetched by the server, and from nothing the client sends", async () => {
      const app = edge({ answer: "قال السعدي: «شرح التفسير رقم 91 لهذه الآية» وهو معنى واضح." });
      const response = await app.sendRaw(ask({ surah: 2, ayah: 255 }), "Bearer synthetic-user-token");
      expect(response.status).toBe(200);
      const types = app.calls.map((call) => call.type);
      expect(types.filter((t) => t === "tafsir")).toHaveLength(7);
      expect(types).not.toContain("plan");
      expect(types).not.toContain("dorar");
      const upstream = app.calls.filter((call) => call.type === "upstream").pop()?.detail as { body: string };
      const body = JSON.parse(upstream.body) as { system: Array<{ text: string }> };
      const system = body.system.map((b) => b.text).join("\n");
      expect(system).toContain("سؤال عن آية بعينها");
      expect(system).toContain("تفسير السعدي");
      expect(system).toContain("شرح التفسير رقم 14");
      expect(system).not.toContain("سياق خاص من العميل");
      expect(system).not.toContain("<sup>");
      const text = (await response.json() as { content: Array<{ text: string }> }).content[0]?.text ?? "";
      expect(text).toContain("قال السعدي");
    });

    it("confirms in the stream that the answer is bound to the tafsirs, before any text", async () => {
      const app = edge({ sseAnswer: "قال السعدي: معنى واضح." });
      const response = await app.sendRaw(JSON.stringify({ ...JSON.parse(ask({ surah: 112, ayah: 1 })), stream: true }), "Bearer synthetic-user-token");
      const body = await response.text();
      expect(body).toContain("event: athar_ayah");
      expect(body.indexOf("athar_ayah")).toBeLessThan(body.indexOf("content_block_delta"));
      const ordinary = edge({ sseAnswer: "وعليكم السلام" });
      const plain = await ordinary.sendRaw(JSON.stringify({ system: "synthetic system prompt", stream: true, messages: [{ role: "user", content: "السلام عليكم" }] }), "Bearer synthetic-user-token");
      expect(await plain.text()).not.toContain("athar_ayah");
    });

    it("refuses a reference that is not an ayah, before any work", async () => {
      for (const bad of [{ surah: 115, ayah: 1 }, { surah: 1, ayah: 8 }, { surah: "2", ayah: 255 }, "2:255"]) {
        const app = edge();
        const response = await app.sendRaw(ask(bad), "Bearer synthetic-user-token");
        expect(response.status).toBe(400);
        expect(app.calls).toEqual([]);
      }
    });
  });
});

describe("Companion on OpenAI (GPT-6 Luna)", () => {
  const message = (text: string, annotations: unknown[] = []) => ({ type: "message", content: [{ type: "output_text", text, annotations }] });
  const openAiBodies = (app: ReturnType<typeof edge>) => app.calls
    .filter((call) => call.type === "upstream")
    .map((call) => ({ url: (call.detail as { url?: string }).url, init: call.detail as RequestInit, body: JSON.parse(String((call.detail as RequestInit).body)) as Record<string, unknown> }));

  it("answers through the Responses API with the server's key, model and reasoning depth", async () => {
    const app = edge({ openai: { output: [message("الصدقة تطفئ غضب الرب، وهي من أفضل القربات.")] } });
    const response = await app.sendRaw(JSON.stringify({ model: "MiniMax-M3", max_tokens: 512, system: "synthetic system prompt", messages: [{ role: "user", content: "ما فضل الصدقة؟" }] }), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const [answer] = openAiBodies(app);
    expect(answer?.url).toBe("https://api.openai.com/v1/responses");
    expect(new Headers(answer?.init.headers).get("Authorization")).toBe("Bearer synthetic-openai-key");
    expect(answer?.body).toMatchObject({ model: "gpt-6-luna", store: false, reasoning: { effort: "low" }, max_output_tokens: 4096 });
    expect(String(answer?.body.instructions)).toContain("synthetic system prompt");
    const json = await response.json() as { content: Array<{ type: string; text?: string }> };
    expect(json.content.find((block) => block.type === "text")?.text).toContain("الصدقة");
  });

  it("streams the reply in the events the app reads", async () => {
    const ev = (data: Record<string, unknown>) => `event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`;
    const stream = ev({ type: "response.created" })
      + ev({ type: "response.output_text.delta", item_id: "m1", content_index: 0, delta: "الصدقة تطفئ " })
      + ev({ type: "response.output_text.delta", item_id: "m1", content_index: 0, delta: "غضب الرب، وهي من أفضل القربات." })
      + ev({ type: "response.output_text.done", item_id: "m1", content_index: 0 })
      + ev({ type: "response.completed", response: { status: "completed", usage: { output_tokens: 9 } } });
    const app = edge({ openai: { stream } });
    const response = await app.sendRaw(JSON.stringify({ max_tokens: 512, stream: true, system: "synthetic system prompt", messages: [{ role: "user", content: "ما فضل الصدقة؟" }] }), "Bearer synthetic-user-token");
    const text = await response.text();
    for (const type of ["message_start", "content_block_start", "content_block_delta", "content_block_stop", "message_delta", "message_stop"]) {
      expect(text).toContain(`event: ${type}`);
    }
    const reply = text.split("\n\n").map((event) => event.split("\n").find((line) => line.startsWith("data:")))
      .filter((line): line is string => Boolean(line)).map((line) => JSON.parse(line.slice(5)) as { type: string; delta?: { text?: string } })
      .filter((event) => event.type === "content_block_delta").map((event) => event.delta?.text ?? "").join("");
    expect(reply).toContain("الصدقة تطفئ غضب الرب");
  });

  it("searches only the trusted sites, and never trusts the search model's own sentences as quotable", async () => {
    const said = "قال أهل العلم: يكره إفراد الجمعة بالصيام تطوعًا.";
    const searchOutput = [
      { type: "web_search_call", status: "completed" },
      message(`${said} ([islamweb](https://www.islamweb.net/ar/fatwa/1?utm_source=openai)) وقيل غير ذلك. ([x](https://attacker.invalid/a))`, [
        { type: "url_citation", url: "https://www.islamweb.net/ar/fatwa/1?utm_source=openai", title: "Trusted", start_index: said.length + 1, end_index: said.length + 59 },
        { type: "url_citation", url: "https://attacker.invalid/a", title: "Untrusted", start_index: said.length + 72, end_index: said.length + 100 },
      ]),
    ];
    const app = edge({ openai: { searchOutput, output: [message("يكره إفراد يوم الجمعة بالصيام تطوعًا إلا مع يوم قبله أو بعده.")] } });
    const response = await app.sendRaw(JSON.stringify({ ...{
      system: "synthetic system prompt",
      messages: [{ role: "user", content: "synthetic question that is long enough to search" }],
      tools: [{ type: "web_search_20250305", name: "web_search", allowed_domains: ["attacker.invalid"] }],
    } }), "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    const [search, answer] = openAiBodies(app);
    const tool = (search?.body.tools as Array<{ type: string; filters?: { allowed_domains?: string[] } }>)[0];
    expect(tool?.type).toBe("web_search");
    expect(tool?.filters?.allowed_domains).toContain("islamweb.net");
    expect(tool?.filters?.allowed_domains).not.toContain("attacker.invalid");
    expect(search?.body.tool_choice).toBe("required");
    const instructions = String(answer?.body.instructions);
    expect(instructions).toContain("https://www.islamweb.net/ar/fatwa/1");
    expect(instructions).toContain("يكره إفراد الجمعة بالصيام");
    expect(instructions).not.toContain("attacker.invalid");
  });

  it("uses a key pasted with quotes, a Bearer prefix or spaces", async () => {
    const app = edge({ openai: { key: ' "Bearer synthetic-openai-key"\n', output: [message("الصدقة تطفئ غضب الرب، وهي من أفضل القربات.")] } });
    await app.sendRaw(JSON.stringify({ max_tokens: 512, system: "synthetic system prompt", messages: [{ role: "user", content: "ما فضل الصدقة؟" }] }), "Bearer synthetic-user-token");
    const [answer] = openAiBodies(app);
    expect(new Headers(answer?.init.headers).get("Authorization")).toBe("Bearer synthetic-openai-key");
  });

  it("falls back to MiniMax while no OpenAI key is set", async () => {
    const app = edge();
    await app.send("Bearer synthetic-user-token");
    expect(app.calls.some((call) => String((call.detail as { url?: string })?.url ?? "").includes("openai"))).toBe(false);
  });
});
