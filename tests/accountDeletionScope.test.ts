// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as unknown,
  activeIdentity: null as unknown,
  peekIdentity: vi.fn(),
  invoke: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: mocks.session }, error: null }),
      signOut: mocks.signOut,
    },
    functions: { invoke: mocks.invoke },
  }),
}));
vi.mock("@/lib/leaderboard", () => ({
  peekLeaderboardIdentity: mocks.peekIdentity,
}));

function persistSession(userId: string) {
  localStorage.setItem("sb-example-auth-token", JSON.stringify({
    access_token: "synthetic-access-token",
    refresh_token: "synthetic-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId },
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-public-key");
  localStorage.clear();
  mocks.session = null;
  mocks.activeIdentity = null;
  mocks.peekIdentity.mockReset().mockImplementation(() => mocks.activeIdentity);
  mocks.invoke.mockReset().mockResolvedValue({ error: null });
  mocks.signOut.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("account deletion identity handoff", () => {
  it("sends only the existing identity from the matching account scope", async () => {
    const userId = "account-a";
    mocks.session = { access_token: "synthetic-access-token", user: { id: userId } };
    mocks.activeIdentity = { id: "anon_account_a", secret: "account-a-secret", alias: "مستخدم ١", joinedAt: "2026-01-01" };
    persistSession(userId);
    const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
    setAccountStorageOwner(`user:${userId}`);

    const { deleteAccount } = await import("@/lib/authClient");
    const result = await deleteAccount(userId);

    expect(result).toEqual({ ok: true });
    expect(mocks.peekIdentity).toHaveBeenCalledOnce();
    expect(mocks.invoke).toHaveBeenCalledWith("delete-account", {
      headers: { Authorization: "Bearer synthetic-access-token" },
      body: { leaderboardIdentity: mocks.activeIdentity },
    });
  });

  it("refuses to pair one account token with another account's local identity", async () => {
    mocks.session = { access_token: "account-a-token", user: { id: "account-a" } };
    mocks.activeIdentity = { id: "anon_account_b", secret: "account-b-secret" };
    persistSession("account-a");
    const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
    setAccountStorageOwner("user:account-b");

    const { deleteAccount } = await import("@/lib/authClient");
    const result = await deleteAccount("account-a");

    expect(result.ok).toBe(false);
    expect(mocks.peekIdentity).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("does not delete the newly active account when the user confirmed the previous one", async () => {
    mocks.session = { access_token: "account-b-token", user: { id: "account-b" } };
    persistSession("account-b");
    const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
    setAccountStorageOwner("user:account-b");

    const { deleteAccount } = await import("@/lib/authClient");
    const result = await deleteAccount("account-a");

    expect(result.ok).toBe(false);
    expect(mocks.peekIdentity).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("sends a null identity without creating one when none exists in the account scope", async () => {
    const userId = "account-a";
    mocks.session = { access_token: "synthetic-access-token", user: { id: userId } };
    persistSession(userId);
    const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
    setAccountStorageOwner(`user:${userId}`);

    const { deleteAccount } = await import("@/lib/authClient");
    const result = await deleteAccount(userId);

    expect(result).toEqual({ ok: true });
    expect(mocks.peekIdentity).toHaveBeenCalledOnce();
    expect(mocks.invoke).toHaveBeenCalledWith("delete-account", expect.objectContaining({
      body: { leaderboardIdentity: null },
    }));
  });

  it("does not sign out a different account that became active during deletion", async () => {
    const userId = "account-a";
    mocks.session = { access_token: "synthetic-access-token", user: { id: userId } };
    persistSession(userId);
    const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
    setAccountStorageOwner(`user:${userId}`);
    mocks.invoke.mockImplementation(async () => {
      mocks.session = { access_token: "account-b-token", user: { id: "account-b" } };
      persistSession("account-b");
      setAccountStorageOwner("user:account-b");
      return { error: null };
    });

    const { deleteAccount } = await import("@/lib/authClient");
    const result = await deleteAccount(userId);

    expect(result).toEqual({ ok: true });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
