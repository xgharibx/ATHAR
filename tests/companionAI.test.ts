// @vitest-environment jsdom
/**
 * tests/companionAI.test.ts
 *
 * Diagnostic-surface tests for the Companion AI. The Anthropic SDK's error
 * subclasses aren't safely constructable outside the real browser/runtime
 * the SDK was bundled against, so we test describeError() via mocks that
 * match the duck-typed shape (status + message) we read.
 */
import { describe, expect, it } from "vitest";
import {
  COMPANION_MODEL,
  COMPANION_PROXY_URL,
  describeError,
  getCompanionReadiness,
  isCompanionReady,
  type CompanionError,
} from "@/lib/companionAI";

/* We duck-type the Anthropic errors so the tests are deterministic and
   don't depend on the SDK's internal class hierarchy. */
function duck(
  name: "AuthenticationError" | "RateLimitError" | "APIConnectionError" | "APIError",
  status: number | undefined,
  message: string,
  includeName = true,
): Error {
  const err = new Error(message) as Error & {
    status?: number;
    name?: string;
    cause?: unknown;
  };
  if (status !== undefined) err.status = status;
  if (includeName) err.name = name;
  return err;
}

describe("Companion AI — readiness", () => {
  it("always has a non-empty proxy URL (env-or-fallback)", () => {
    expect(COMPANION_PROXY_URL).toBeTruthy();
    expect(COMPANION_PROXY_URL.startsWith("https://")).toBe(true);
    // Must end with the function-name since Anthropic SDK appends /v1/messages
    expect(/\/companion(\/?)$/.test(COMPANION_PROXY_URL)).toBe(true);
  });

  it("is ready for any healthy deployment", () => {
    expect(isCompanionReady()).toBe(true);
    const r = getCompanionReadiness();
    expect(r.ready).toBe(true);
    expect(r.proxyUrl).toBe(COMPANION_PROXY_URL);
    expect(r.reason).toBeUndefined();
  });

  it("exposes the locked MiniMax-M3 model name", () => {
    expect(COMPANION_MODEL).toBe("MiniMax-M3");
  });
});

describe("Companion AI — describeError maps each error kind to Arabic", () => {
  const cases: Array<{
    label: string;
    err: Parameters<typeof describeError>[0];
    expectKind: CompanionError["kind"];
    expectMsgMatch: RegExp;
    expectDetailContains?: string;
  }> = [
    {
      label: "401 → auth",
      err: duck("AuthenticationError", 401, "missing key"),
      expectKind: "auth",
      expectMsgMatch: /[ا-ي]/,
      expectDetailContains: "401",
    },
    {
      label: "429 → rate",
      err: duck("RateLimitError", 429, "slow down"),
      expectKind: "rate",
      expectMsgMatch: /الطلب/,
      // Rate detail includes both the HTTP code and the cause message.
      expectDetailContains: "slow down",
    },
    {
      label: "network failure → offline",
      err: duck("APIConnectionError", undefined, "ENOTFOUND api.m…"),
      expectKind: "offline",
      expectMsgMatch: /خادم|الإنترنت|الوصول/,
      expectDetailContains: "ENOTFOUND",
    },
    {
      label: "5xx → server",
      err: duck("APIError", 503, "upstream down"),
      expectKind: "server",
      expectMsgMatch: /خادم/,
      expectDetailContains: "503",
    },
    {
      label: "4xx (not 400) → other",
      err: duck("APIError", 403, "forbidden"),
      expectKind: "other",
      expectMsgMatch: /الخدمة/,
      expectDetailContains: "403",
    },
    {
      label: "400 → blocked",
      err: duck("APIError", 400, "blocked content"),
      expectKind: "blocked",
      expectMsgMatch: /صياغة/,
      expectDetailContains: "400",
    },
    {
      label: "no-proxy-configured → no-proxy",
      err: new Error("no-proxy-configured"),
      expectKind: "no-proxy",
      expectMsgMatch: /تهيّأ|ذكاء/,
      expectDetailContains: "no-proxy",
    },
    {
      label: "AbortError → abort",
      err: Object.assign(new Error("aborted"), { name: "AbortError" }),
      expectKind: "abort",
      expectMsgMatch: /الإلغاء/,
    },
    {
      label: "truly unknown → other",
      err: { foo: "bar" } as unknown as Error,
      expectKind: "other",
      expectMsgMatch: /غير متوقع/,
    },
  ];

  for (const c of cases) {
    it(c.label, () => {
      const r = describeError(c.err);
      expect(r.kind).toBe(c.expectKind);
      expect(r.message).toMatch(c.expectMsgMatch);
      if (c.expectDetailContains) {
        expect((r.detail ?? "").toLowerCase()).toContain(c.expectDetailContains.toLowerCase());
      }
    });
  }
});
