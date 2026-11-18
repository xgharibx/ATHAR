// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(async () => true),
  complete: vi.fn(async () => {}),
  downloaded: vi.fn(async () => false),
  emit: null as null | ((status: string) => void),
  openStore: vi.fn(async () => {}),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
vi.mock("@/hooks/useUpdateAvailable", () => ({ useUpdateAvailable: () => ({ available: true, latest: "1.3.0", dismiss: vi.fn() }) }));
vi.mock("@/hooks/usePwaUpdate", () => ({ usePwaUpdate: () => ({ available: false }) }));
vi.mock("@/lib/storeIdentity", () => ({ openStoreListing: mocks.openStore }));
vi.mock("@/lib/inAppUpdate", () => ({
  startPlayUpdate: mocks.start,
  completePlayUpdate: mocks.complete,
  playUpdateDownloaded: mocks.downloaded,
  onPlayUpdateState: (listener: (status: string) => void) => { mocks.emit = listener; return () => {}; },
}));

import { UpdatePill } from "@/components/layout/UpdatePill";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(UpdatePill)));
}
const pill = () => container!.querySelector<HTMLButtonElement>(".update-pill")!;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  for (const fn of [mocks.start, mocks.complete, mocks.downloaded, mocks.openStore]) fn.mockClear();
  mocks.start.mockResolvedValue(true);
  mocks.downloaded.mockResolvedValue(false);
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

describe("Google Play in-app update", () => {
  it("downloads inside the app, then offers a restart", async () => {
    await mount();
    await act(async () => { pill().click(); });
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.openStore).not.toHaveBeenCalled();
    expect(pill().textContent).toContain("جارٍ التنزيل");
    await act(async () => { mocks.emit!("downloaded"); });
    expect(pill().textContent).toContain("أعد التشغيل");
    await act(async () => { pill().click(); });
    expect(mocks.complete).toHaveBeenCalledOnce();
  });

  it("falls back to the store page when Play has no update to offer yet", async () => {
    mocks.start.mockResolvedValueOnce(false);
    await mount();
    await act(async () => { pill().click(); });
    expect(mocks.openStore).toHaveBeenCalledOnce();
  });

  it("offers the restart for an update downloaded earlier", async () => {
    mocks.downloaded.mockResolvedValueOnce(true);
    await mount();
    expect(pill().textContent).toContain("أعد التشغيل");
  });
});
