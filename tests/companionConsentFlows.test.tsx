// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  platform: "ios",
  stream: vi.fn(),
  saveConversation: vi.fn(async () => undefined),
  savePartialStream: vi.fn(),
  clearPartialStream: vi.fn(),
  listConversations: vi.fn(async () => []),
  loadPartialStream: vi.fn(() => null),
  listPins: vi.fn(() => []),
  checkCompanionHealth: vi.fn(async () => ({ status: "reachable", at: 1, latencyMs: 1 })),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => mocks.platform } }));
vi.mock("@/lib/companionAI", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/companionAI")>();
  return { ...actual, isCompanionReady: () => true, streamCompanionReply: mocks.stream };
});
vi.mock("@/lib/companionHistory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/companionHistory")>();
  return {
    ...actual,
    saveConversation: mocks.saveConversation,
    savePartialStream: mocks.savePartialStream,
    clearPartialStream: mocks.clearPartialStream,
    listConversations: mocks.listConversations,
    loadPartialStream: mocks.loadPartialStream,
    listPins: mocks.listPins,
  };
});
vi.mock("@/lib/companionHealth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/companionHealth")>();
  return { ...actual, checkCompanionHealth: mocks.checkCompanionHealth };
});

import { CompanionPage } from "@/pages/Companion";
import { CompanionModal } from "@/components/companion/CompanionModal";
import { revokeCompanionAiConsent } from "@/lib/companionConsent";

const roots: Array<{ root: Root; container: HTMLDivElement }> = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

function render(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push({ root, container });
  act(() => root.render(<MemoryRouter>{node}</MemoryRouter>));
  return container;
}

function enterMessage(container: HTMLElement, text: string) {
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="رسالتك"]')
    ?? container.querySelector<HTMLTextAreaElement>('textarea[placeholder^="اسأل أثر"]')
    ?? document.body.querySelector<HTMLTextAreaElement>('textarea[placeholder^="اسأل أثر"]');
  expect(textarea).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(textarea, text);
    textarea?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const send = container.querySelector<HTMLButtonElement>('button[aria-label="إرسال"]')
    ?? document.body.querySelector<HTMLButtonElement>('button[aria-label="إرسال"]');
  expect(send?.disabled).toBe(false);
  act(() => send?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function consentButton(label: string) {
  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  return Array.from(dialog?.querySelectorAll("button") ?? [])
    .find((button) => button.textContent?.includes(label));
}

beforeEach(() => {
  localStorage.clear();
  mocks.platform = "ios";
  mocks.stream.mockReset().mockImplementation(async (_history, handlers) => {
    handlers.onDone("رد تجريبي", {});
  });
  mocks.saveConversation.mockClear();
  mocks.savePartialStream.mockClear();
  mocks.clearPartialStream.mockClear();
  mocks.listConversations.mockReset().mockResolvedValue([]);
  mocks.loadPartialStream.mockReset().mockReturnValue(null);
  mocks.listPins.mockReset().mockReturnValue([]);
  mocks.checkCompanionHealth.mockReset().mockResolvedValue({ status: "reachable", at: 1, latencyMs: 1 });
});

afterEach(() => {
  for (const { root, container } of roots.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
  localStorage.clear();
});

describe.each([
  ["full-page Ask Athar", () => <CompanionPage />],
  ["embedded Ask Athar", () => <CompanionModal open onClose={() => {}} />],
])("%s iOS consent flow", (_name, makeView) => {
  it("keeps a declined or revoked question out of saved history and provider requests", async () => {
    const container = render(makeView());
    await act(async () => { await Promise.resolve(); });

    enterMessage(container, "سؤال اختباري قبل الموافقة");
    expect(consentButton("ليس الآن")).toBeDefined();
    act(() => consentButton("ليس الآن")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(mocks.saveConversation).not.toHaveBeenCalled();
    expect(mocks.savePartialStream).not.toHaveBeenCalled();

    enterMessage(container, "السؤال الذي وافقت على إرساله");
    act(() => consentButton("موافقة وإرسال")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(mocks.stream).toHaveBeenCalledOnce();
    const providerHistory = mocks.stream.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    expect(providerHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "user", content: "السؤال الذي وافقت على إرساله" }),
    ]));
    expect(providerHistory.some((message) => message.content.includes("سؤال اختباري قبل الموافقة"))).toBe(false);
    expect(mocks.saveConversation).toHaveBeenCalled();
    const savedCountAfterApproval = mocks.saveConversation.mock.calls.length;

    revokeCompanionAiConsent();
    enterMessage(container, "سؤال بعد سحب الإذن");
    expect(consentButton("ليس الآن")).toBeDefined();
    expect(mocks.stream).toHaveBeenCalledOnce();
    expect(mocks.saveConversation).toHaveBeenCalledTimes(savedCountAfterApproval);
    expect(mocks.savePartialStream).not.toHaveBeenCalled();
  });
});
