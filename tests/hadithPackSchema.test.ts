import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HadithPackSchema, HadithBookIndexSchema } from "@/data/hadithSchemas";

describe("bundled Hadith data schema", () => {
  it("accepts the installed index and every complete book pack", () => {
    const index = HadithBookIndexSchema.parse(
      JSON.parse(readFileSync("public/data/hadith/index.json", "utf8")),
    );

    expect(index.length).toBeGreaterThan(0);
    for (const book of index) {
      const pack = JSON.parse(readFileSync(`public/data/hadith/${book.key}.json`, "utf8"));
      expect(HadithPackSchema.parse(pack)).toMatchObject({ key: book.key });
    }
  });

  it("accepts decimal hadith display numbers used in several editions", () => {
    const parsed = HadithPackSchema.parse({
      key: "nawawi",
      title: "الأربعون النووية",
      titleEn: "Forty Hadith Nawawi",
      color: "#84cc16",
      order: 8,
      grade: "sahih",
      description: "أحاديث نبوية",
      count: 1,
      sections: [{ id: 1, title: "Faith", first: 402.2, last: 402.2 }],
      hadiths: [{ n: 402.2, a: 402.2, s: 1, t: "حديث صحيح", g: [] }],
    });

    expect(parsed.hadiths[0]?.n).toBe(402.2);
  });

  it("rejects malformed hadith entries before they reach the reader", () => {
    expect(() => HadithPackSchema.parse({
      key: "nawawi",
      title: "الأربعون النووية",
      titleEn: "Forty Hadith Nawawi",
      color: "#84cc16",
      order: 8,
      grade: "sahih",
      description: "أحاديث نبوية",
      count: 1,
      sections: [],
      hadiths: [{ n: "1", s: 1, t: 25, g: null }],
    })).toThrow();
  });
});
