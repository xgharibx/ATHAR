import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  platform: "ios",
  appleSignIn: vi.fn(),
  signInWithIdToken: vi.fn(),
  updateUser: vi.fn(async () => ({ data: {}, error: null })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => state.platform, isNativePlatform: () => state.platform !== "web" },
  registerPlugin: () => ({ signIn: state.appleSignIn }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithIdToken: state.signInWithIdToken,
      updateUser: state.updateUser,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: null } }),
    },
  }),
}));

vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");

const { canSignInWithApple, makeNonce, signInWithApple } = await import("@/lib/authClient");

afterEach(() => {
  state.platform = "ios";
  vi.clearAllMocks();
});

describe("Sign in with Apple", () => {
  it("is offered in the iPhone app only", () => {
    expect(canSignInWithApple()).toBe(true);
    state.platform = "android";
    expect(canSignInWithApple()).toBe(false);
    state.platform = "web";
    expect(canSignInWithApple()).toBe(false);
  });

  it("makes a long random nonce", () => {
    const a = makeNonce();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(makeNonce()).not.toBe(a);
  });

  it("hands Apple's token and the same nonce to Supabase, and keeps the name Apple shares once", async () => {
    state.appleSignIn.mockResolvedValueOnce({ identityToken: "apple.jwt", user: "001.abc", givenName: "عمرو", familyName: "غريب" });
    state.signInWithIdToken.mockResolvedValueOnce({ data: {}, error: null });
    expect(await signInWithApple()).toEqual({ ok: true });
    const nonce = state.appleSignIn.mock.calls[0]![0].nonce;
    expect(state.signInWithIdToken).toHaveBeenCalledWith({ provider: "apple", token: "apple.jwt", nonce });
    expect(state.updateUser).toHaveBeenCalledWith({ data: { full_name: "عمرو غريب", name: "عمرو غريب" } });
  });

  it("closing the sheet is quiet; a failure says so", async () => {
    state.appleSignIn.mockRejectedValueOnce(Object.assign(new Error("canceled"), { code: "CANCELED" }));
    expect(await signInWithApple()).toEqual({ ok: false });
    state.appleSignIn.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "FAILED" }));
    expect((await signInWithApple()).error).toContain("Apple");
    expect(state.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("is wired into the iOS app: plugin built, registered, and the capability declared", () => {
    const project = readFileSync(resolve(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    const controller = readFileSync(resolve(process.cwd(), "ios/App/App/AtharBridgeViewController.swift"), "utf8");
    const entitlements = readFileSync(resolve(process.cwd(), "ios/App/App/App.entitlements"), "utf8");
    const plugin = readFileSync(resolve(process.cwd(), "ios/App/App/AppleSignInPlugin.swift"), "utf8");
    expect(project).toContain("AppleSignInPlugin.swift in Sources");
    expect(controller).toContain("registerPluginInstance(AppleSignInPlugin())");
    expect(entitlements).toContain("<key>com.apple.developer.applesignin</key>");
    // Apple receives only the nonce's hash.
    expect(plugin).toContain("SHA256.hash");
    expect(plugin).toContain('jsName = "AppleSignIn"');
  });
});
