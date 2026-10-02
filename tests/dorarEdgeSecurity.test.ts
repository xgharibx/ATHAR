import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type EdgeOptions = {
  rateLimitAllowed?: boolean;
  rateLimitStatus?: number;
};

function createDorarEdge(options: EdgeOptions = {}) {
  let handler: (request: Request) => Promise<Response> | Response;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const rpcCalls: Array<{ url: string; init?: RequestInit }> = [];
  const source = fs.readFileSync(path.resolve("supabase/functions/dorar/index.ts"), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;

  vm.runInNewContext(js, {
    console,
    Request,
    Response,
    Headers,
    URL,
    URLSearchParams,
    AbortSignal,
    TextEncoder,
    crypto: globalThis.crypto,
    fetch: async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/rest/v1/rpc/reserve_dorar_request")) {
        rpcCalls.push({ url, init });
        if (options.rateLimitStatus) return new Response("quota unavailable", { status: options.rateLimitStatus });
        return Response.json(options.rateLimitAllowed ?? true);
      }
      calls.push({ url, init });
      return Response.json({ ahadith: { result: "<div>grading</div>" } });
    },
    Deno: {
      serve: (callback: typeof handler) => { handler = callback; },
      env: {
        get: (name: string) => ({
          SUPABASE_URL: "https://synthetic.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
        } as Record<string, string | undefined>)[name],
      },
    },
  });

  const request = (options: {
    cfIp?: string;
    forwardedFor?: string;
    query?: string;
  } = {}) => {
    const headers = new Headers();
    if (options.cfIp) headers.set("cf-connecting-ip", options.cfIp);
    if (options.forwardedFor) headers.set("x-forwarded-for", options.forwardedFor);
    const url = new URL("https://synthetic.supabase.co/functions/v1/dorar");
    if (options.query !== undefined) url.searchParams.set("q", options.query);
    return handler(new Request(url, { headers }));
  };

  return { request, calls, rpcCalls };
}

describe("Dorar search Edge Function safeguards", () => {
  it("uses the edge client address instead of caller-controlled forwarded-for values", async () => {
    const edge = createDorarEdge();
    let finalResponse: Response | undefined;

    for (let index = 0; index < 61; index += 1) {
      finalResponse = await edge.request({
        cfIp: "203.0.113.8",
        forwardedFor: "198.51.100." + (index + 1),
      });
    }

    expect(finalResponse?.status).toBe(429);
    expect(edge.calls).toHaveLength(0);
  });

  it("rejects queries above the supported limit without contacting Dorar", async () => {
    const edge = createDorarEdge();
    const response = await edge.request({ cfIp: "203.0.113.9", query: "a".repeat(201) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "query-too-long" });
    expect(edge.calls).toHaveLength(0);
  });

  it("bounds upstream fetch time with an abort signal", async () => {
    const edge = createDorarEdge();
    await edge.request({ cfIp: "203.0.113.10", query: "valid hadith search" });

    expect(edge.calls).toHaveLength(1);
    expect(edge.calls[0]?.init?.signal).toBeDefined();
  });

  it("evicts least-recent limiter entries instead of growing without bound", async () => {
    const edge = createDorarEdge();
    let firstResponse: Response | undefined;

    for (let index = 0; index < 60; index += 1) {
      firstResponse = await edge.request({ cfIp: "203.0.113.11" });
    }
    expect((await edge.request({ cfIp: "203.0.113.11" })).status).toBe(429);

    for (let index = 0; index < 4096; index += 1) {
      await edge.request({ cfIp: "198.51." + Math.floor(index / 256) + "." + (index % 256) });
    }

    const afterEviction = await edge.request({ cfIp: "203.0.113.11" });
    expect(firstResponse?.status).toBe(400);
    expect(afterEviction.status).toBe(400);
  });

  it("reserves shared quota before calling Dorar", async () => {
    const edge = createDorarEdge({ rateLimitAllowed: false });
    const response = await edge.request({ cfIp: "203.0.113.12", query: "valid hadith search" });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: "rate-limited" });
    expect(edge.rpcCalls).toHaveLength(1);
    expect(edge.rpcCalls[0]?.url).toContain("/rpc/reserve_dorar_request");
    expect(edge.calls).toHaveLength(0);
  });

  it("fails closed when durable quota storage is unavailable", async () => {
    const edge = createDorarEdge({ rateLimitStatus: 503 });
    const response = await edge.request({ cfIp: "203.0.113.13", query: "valid hadith search" });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "rate-limit-unavailable" });
    expect(edge.calls).toHaveLength(0);
  });

  it("stores only an HMAC of the client IP and never sends the service key to Dorar", async () => {
    const edge = createDorarEdge();
    await edge.request({ cfIp: "203.0.113.14", query: "valid hadith search" });

    const body = JSON.parse(String(edge.rpcCalls[0]?.init?.body)) as { p_client_hash: string };
    expect(body.p_client_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(body)).not.toContain("203.0.113.14");
    expect(edge.calls[0]?.url).toMatch(/^https:\/\/dorar\.net\//);
    expect(new Headers(edge.calls[0]?.init?.headers).get("apikey")).toBeNull();
  });
});