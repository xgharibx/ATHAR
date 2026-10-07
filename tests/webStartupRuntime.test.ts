/** @vitest-environment jsdom */
import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildWebReminderActionUrl, parseWebReminderActionFragment } from "@/lib/webReminderActions";

const main = fs.readFileSync("src/main.tsx", "utf8").replace(/\r\n/g, "\n");
const bootstrap = main.slice(main.indexOf("try {\n", main.indexOf("// GitHub Pages SPA fallback support:")), main.indexOf("const queryClient ="))
  .replace(" as unknown as Record<string, unknown>", "")
  .replace("import.meta.env.BASE_URL", '"/"');

function runStartup(href = "https://athar.example/") {
  const reload = vi.fn();
  const bufferAction = vi.fn();
  const events = new EventTarget();
  const runtime = {
    location: { href, hash: new URL(href).hash, reload },
    history: {
      state: null,
      replaceState: vi.fn((_state, _unused, next: string) => {
        const url = new URL(next, runtime.location.href);
        runtime.location.href = url.toString();
        runtime.location.hash = url.hash;
      }),
    },
    addEventListener: events.addEventListener.bind(events),
  };
  const execute = new Function("globalThis", "localStorage", "sessionStorage", "APP_RUNTIME_VERSION_KEY", "APP_RUNTIME_VERSION", "parseWebReminderActionFragment", "setPendingNotificationAction",
    bootstrap);
  const boot = () => execute(runtime, localStorage, sessionStorage, "noor_app_runtime_version", "current-build", parseWebReminderActionFragment, bufferAction);
  boot();
  return { runtime, reload, bufferAction, events, boot };
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("web startup runtime", () => {
  it.each([null, "old-build"])("starts directly without a forced reload when the remembered version is %s", (version) => {
    if (version) localStorage.setItem("noor_app_runtime_version", version);
    sessionStorage.setItem("noor_preload_recover_once", "1");
    const { reload } = runStartup();
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem("noor_app_runtime_version")).toBe("current-build");
    expect(sessionStorage.getItem("noor_preload_recover_once")).toBeNull();
  });

  it("retains one-use stale chunk recovery and resets it only for a new build", () => {
    localStorage.setItem("noor_app_runtime_version", "current-build");
    const { reload, events, boot } = runStartup();
    events.dispatchEvent(new Event("vite:preloadError"));
    expect(reload).toHaveBeenCalledOnce();
    boot();
    events.dispatchEvent(new Event("vite:preloadError"));
    expect(reload).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("noor_preload_recover_once")).toBe("1");
  });

  it("consumes a cold-start reminder hash once even on the first visit", () => {
    const href = buildWebReminderActionUrl("https://athar.example/", {
      action: "done", scheduleId: "cr:morning:1", reminderId: "morning", accountOwner: "local",
      route: "/c/morning", snoozeMinutes: 20, title: "الصباح", body: "ابدأ وردك",
    });
    const { reload, bufferAction, runtime, boot } = runStartup(href);
    expect(reload).not.toHaveBeenCalled();
    expect(bufferAction).toHaveBeenCalledOnce();
    expect(bufferAction).toHaveBeenCalledWith(expect.objectContaining({ actionId: "done", route: "/c/morning" }));
    expect(runtime.location.hash).toBe("");
    boot();
    expect(bufferAction).toHaveBeenCalledOnce();
  });
});
