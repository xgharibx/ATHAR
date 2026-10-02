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
  vm.runInNewContext(js, {
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
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
        } as Record<string, string>)[name],
      },
    },
  });

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

describe("paid Companion Edge Function access controls", () => {
  it.each([undefined, "Bearer synthetic-publishable-key"])(
    "rejects missing or public-key-only bearer credentials before MiniMax",
    async (authorization) => {
      const app = edge();
      const response = await app.send(authorization);

      expect(response.status).toBe(401);
      expect(app.calls.some((call) => call.type === "upstream")).toBe(false);
    },
  );

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
});
