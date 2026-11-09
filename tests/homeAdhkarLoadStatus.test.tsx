// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdhkarLoadStatus } from "@/components/home/AdhkarLoadStatus";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("Home adhkar load recovery", () => {
  it("offers an accessible retry with friendly copy when no data is available", async () => {
    const retry = vi.fn();
    await act(async () => {
      root.render(<AdhkarLoadStatus hasData={false} error={new Error("fetch failed")} isFetching={false} onRetry={retry} />);
    });

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain("تعذّر تحميل الأذكار");
    expect(container.textContent).not.toContain("public/data/adhkar");
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="إعادة تحميل الأذكار"]');
    expect(button).not.toBeNull();

    await act(async () => button?.click());
    expect(retry).toHaveBeenCalledOnce();
  });

  it("keeps cached data available and presents refresh failure as a non-blocking status", async () => {
    const retry = vi.fn();
    await act(async () => {
      root.render(<AdhkarLoadStatus hasData error={new Error("network unavailable")} isFetching={false} onRetry={retry} />);
    });

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("تعذّر تحديث الأذكار");
    expect(container.textContent).toContain("آخر بيانات متاحة");
    expect(container.querySelector('button[aria-label="إعادة تحميل الأذكار"]')).not.toBeNull();
  });

  it("renders nothing when the adhkar data loaded without an error", async () => {
    await act(async () => {
      root.render(<AdhkarLoadStatus hasData error={null} isFetching={false} onRetry={vi.fn()} />);
    });

    expect(container.textContent).toBe("");
  });
});
