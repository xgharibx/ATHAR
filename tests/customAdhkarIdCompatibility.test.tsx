// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomAdhkarPage } from "@/pages/CustomAdhkar";
import { useNoorStore } from "@/store/noorStore";

let root: Root;
let container: HTMLDivElement;
let originalCustomPacks: ReturnType<typeof useNoorStore.getState>["customPacks"];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalCustomPacks = useNoorStore.getState().customPacks;
  useNoorStore.setState({ customPacks: [] });
  let seed = 0;
  vi.stubGlobal("crypto", {
    getRandomValues: (bytes: Uint8Array) => {
      seed += 1;
      bytes.fill(seed);
      return bytes;
    },
  });
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useNoorStore.setState({ customPacks: originalCustomPacks });
  vi.unstubAllGlobals();
});

describe("custom adhkar IDs on older WebViews", () => {
  it("opens the pack form and adds a row without randomUUID", () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <CustomAdhkarPage />
        </MemoryRouter>,
      );
    });

    const createPack = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("إنشاء حزمة جديدة"));
    expect(createPack).toBeDefined();

    act(() => createPack?.click());
    expect(container.querySelector("#pack-title")).not.toBeNull();
    expect(container.querySelectorAll('input[aria-label^="نص الذكر"]')).toHaveLength(1);

    const addRow = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("إضافة ذكر"));
    act(() => addRow?.click());

    expect(container.querySelectorAll('input[aria-label^="نص الذكر"]')).toHaveLength(2);
  });
});
