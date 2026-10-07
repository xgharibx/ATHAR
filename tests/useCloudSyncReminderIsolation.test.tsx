// @vitest-environment jsdom
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { session: null as null | { user: { id: string } }, configured: true, loading: false },
  beginAccountReminderTransition: vi.fn(),
  cancelRemindersForAccountSwitch: vi.fn<(owner: string, stillCurrent: () => boolean) => Promise<void>>(),
  completeAccountReminderTransition: vi.fn(),
  events: [] as string[],
  getAccountImportChoice: vi.fn<() => "copy" | "keep" | null>(),
  hasLocalCompanionData: vi.fn<() => Promise<boolean>>(),
  hasLocalDataToImport: vi.fn<() => Promise<boolean>>(),
  hydrateAccountStorageOwner: vi.fn<(owner: string) => Promise<void>>(),
  setAccountImportChoice: vi.fn(),
  startCloudSync: vi.fn(),
  stopCloudSync: vi.fn(),
  subscribeSyncStatus: vi.fn(),
  getSyncStatus: vi.fn(),
}));

vi.mock("@/hooks/useAuthSession", () => ({ useAuthSession: () => mocks.auth }));
vi.mock("@/lib/authClient", () => ({
  getSession: async () => mocks.auth.session,
  getPersistedAccountStorageOwner: () => mocks.auth.session ? `user:${mocks.auth.session.user.id}` : "local",
}));
vi.mock("@/store/noorStore", () => ({ hydrateAccountStorageOwner: mocks.hydrateAccountStorageOwner }));
vi.mock("@/lib/reminders", () => ({
  beginAccountReminderTransition: mocks.beginAccountReminderTransition,
  cancelRemindersForAccountSwitch: mocks.cancelRemindersForAccountSwitch,
  completeAccountReminderTransition: mocks.completeAccountReminderTransition,
}));
vi.mock("@/lib/syncClient", () => ({
  getSyncStatus: mocks.getSyncStatus,
  startCloudSync: mocks.startCloudSync,
  stopCloudSync: mocks.stopCloudSync,
  subscribeSyncStatus: mocks.subscribeSyncStatus,
}));
vi.mock("@/lib/accountDataImport", () => ({
  copyLocalDataIntoAccount: vi.fn(),
  getAccountImportChoice: mocks.getAccountImportChoice,
  hasLocalCompanionData: mocks.hasLocalCompanionData,
  hasLocalDataToImport: mocks.hasLocalDataToImport,
  setAccountImportChoice: mocks.setAccountImportChoice,
}));

import { useCloudSync } from "@/hooks/useCloudSync";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function ScopeProbe() {
  const scope = useCloudSync();
  return createElement(React.Fragment, null,
    createElement("output", {
      "data-ready": String(scope.ready),
      "data-import-choice": String(scope.needsImportChoice),
      "data-error": String(Boolean(scope.error)),
    }),
    createElement("button", { onClick: scope.retry }, "retry"),
  );
}

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(ScopeProbe)));
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.events.length = 0;
  mocks.beginAccountReminderTransition.mockImplementation(() => mocks.events.push("begin-transition"));
  mocks.completeAccountReminderTransition.mockImplementation(() => mocks.events.push("complete-transition"));
  mocks.auth.session = null;
  mocks.auth.configured = true;
  mocks.auth.loading = false;
  mocks.getAccountImportChoice.mockReturnValue("keep");
  mocks.hasLocalCompanionData.mockResolvedValue(false);
  mocks.hasLocalDataToImport.mockResolvedValue(false);
  mocks.hydrateAccountStorageOwner.mockImplementation(async (owner) => {
    mocks.events.push(`hydrate:${owner}`);
    setAccountStorageOwner(owner as "local" | `user:${string}`);
  });
  mocks.cancelRemindersForAccountSwitch.mockImplementation(async () => {
    mocks.events.push("cancel-reminders");
  });
  setAccountStorageOwner("local");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  setAccountStorageOwner("local");
  vi.unstubAllGlobals();
});

describe("account reminder transition", () => {
  it("clears persisted reminders before hydrating the signed-out local scope on cold start", async () => {
    mount();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container?.querySelector("output")?.getAttribute("data-ready")).toBe("true");
    expect(mocks.events).toEqual([
      "begin-transition",
      "cancel-reminders",
      "hydrate:local",
      "complete-transition",
    ]);
  });

  it("cancels the outgoing reminders before opening a new account's import gate", async () => {
    mount();
    await vi.waitFor(() => expect(container?.querySelector("output")?.getAttribute("data-ready")).toBe("true"));

    const cancellation = deferred();
    mocks.cancelRemindersForAccountSwitch.mockImplementationOnce(async () => {
      mocks.events.push("cancel-start");
      await cancellation.promise;
      mocks.events.push("cancel-finished");
    });

    mocks.events.length = 0;
    mocks.getAccountImportChoice.mockReturnValue(null);
    mocks.hasLocalDataToImport.mockResolvedValue(true);
    mocks.auth.session = { user: { id: "account-b" } };
    await act(async () => { root!.render(createElement(ScopeProbe)); });

    expect(mocks.events).toEqual(["begin-transition", "cancel-start"]);

    await act(async () => {
      cancellation.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container?.querySelector("output")?.getAttribute("data-import-choice")).toBe("true");
    expect(mocks.events.indexOf("cancel-finished")).toBeLessThan(mocks.events.indexOf("hydrate:user:account-b"));
  });

  it("keeps the new account gated when outgoing reminder cancellation fails and can retry", async () => {
    mount();
    await vi.waitFor(() => expect(container?.querySelector("output")?.getAttribute("data-ready")).toBe("true"));

    mocks.events.length = 0;
    mocks.cancelRemindersForAccountSwitch.mockRejectedValueOnce(new Error("native cancellation failed"));
    mocks.auth.session = { user: { id: "account-b" } };
    await act(async () => {
      root!.render(createElement(ScopeProbe));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mocks.events).toEqual(["begin-transition"]);
    expect(mocks.events).not.toContain("hydrate:user:account-b");
    expect(container?.querySelector("output")?.getAttribute("data-error")).toBe("true");

    await act(async () => {
      container!.querySelector("button")!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container?.querySelector("output")?.getAttribute("data-ready")).toBe("true");
    expect(mocks.events.indexOf("cancel-reminders")).toBeLessThan(mocks.events.lastIndexOf("hydrate:user:account-b"));
  });

  it("marks a queued account cleanup stale before a newer account can hydrate", async () => {
    mount();
    await vi.waitFor(() => expect(container?.querySelector("output")?.getAttribute("data-ready")).toBe("true"));

    const cancellation = deferred();
    const currentChecks: Array<{ owner: string; isCurrent: () => boolean }> = [];
    mocks.cancelRemindersForAccountSwitch.mockImplementation(async (owner, isCurrent) => {
      currentChecks.push({ owner, isCurrent });
      if (owner === "user:account-b") await cancellation.promise;
    });

    mocks.auth.session = { user: { id: "account-b" } };
    await act(async () => { root!.render(createElement(ScopeProbe)); });
    expect(await currentChecks[0].isCurrent()).toBe(true);

    // Simulate Supabase's persisted session changing before this tab has
    // received its React auth event. The live-session check must stop B.
    mocks.auth.session = { user: { id: "account-c" } };
    cancellation.resolve();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(mocks.events).not.toContain("hydrate:user:account-b");
    await act(async () => {
      root!.render(createElement(ScopeProbe));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(currentChecks.map(({ owner }) => owner)).toEqual(["user:account-b", "user:account-c"]);
    expect(await currentChecks[0].isCurrent()).toBe(false);
    expect(await currentChecks[1].isCurrent()).toBe(true);
    expect(mocks.events).not.toContain("hydrate:user:account-b");
    expect(mocks.events).toContain("hydrate:user:account-c");
  });
});
