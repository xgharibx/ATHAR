// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ enabled: true }));
const exchanges = vi.hoisted(() => [] as string[]);
const sessionTokens = vi.hoisted(() => [] as Array<{ access_token: string; refresh_token: string }>);

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.enabled },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: {
    exchangeCodeForSession: async (code: string) => { exchanges.push(code); return { error: null }; },
    setSession: async (tokens: { access_token: string; refresh_token: string }) => {
      sessionTokens.push(tokens);
      return { error: null };
    },
  } }),
}));

type CallbackWindow = EventTarget & { __atharPendingAuthUrl?: string; __atharAuthCallbackReady?: boolean };
let callbackWindow: CallbackWindow;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-public-key");
  native.enabled = true;
  exchanges.length = 0;
  sessionTokens.length = 0;
  callbackWindow = new EventTarget();
  vi.stubGlobal("window", callbackWindow);
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("native authentication callback delivery", () => {
  it("consumes a callback queued before the session consumers mount", async () => {
    callbackWindow.__atharPendingAuthUrl = "app.athar://auth?code=cold-start";
    const { getSupabase } = await import("@/lib/authClient");
    getSupabase();
    await Promise.resolve();
    expect(exchanges).toEqual(["cold-start"]);
    expect(callbackWindow.__atharPendingAuthUrl).toBeUndefined();
  });

  it("completes a callback once across repeated session consumers and bridge delivery", async () => {
    const { getSupabase } = await import("@/lib/authClient");
    getSupabase();
    getSupabase();
    getSupabase();
    const event = () => new CustomEvent("athar-auth-callback", { detail: { url: "app.athar://auth?code=once" } });
    callbackWindow.dispatchEvent(event());
    callbackWindow.dispatchEvent(event());
    await Promise.resolve();
    expect(exchanges).toEqual(["once"]);
  });

  it("shares the exchange for concurrent callers of the same one-time code", async () => {
    const { completeNativeSignIn } = await import("@/lib/authClient");
    const results = await Promise.all([
      completeNativeSignIn("app.athar://auth?code=one-time"),
      completeNativeSignIn("app.athar://auth?code=one-time"),
      completeNativeSignIn("app.athar://auth?code=one-time"),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(exchanges).toEqual(["one-time"]);
  });

  it("does not exchange codes or tokens from another host or path", async () => {
    const { completeNativeSignIn } = await import("@/lib/authClient");
    for (const url of [
      "app.athar://auth.evil?code=unsafe", "https://auth?code=unsafe",
      "app.athar://auth/other?code=unsafe", "app.athar://user@auth?code=unsafe",
      "app.athar://auth.evil#access_token=unsafe&refresh_token=unsafe",
    ]) expect((await completeNativeSignIn(url)).ok).toBe(false);
    expect(exchanges).toEqual([]);
    expect(sessionTokens).toEqual([]);
  });
});
