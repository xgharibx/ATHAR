import { afterEach, describe, expect, it, vi } from "vitest";

import { createRandomId } from "@/lib/randomId";

afterEach(() => vi.unstubAllGlobals());

describe("random IDs on older WebViews", () => {
  it("uses getRandomValues when randomUUID is unavailable", () => {
    let seed = 0;
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        seed += 1;
        bytes.fill(seed);
        return bytes;
      },
    });

    const first = createRandomId();
    const second = createRandomId();

    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(second).not.toBe(first);
  });
});
