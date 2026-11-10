import { describe, expect, it } from "vitest";

import { createDhikrItemId, dhikrStateKey, newDhikrItemId } from "@/lib/dhikrItemIdentity";

describe("custom dhikr item identity", () => {
  it("creates the same legacy identity on devices with the same saved item", () => {
    expect(createDhikrItemId("pack-a/section-a", 2, "الحمد لله"))
      .toBe(createDhikrItemId("pack-a/section-a", 2, "الحمد لله"));
  });

  it("keeps different items and owners separate", () => {
    const id = createDhikrItemId("pack-a/section-a", 2, "الحمد لله");
    expect(createDhikrItemId("pack-a/section-a", 3, "الحمد لله")).not.toBe(id);
    expect(createDhikrItemId("pack-b/section-a", 2, "الحمد لله")).not.toBe(id);
    expect(createDhikrItemId("pack-a/section-a", 2, "سبحان الله")).not.toBe(id);
  });

  it("uses an item ID for mutable state keys and keeps catalog indices compatible", () => {
    expect(dhikrStateKey("custom_trip", 2, "item-c")).toBe("custom_trip:item:item-c");
    expect(dhikrStateKey("morning", 2)).toBe("morning:2");
  });

  it("creates a fresh identity when an item is newly added", () => {
    expect(newDhikrItemId()).not.toBe(newDhikrItemId());
  });
});
