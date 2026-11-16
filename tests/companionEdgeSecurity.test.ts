import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type Options = {
  userId?: string | null;
  userLookupError?: boolean;
  quotaAllowed?: boolean | null;
  quotaError?: boolean;
  upstreamFailure?: boolean;
  upstreamTimeout?: boolean;
  searchContent?: unknown[];
  searchFailure?: boolean;
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
  const corsPath = path.resolve("supabase/functions/companion/cors.ts");
  const corsSource = fs.readFileSync(corsPath, "utf8").replace(/^export /gm, "");
  const corsJs = ts.transpileModule(corsSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const sourcesPath = path.resolve("supabase/functions/companion/sources.ts");
  const sourcesJs = ts.transpileModule(fs.readFileSync(sourcesPath, "utf8").replace(/^export /gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const sandbox = {
    console,
    createClient: (...args: unknown[]) => { clientConfig = args; return client; },
    Request,
    Response,
    Headers,
    URL,
    TextDecoder,
    fetch: async (_url: string, init: RequestInit) => {
      calls.push({ type: "upstream", detail: init });
      if (options.upstreamTimeout || options.upstreamFailure) throw new Error("synthetic upstream failure");
      if (String(init.body).includes("web_search_20250305")) {
        if (options.searchFailure) return new Response("search unavailable", { status: 500 });
        return new Response(JSON.stringify({ content: options.searchContent ?? [] }), {
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
          SUPABASE_URL: "https://synthetic.supabase.co",
          SUPABASE_ANON_KEY: "synthetic-publishable-key",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
        } as Record<string, string>)[name],
      },
    },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(corsJs, context);
  vm.runInContext(sourcesJs, context);
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
    expect(app.calls.map((call) => call.type)).toEqual(["rpc", "upstream"]);
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
    expect(app.calls.map((call) => call.type)).toEqual(["auth", "rpc", "upstream"]);
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
    expect(app.calls.map((call) => call.type)).toEqual(["auth", "rpc", "upstream"]);
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
    expect(app.calls.map((call) => call.type)).toEqual(["auth", "rpc", "upstream"]);
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
    expect(bodies[1]?.system).toBe("synthetic system prompt");
  });
});
