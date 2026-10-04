// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  flushCloudSync: vi.fn<() => Promise<boolean>>(),
  deleteAccount: vi.fn<() => Promise<{ ok: boolean; error?: string }>>(),
}));

vi.mock("@/lib/authClient", () => ({
  deleteAccount: mocks.deleteAccount,
  displayNameOf: () => "Synthetic account",
  isAuthConfigured: () => true,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    session: { user: { id: "synthetic-user" } },
    loading: false,
    configured: true,
  }),
}));
vi.mock("@/hooks/useCloudSync", () => ({
  useSyncStatus: () => ({ phase: "idle", pending: false, lastSyncedAt: Date.now(), error: null }),
}));
vi.mock("@/lib/syncClient", () => ({
  flushCloudSync: mocks.flushCloudSync,
  syncNow: vi.fn(),
}));

import { AccountPanel } from "@/components/account/AccountPanel";

let container: HTMLDivElement;
let root: Root;

function clickButton(label: string) {
  const button = [...container.querySelectorAll("button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!button) throw new Error(`Could not find button: ${label}`);
  act(() => button.click());
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mocks.calls.length = 0;
  mocks.flushCloudSync.mockReset().mockImplementation(async () => {
    mocks.calls.push("flush");
    return false;
  });
  mocks.deleteAccount.mockReset().mockImplementation(async () => {
    mocks.calls.push("delete");
    return { ok: true };
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<AccountPanel />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("account deletion sync guard", () => {
  it("keeps the account when the latest sync cannot be confirmed", async () => {
    clickButton("حذف الحساب");
    clickButton("نعم، احذف نهائيًا");
    await act(async () => { await Promise.resolve(); });

    expect(mocks.calls).toEqual(["flush"]);
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
    expect(container.textContent).toContain("نعم، احذف نهائيًا");
  });

  it("deletes only after the latest sync succeeds", async () => {
    mocks.flushCloudSync.mockImplementation(async () => {
      mocks.calls.push("flush");
      return true;
    });

    clickButton("حذف الحساب");
    clickButton("نعم، احذف نهائيًا");
    await act(async () => { await Promise.resolve(); });

    expect(mocks.calls).toEqual(["flush", "delete"]);
    expect(container.textContent).not.toContain("نعم، احذف نهائيًا");
  });
});
