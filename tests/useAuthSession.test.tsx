// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<null>>(),
  isAuthConfigured: vi.fn<() => boolean>(),
  onAuthChange: vi.fn<() => () => void>(),
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
    auth.onAuthChange.mockReturnValue(() => {});
    state = null;
    root = createRoot(document.createElement("div"));
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    state = null;
    vi.clearAllMocks();
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
    expect(state?.loading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(state?.loading).toBe(false);
    expect(state?.session).toBeNull();
    vi.useRealTimers();
  });
});
