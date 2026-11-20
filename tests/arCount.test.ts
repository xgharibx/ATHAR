import { describe, expect, it } from "vitest";
import { arCount } from "@/lib/formatNumber";

describe("Arabic count agreement", () => {
  const story = { one: "قصة", two: "قصتان", few: "قصص" };
  const book = { one: "كتاب", two: "كتابان", few: "كتب" };
  it("says one, two, a few and many the Arabic way", () => {
    expect(arCount(1, story)).toBe("قصة واحدة");
    expect(arCount(1, book)).toBe("كتاب واحد");
    expect(arCount(2, story)).toBe("قصتان");
    expect(arCount(3, story)).toBe("٣ قصص");
    expect(arCount(10, book)).toBe("١٠ كتب");
    expect(arCount(11, story)).toBe("١١ قصة");
    expect(arCount(103, book)).toBe("١٠٣ كتب");
  });
});
