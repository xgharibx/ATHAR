// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ enabled: true, openExternal: vi.fn() }));
const exchanges = vi.hoisted(() => [] as string[]);
const sessionTokens = vi.hoisted(() => [] as Array<{ access_token: string; refresh_token: string }>);
const sessionRead = vi.hoisted(() => ({ hangs: false }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.enabled },
  registerPlugin: () => ({ openExternal: native.openExternal }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: {
    getSession: () => sessionRead.hangs
      ? new Promise<never>(() => {})
      : Promise.resolve({ data: { session: null } }),
    signInWithOAuth: async () => ({ data: { url: "https://accounts.example.test/oauth" }, error: null }),
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
  sessionRead.hangs = false;
  native.openExternal.mockReset().mockResolvedValue(undefined);
  exchanges.length = 0;
  sessionTokens.length = 0;
  callbackWindow = new EventTarget();
  vi.stubGlobal("window", callbackWindow);
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("native authentication callback delivery", () => {
  it("bounds session reads when auth storage never releases its lock", async () => {
    vi.useFakeTimers();
    sessionRead.hangs = true;
    const { getSession } = await import("@/lib/authClient");

    const pending = getSession();
    const settled = pending.then(() => "resolved" as const, () => "rejected" as const);
    await vi.advanceTimersByTimeAsync(5_000);

    const outcome = await Promise.race([settled, Promise.resolve("still-running" as const)]);
    expect(outcome).toBe("rejected");
    await expect(pending).rejects.toThrow("تعذّر التحقق من جلسة الحساب");
  });

  it("returns a recoverable error when account deletion cannot read the saved session", async () => {
    vi.useFakeTimers();
    sessionRead.hangs = true;
    const { deleteAccount } = await import("@/lib/authClient");

    const pending = deleteAccount();
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await Promise.race([pending, Promise.resolve("still-running" as const)]);

    expect(result).toEqual({ ok: false, error: "تعذّر التحقق من جلسة الحساب" });
  });

  it("publishes OAuth callback failures so the app can show a recovery message", async () => {
    let callbackResult: { ok: boolean; error?: string } | undefined;
    callbackWindow.addEventListener("athar-auth-result", (event) => {
      callbackResult = (event as CustomEvent<{ ok: boolean; error?: string }>).detail;
    });
    callbackWindow.__atharPendingAuthUrl = "app.athar://auth?error=access_denied";

    const { getSupabase } = await import("@/lib/authClient");
    getSupabase();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callbackResult).toEqual({ ok: false, error: "تعذّر تسجيل الدخول" });
  });

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

  it("rejects unsolicited token-fragment callbacks because native auth uses PKCE", async () => {
    const { completeNativeSignIn } = await import("@/lib/authClient");

    const result = await completeNativeSignIn(
      "app.athar://auth#access_token=attacker-token&refresh_token=attacker-refresh",
    );

    expect(result.ok).toBe(false);
    expect(exchanges).toEqual([]);
    expect(sessionTokens).toEqual([]);
  });

  it("reports an OAuth denial instead of treating it as a malformed callback", async () => {
    const { completeNativeSignIn } = await import("@/lib/authClient");

    await expect(completeNativeSignIn("app.athar://auth?error=access_denied"))
      .resolves.toEqual({ ok: false, error: "تعذّر تسجيل الدخول" });
    expect(exchanges).toEqual([]);
  });

  it("returns a recoverable error when the native system browser cannot open", async () => {
    native.openExternal.mockRejectedValue(new Error("browser unavailable"));
    const { signInWithGoogle } = await import("@/lib/authClient");

    await expect(signInWithGoogle()).resolves.toMatchObject({ ok: false, error: expect.any(String) });
  });
});
