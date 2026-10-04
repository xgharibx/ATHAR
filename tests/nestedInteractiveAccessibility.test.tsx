// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const surahs = [{ id: 1, name: "الفاتحة", englishName: "Al-Fatihah", ayahs: ["بِسْمِ اللَّهِ", "الْحَمْدُ لِلَّهِ"] }];

vi.mock("@/data/useQuranDB", () => ({ useQuranDB: () => ({ data: surahs, isLoading: false, error: null }) }));
vi.mock("@/data/quranLoad", () => ({ loadQuranPageMap: () => new Promise(() => {}) }));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => {} }));
vi.mock("@/data/quranExtras", async () => {
  const actual = await vi.importActual<typeof import("@/data/quranExtras")>("@/data/quranExtras");
  return {
    ...actual,
    sajdaInSurah: () => [],
    loadQuranExtras: () => new Promise(() => {}),
    getEnglishRowPreview: () => null,
  };
});
vi.mock("@/lib/companionAI", () => ({
  ROUTE_LABELS: {},
  isCompanionReady: () => true,
  hasCompanionSession: async () => true,
  streamCompanionReply: async (_messages: unknown, callbacks: { onDone: (text: string, verification: null) => void }) => {
    callbacks.onDone(`:::reminder\n${JSON.stringify({ category: "dhikr", title: "تذكير الاختبار", repeat: "daily", atTimeOfDay: "06:30", deeplink: { route: "/reminders" } })}\n:::`, null);
  },
}));
vi.mock("@/lib/companionHistory", () => ({
  clearPartialStream: () => {},
  loadPartialStream: () => null,
  savePartialStream: () => {},
  saveConversation: async () => {},
  newConversationId: () => "accessibility-test",
  listConversations: () => new Promise(() => {}),
  getConversation: async () => null,
  titleFromMessages: () => "test",
}));
vi.mock("@/lib/useStickToBottom", () => ({
  useStickToBottom: () => ({ scrollerRef: { current: null }, endRef: { current: null }, atBottom: true, scrollToBottom: () => {}, stickToBottom: () => {} }),
}));
vi.mock("@/store/customReminderActions", () => ({
  addCustomReminder: () => "test-reminder",
  deleteCustomReminder: vi.fn(),
}));

import { CompanionModal } from "@/components/companion/CompanionModal";
import { QuranPage } from "@/pages/Quran";
import { SebhaPage } from "@/pages/Sebha";
import { deleteCustomReminder } from "@/store/customReminderActions";
import { useNoorStore } from "@/store/noorStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function LocationMarker() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(node));
}

beforeEach(() => {
  document.body.innerHTML = "";
  useNoorStore.setState((state) => ({
    ...state,
    prefs: { ...state.prefs, quranSortMode: "mushaf", quranFilterJuz: null, quranFilterRevelation: "all" },
    sebhaSelected: "subhanallah",
    sebhaCustom: { phrase: "سبحان الله وبحمده", target: 33 },
    quickTasbeeh: {},
    customReminders: [{ id: "stored-reminder", title: "تذكير الاختبار", category: "dhikr", repeat: "daily", enabled: true, atTimeOfDay: "06:30", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
  }));
  vi.clearAllMocks();
  window.scrollTo = () => {};
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("interactive controls inside content rows", () => {
  it("keeps surah open, preview, and info actions as sibling buttons", () => {
    mount(
      <MemoryRouter initialEntries={["/quran"]}>
        <Routes>
          <Route path="/quran" element={<><QuranPage /><LocationMarker /></>} />
          <Route path="/mushaf" element={<LocationMarker />} />
        </Routes>
      </MemoryRouter>,
    );

    const item = container.querySelector('[role="listitem"]')!;
    expect(item.querySelector('[role="button"]')).toBeNull();
    const actions = Array.from(item.querySelectorAll("button"));
    expect(actions.map((button) => button.getAttribute("aria-label"))).toEqual([
      "افتح سورة الفاتحة في المصحف — 2 آية",
      "معاينة آيات الفاتحة",
      "معلومات سورة الفاتحة",
    ]);
    expect(actions.every((button) => button.parentElement?.parentElement === item)).toBe(true);

    act(() => actions[1]!.click());
    expect(actions[1]!.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/quran");
    act(() => actions[2]!.click());
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/quran");
    act(() => actions[0]!.click());
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/mushaf");
  });

  it("gives the custom dhikr selector and edit action independent button semantics", () => {
    mount(<MemoryRouter><SebhaPage /></MemoryRouter>);

    const edit = container.querySelector<HTMLButtonElement>('button[aria-label="تعديل الذكر المخصص"]');
    expect(edit?.type).toBe("button");
    const card = edit?.parentElement;
    expect(card?.querySelector('[role="button"]')).toBeNull();
    const select = card?.querySelector<HTMLButtonElement>('button[aria-pressed]');
    expect(select?.type).toBe("button");
    expect(select?.getAttribute("aria-pressed")).toBe("false");

    act(() => edit!.click());
    expect(container.querySelector("#custom-phrase")).not.toBeNull();
    expect(select?.getAttribute("aria-pressed")).toBe("false");

    act(() => select!.click());
    expect(select?.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders reminder open and cancel actions as separate peer buttons", async () => {
    mount(<MemoryRouter><CompanionModal open prefill="أضف تذكيرًا" onClose={() => {}} /><LocationMarker /></MemoryRouter>);

    expect(document.body.textContent).not.toContain("MiniMax");
    expect(document.body.textContent).not.toContain("٤٨ ألف حرف");
    expect(document.body.querySelector('a[href="/companion"]')?.textContent).toBe("فتح الدردشة الكاملة");

    await act(async () => { document.body.querySelector<HTMLButtonElement>('button[aria-label="إرسال"]')!.click(); });

    const cancel = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "إلغاء");
    expect(cancel?.type).toBe("button");
    expect(cancel?.getAttribute("aria-label")).toBe("إلغاء التذكير تذكير الاختبار");
    const chip = cancel?.parentElement;
    expect(chip?.tagName).toBe("DIV");
    expect(chip?.querySelector('[role="button"]')).toBeNull();
    const open = chip?.querySelector<HTMLButtonElement>("button:not([aria-label])");
    expect(open?.type).toBe("button");

    act(() => cancel!.click());
    expect(deleteCustomReminder).toHaveBeenCalledWith("stored-reminder");
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/");
    act(() => open!.click());
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/reminders");
  });
});
