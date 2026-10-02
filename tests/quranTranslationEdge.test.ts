import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type EdgeOptions = {
  clientId?: string;
  clientSecret?: string;
  env?: string;
  apiUnauthorizedResponses?: number;
  rateLimitAllowed?: boolean;
  rateLimitStatus?: number;
};

function createEdge(options: EdgeOptions = {}) {
  let handler: (request: Request) => Promise<Response> | Response;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let apiUnauthorizedResponses = options.apiUnauthorizedResponses ?? 0;
  const source = fs.readFileSync(path.resolve("supabase/functions/quran-translations/index.ts"), "utf8");
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
    TextEncoder,
    TextDecoder,
    btoa,
    crypto: globalThis.crypto,
    AbortSignal: { timeout: (ms: number) => AbortSignal.timeout(ms) },
    fetch: async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("/oauth2/token")) {
        return Response.json({ access_token: "synthetic-access-token", expires_in: 3600, token_type: "Bearer" });
      }
      if (url.endsWith("/rest/v1/rpc/reserve_quran_translation_request")) {
        if (options.rateLimitStatus) return new Response("rate limit unavailable", { status: options.rateLimitStatus });
        return Response.json(options.rateLimitAllowed ?? true);
      }
      if (apiUnauthorizedResponses > 0) {
        apiUnauthorizedResponses -= 1;
        return Response.json({ type: "unauthorized" }, { status: 401 });
      }
      return Response.json({
        translations: [
          { verse_key: "1:1", text: "In the Name <sup>1</sup> &amp; mercy" },
          { verse_key: "1:2", text: "A second ayah" },
          { verse_key: "2:1", text: "Outside requested chapter" },
        ],
        meta: { translation_name: "Synthetic", author_name: "Synthetic author", filters: { chapter_number: 1 } },
      });
    },
    Deno: {
      serve: (callback: typeof handler) => { handler = callback; },
      env: {
        get: (name: string) => ({
          QF_CLIENT_ID: options.clientId ?? "synthetic-client-id",
          QF_CLIENT_SECRET: options.clientSecret ?? "synthetic-client-secret",
          QF_ENV: options.env ?? "production",
          SUPABASE_URL: "https://synthetic.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
        } as Record<string, string | undefined>)[name],
      },
    },
  });

  const request = (body: unknown, origin = "https://www.athark.org") => handler(new Request("https://synthetic.supabase.co/functions/v1/quran-translations", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));

  return { request, handle: (req: Request) => handler(req), calls };
}

describe("Quran Foundation translation Edge Function", () => {
  it("requests only the allowed translation and chapter and normalizes the documented response", async () => {
    const edge = createEdge();
    const response = await edge.request({ translationId: 22, chapterNumber: 1 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      translations: [
        { verse_key: "1:1", text: "In the Name 1 & mercy" },
        { verse_key: "1:2", text: "A second ayah" },
      ],
      meta: { translation_name: "Synthetic", author_name: "Synthetic author", filters: { chapter_number: 1 } },
    });
    expect(edge.calls).toHaveLength(3);
    expect(edge.calls[0]?.url).toBe("https://synthetic.supabase.co/rest/v1/rpc/reserve_quran_translation_request");
    expect(edge.calls[1]?.url).toBe("https://oauth2.quran.foundation/oauth2/token");
    expect(edge.calls[2]?.url).toBe("https://apis.quran.foundation/content/api/v4/quran/translations/22?chapter_number=1&fields=verse_key");
    expect(new Headers(edge.calls[2]?.init?.headers).get("x-auth-token")).toBe("synthetic-access-token");
    expect(new Headers(edge.calls[2]?.init?.headers).get("x-client-id")).toBe("synthetic-client-id");
  });

  it("rejects unknown translation IDs and chapter numbers before contacting Quran Foundation", async () => {
    const edge = createEdge();
    const badTranslation = await edge.request({ translationId: 131, chapterNumber: 1 });
    const badChapter = await edge.request({ translationId: 84, chapterNumber: 115 });

    expect(badTranslation.status).toBe(400);
    expect(badChapter.status).toBe(400);
    expect(edge.calls).toEqual([]);
  });

  it("rejects a body that exceeds the bounded request size", async () => {
    const edge = createEdge();
    const response = await edge.request({ translationId: 22, chapterNumber: 1, padding: "x".repeat(3000) });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "request-too-large" });
    expect(edge.calls).toEqual([]);
  });

  it("reacquires an expired OAuth token once after a 401", async () => {
    const edge = createEdge({ apiUnauthorizedResponses: 1 });

    const response = await edge.request({ translationId: 234, chapterNumber: 2 });

    expect(response.status).toBe(200);
    expect(edge.calls.filter((call) => call.url.includes("/oauth2/token"))).toHaveLength(2);
    expect(edge.calls.filter((call) => call.url.includes("/quran/translations/234?"))).toHaveLength(2);
  });

  it("reuses a still-valid server token for a later chapter request", async () => {
    const edge = createEdge();
    await edge.request({ translationId: 22, chapterNumber: 1 });
    await edge.request({ translationId: 22, chapterNumber: 2 });

    expect(edge.calls.filter((call) => call.url.includes("/oauth2/token"))).toHaveLength(1);
    expect(edge.calls.filter((call) => call.url.includes("/quran/translations/22?"))).toHaveLength(2);
  });

  it("reserves shared quota before provider access and stops when the durable limit is reached", async () => {
    const edge = createEdge({ rateLimitAllowed: false });
    const response = await edge.request({ translationId: 22, chapterNumber: 1 });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "translation-rate-limited" });
    expect(edge.calls).toHaveLength(1);
    expect(edge.calls[0]?.url).toBe("https://synthetic.supabase.co/rest/v1/rpc/reserve_quran_translation_request");
    expect(JSON.parse(String(edge.calls[0]?.init?.body)).p_client_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed when durable rate-limit storage is unavailable", async () => {
    const edge = createEdge({ rateLimitStatus: 503 });
    const response = await edge.request({ translationId: 22, chapterNumber: 1 });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "translation-rate-limit-unavailable" });
    expect(edge.calls).toHaveLength(1);
  });

  it("does not call Quran Foundation if server credentials or environment are missing", async () => {
    const edge = createEdge({ clientId: "" });
    const response = await edge.request({ translationId: 22, chapterNumber: 1 });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "translation-service-unavailable" });
    expect(edge.calls).toHaveLength(1);
    expect(edge.calls[0]?.url).toContain("reserve_quran_translation_request");
  });

  it("uses the matching pre-live OAuth and API hosts when configured", async () => {
    const edge = createEdge({ env: "prelive" });
    const response = await edge.request({ translationId: 22, chapterNumber: 2 });

    expect(response.status).toBe(200);
    expect(edge.calls[1]?.url).toBe("https://prelive-oauth2.quran.foundation/oauth2/token");
    expect(edge.calls[2]?.url).toBe("https://apis-prelive.quran.foundation/content/api/v4/quran/translations/22?chapter_number=2&fields=verse_key");
  });

  it("defaults an unset environment to production", async () => {
    const edge = createEdge({ env: "" });
    const response = await edge.request({ translationId: 22, chapterNumber: 1 });

    expect(response.status).toBe(200);
    expect(edge.calls.some((call) => call.url.startsWith("https://oauth2.quran.foundation/"))).toBe(true);
  });

  it("grants browser CORS only to the app origin and exposes no provider credentials", async () => {
    const edge = createEdge();
    const response = await edge.handle(new Request("https://synthetic.supabase.co/functions/v1/quran-translations", {
      method: "OPTIONS",
      headers: { Origin: "https://www.athark.org", "Access-Control-Request-Headers": "authorization, apikey, content-type, x-client-info" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://www.athark.org");
    expect(response.headers.get("Access-Control-Allow-Headers")?.toLowerCase()).toContain("authorization");
  });

  it("does not grant preflight access to an unrelated browser origin", async () => {
    const edge = createEdge();
    const response = await edge.handle(new Request("https://synthetic.supabase.co/functions/v1/quran-translations", {
      method: "OPTIONS",
      headers: { Origin: "https://unrelated.invalid" },
    }));

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
