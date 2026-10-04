// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { FocusManagedDialog } from "@/components/ui/FocusManagedDialog";

const roots: Array<{ root: Root; container: HTMLDivElement }> = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
}
);

function DialogFixture() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <button data-outside>Outside action</button>
      {open && (
        <FocusManagedDialog aria-label="Reader settings" onClose={() => setOpen(false)}>
          <button>First option</button>
          <button>Last option</button>
        </FocusManagedDialog>
      )}
    </>
  );
}

const press = (target: HTMLElement, key: string, shiftKey = false) => {
  act(() => target.dispatchEvent(new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  })));
};

describe("FocusManagedDialog", () => {
  it("moves focus in, contains Tab in both directions, closes on Escape, and restores the opener", async () => {
    const container = render(<DialogFixture />);
    const opener = container.querySelector("button")!;
    opener.focus();
    act(() => opener.click());
    await act(async () => { await Promise.resolve(); });

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const [first, last] = Array.from(dialog.querySelectorAll("button")) as HTMLButtonElement[];
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(first);

    press(first, "Tab", true);
    expect(document.activeElement).toBe(last);
    press(last, "Tab");
    expect(document.activeElement).toBe(first);

    const outside = container.querySelector("[data-outside]") as HTMLButtonElement;
    act(() => outside.focus());
    expect(dialog.contains(document.activeElement)).toBe(true);

    let escapedToWindow = false;
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") escapedToWindow = true;
    };
    window.addEventListener("keydown", onWindowKeyDown);
    press(first, "Escape");
    window.removeEventListener("keydown", onWindowKeyDown);
    await act(async () => { await Promise.resolve(); });

    expect(escapedToWindow).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
