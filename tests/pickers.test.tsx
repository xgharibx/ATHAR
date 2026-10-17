// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateField, Select, TimeField, formatDateAr, formatTimeAr } from "@/components/ui/Pickers";

const roots: Array<{ root: Root; container: HTMLDivElement }> = [];
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
const click = (el: Element | null | undefined) => act(() => { (el as HTMLElement).click(); });
const byText = (t: string, scope: ParentNode = document) =>
  [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim() === t);

afterEach(() => {
  for (const { root, container } of roots.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
});

describe("formatters", () => {
  it("writes Arabic dates without a thousands separator", () => {
    expect(formatDateAr("2026-10-17")).toBe("١٧ أكتوبر ٢٠٢٦");
    expect(formatDateAr("")).toBe("");
  });
  it("writes 12-hour Arabic times", () => {
    expect(formatTimeAr("04:30")).toBe("٤:٣٠ ص");
    expect(formatTimeAr("00:05")).toBe("١٢:٠٥ ص");
    expect(formatTimeAr("12:00")).toBe("١٢:٠٠ م");
    expect(formatTimeAr("23:59")).toBe("١١:٥٩ م");
  });
});

describe("Select", () => {
  it("shows the chosen label and reports a picked value", () => {
    const onChange = vi.fn();
    const c = render(
      <Select value={5} onChange={onChange} aria-label="الطريقة">
        <option value={3}>ثلاثة</option>
        <option value={5}>خمسة</option>
      </Select>,
    );
    expect(c.textContent).toContain("خمسة");
    click(c.querySelector("button"));
    click(byText("ثلاثة"));
    expect(onChange).toHaveBeenCalledWith({ target: { value: "3" } });
  });
});

describe("DateField", () => {
  it("picks a day, honours max, and can clear", () => {
    const onChange = vi.fn();
    const c = render(<DateField value="2026-10-17" max="2026-10-17" onChange={onChange} />);
    click(c.querySelector("button"));
    const future = byText("٢٠");
    expect((future as HTMLButtonElement).disabled).toBe(true);
    click(byText("١٠"));
    expect(onChange).toHaveBeenCalledWith({ target: { value: "2026-10-10" } });
  });
});

describe("TimeField", () => {
  it("applies the draft only on confirm", () => {
    const onChange = vi.fn();
    const c = render(<TimeField value="06:00" onChange={onChange} />);
    click(c.querySelector("button"));
    const sheet = document.querySelector('[data-testid="time-sheet"]')!;
    click(byText("م", sheet));
    expect(onChange).not.toHaveBeenCalled();
    click(byText("تم", sheet));
    expect(onChange).toHaveBeenCalledWith({ target: { value: "18:00" } });
  });
});
