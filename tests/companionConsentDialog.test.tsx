// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionAiConsentDialog } from "@/components/companion/CompanionAiConsentDialog";

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
});

describe("Ask Athar AI sharing consent dialog", () => {
  it("names MiniMax and the message context before offering approval", () => {
    const onApprove = vi.fn();
    const onCancel = vi.fn();
    render(<CompanionAiConsentDialog open onApprove={onApprove} onCancel={onCancel} />);

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("MiniMax");
    expect(dialog?.textContent).toContain("سياق المحادثة والصفحة");
    expect(dialog?.textContent).toContain("حتى تسحب الإذن من الإعدادات");
    const descriptionIds = (dialog?.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    expect(descriptionIds.length).toBeGreaterThan(0);
    expect(descriptionIds.every((id) => document.getElementById(id) !== null)).toBe(true);
    expect(descriptionIds.map((id) => document.getElementById(id)?.textContent ?? "").join(" ")).toContain("حتى تسحب الإذن من الإعدادات");
    expect(dialog?.querySelector('a[href="https://www.athark.org/privacy.html"]')).not.toBeNull();
    expect(Array.from(document.body.querySelectorAll("div")).some((element) => element.className.includes("z-[10001]"))).toBe(true);

    const approve = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) => button.textContent?.includes("موافقة وإرسال"));
    expect(approve).toBeDefined();
    act(() => approve?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("allows the user to decline without approving the send", () => {
    const onApprove = vi.fn();
    const onCancel = vi.fn();
    render(<CompanionAiConsentDialog open onApprove={onApprove} onCancel={onCancel} />);

    const dialog = document.body.querySelector('[role="dialog"]');
    const cancel = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) => button.textContent?.includes("ليس الآن"));
    expect(cancel).toBeDefined();
    act(() => cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });
});
