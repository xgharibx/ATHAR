// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const auth = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<Session | null>>(),
  getCachedSession: vi.fn<() => Session | null>(),
  isAuthConfigured: vi.fn<() => boolean>(),
  onAuthChange: vi.fn<(callback: (session: Session | null, event?: AuthChangeEvent) => void) => () => void>(),
}));

vi.mock("@/lib/authClient", () => auth);

import { useAuthSession, type AuthState } from "@/hooks/useAuthSession";

let root: Root | null = null;
let state: AuthState | null = null;

function Harness() {
  state = useAuthSession();
  return null;
}

describe("useAuthSession", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    auth.isAuthConfigured.mockReturnValue(true);
    auth.getSession.mockResolvedValue(null);
    auth.getCachedSession.mockReturnValue(null);
    auth.onAuthChange.mockReturnValue(() => {});
    state = null;
    root = createRoot(document.createElement("div"));
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    state = null;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("releases the account loading state when the saved-session read rejects", async () => {
    auth.getSession.mockRejectedValue(new Error("storage read failed"));

    await act(async () => {
      root?.render(<Harness />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(state?.loading).toBe(false);
    expect(state?.session).toBeNull();
  });

  it("does not hold startup while a session read never settles", async () => {
    vi.useFakeTimers();
    auth.getSession.mockReturnValue(new Promise<null>(() => {}));

    await act(async () => {
      root?.render(<Harness />);
    });
    expect(state?.loading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(state?.loading).toBe(false);
    expect(state?.session).toBeNull();
    vi.useRealTimers();
  });

  it("opens the cached account immediately while offline refresh hangs", async () => {
    const saved = { user: { id: "account-a" }, access_token: "expired-test-token" } as Session;
    auth.getCachedSession.mockReturnValue(saved);
    auth.getSession.mockReturnValue(new Promise(() => {}));
    await act(async () => { root?.render(<Harness />); });
    expect(state?.loading).toBe(false);
    expect(state?.session?.user.id).toBe("account-a");
  });

  it("retains the saved account when background refresh fails", async () => {
    const saved = { user: { id: "account-a" } } as Session;
    auth.getCachedSession.mockReturnValue(saved);
    auth.getSession.mockRejectedValue(new Error("offline"));
    await act(async () => { root?.render(<Harness />); });
    expect(state?.session?.user.id).toBe("account-a");
  });

  it("does not let a late initial read overwrite a newer account event", async () => {
    let finishRead!: (session: Session | null) => void;
    let notify!: (session: Session | null, event?: AuthChangeEvent) => void;
    auth.getSession.mockReturnValue(new Promise((resolve) => { finishRead = resolve; }));
    auth.onAuthChange.mockImplementation((callback) => { notify = callback; return () => {}; });
    await act(async () => { root?.render(<Harness />); });
    await act(async () => { notify({ user: { id: "account-b" } } as Session, "SIGNED_IN"); });
    await act(async () => { finishRead({ user: { id: "account-a" } } as Session); });
    expect(state?.session?.user.id).toBe("account-b");
  });

  it("preserves cached ownership for an unavailable initial event but honors sign-out", async () => {
    const saved = { user: { id: "account-a" } } as Session;
    let notify!: (session: Session | null, event?: AuthChangeEvent) => void;
    auth.getCachedSession.mockReturnValue(saved);
    auth.getSession.mockReturnValue(new Promise(() => {}));
    auth.onAuthChange.mockImplementation((callback) => { notify = callback; return () => {}; });
    await act(async () => { root?.render(<Harness />); });
    await act(async () => { notify(null, "INITIAL_SESSION"); });
    expect(state?.session?.user.id).toBe("account-a");
    auth.getCachedSession.mockReturnValue(null);
    await act(async () => { notify(null, "SIGNED_OUT"); });
    expect(state?.session).toBeNull();
  });
});
