// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Slider } from "@/components/ui/Slider";
import { Modal } from "@/components/ui/Modal";

vi.mock("@/data/useAdhkarDB", () => ({ useAdhkarDB: () => ({ data: undefined }) }));
vi.mock("@/data/useQuranDB", () => ({ useQuranDB: () => ({ data: undefined }) }));
vi.mock("@/data/useIslamicLibraryDB", () => ({ useIslamicLibraryDB: () => ({ data: undefined }) }));

const roots: Array<{ root: Root; container: HTMLDivElement }> = [];

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

function render(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push({ root, container });
  act(() => root.render(node));
  return container;
}

afterEach(() => {
  for (const { root, container } of roots.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
});

function ModalFixture() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <button data-outside>Page action</button>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Settings">
        <input aria-label="First setting" />
        <button>Last setting</button>
      </Modal>
    </>
  );
}

function QuickSearchFixture() {
  const [open, setOpen] = React.useState(false);
  return (
    <MemoryRouter>
      <button onClick={() => setOpen(true)}>Open quick search</button>
      <button data-outside>Page action</button>
      <QuickSearch open={open} setOpen={setOpen} />
    </MemoryRouter>
  );
}

// Import after declaring the data-hook doubles; the palette's search behavior
// remains real while its unrelated IndexedDB-backed data sources stay empty.
import { CommandPalette as QuickSearch } from "@/components/layout/CommandPalette";

const press = (target: HTMLElement, key: string, shiftKey = false) => {
  act(() => target.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true })));
};

describe("accessible controls", () => {
  it("exposes the Slider's label on the actual slider thumb", () => {
    const container = render(<Slider aria-label="حجم الخط" defaultValue={[16]} min={12} max={24} />);
    expect(container.querySelector('[role="slider"]')?.getAttribute("aria-label")).toBe("حجم الخط");
  });
});

describe("shared modal focus behavior", () => {
  it("moves focus into the named dialog and restores it to the opener on Escape", async () => {
    const container = render(<ModalFixture />);
    const opener = container.querySelector("button")!;
    opener.focus();
    act(() => opener.click());
    await act(async () => { await Promise.resolve(); });

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const titleId = dialog.getAttribute("aria-labelledby");
    const title = document.getElementById(titleId ?? "");
    expect(title?.textContent).toBe("Settings");
    expect(dialog.contains(title)).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('[aria-label="First setting"]'));

    press(dialog, "Escape");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("keeps desktop dialog content above its backdrop for pointer interaction", async () => {
    const container = render(<ModalFixture />);
    act(() => container.querySelector("button")!.click());
    await act(async () => { await Promise.resolve(); });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.className.split(/\s+/)).toContain("sm:relative");
  });

  it("keeps focus inside while the modal is open", async () => {
    const container = render(<ModalFixture />);
    (container.querySelector("button") as HTMLButtonElement).focus();
    act(() => container.querySelector("button")!.click());
    await act(async () => { await Promise.resolve(); });

    const outside = container.querySelector("[data-outside]") as HTMLButtonElement;
    act(() => outside.focus());
    await act(async () => { await Promise.resolve(); });
    expect(document.activeElement).not.toBe(outside);
    expect(document.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
  });

  it("wraps Tab from the last control back to the first control", async () => {
    const container = render(<ModalFixture />);
    (container.querySelector("button") as HTMLButtonElement).focus();
    act(() => container.querySelector("button")!.click());
    await act(async () => { await Promise.resolve(); });

    const first = document.querySelector('[aria-label="First setting"]') as HTMLInputElement;
    const last = document.querySelector('[role="dialog"] button') as HTMLButtonElement;
    act(() => last.focus());
    press(last, "Tab");
    expect(document.activeElement).toBe(first);
  });
});

describe("quick search focus behavior", () => {
  it("focuses its search field on open, contains focus, and restores the opener on Escape", async () => {
    const container = render(<QuickSearchFixture />);
    const opener = container.querySelector("button")!;
    opener.focus();
    act(() => opener.click());
    await act(async () => { await Promise.resolve(); });

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const search = dialog.querySelector("input")!;
    const titleId = dialog.getAttribute("aria-labelledby");
    const title = document.getElementById(titleId ?? "");
    expect(title?.textContent).toBe("البحث السريع");
    expect(dialog.contains(title)).toBe(true);
    expect(search.getAttribute("aria-label")).toBe("ابحث عن ذكر أو سورة أو آية");
    expect(document.activeElement).toBe(search);
    press(search, "Tab");
    expect(document.activeElement).toBe(search);

    const outside = container.querySelector("[data-outside]") as HTMLButtonElement;
    act(() => outside.focus());
    await act(async () => { await Promise.resolve(); });
    expect(dialog.contains(document.activeElement)).toBe(true);

    press(dialog, "Escape");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
