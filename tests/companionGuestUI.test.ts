import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Companion guest access surfaces", () => {
  it.each([
    "src/pages/Companion.tsx",
    "src/components/companion/CompanionModal.tsx",
  ])("does not block guest messages in %s", (relativePath) => {
    const source = fs.readFileSync(path.resolve(relativePath), "utf8");

    expect(source).not.toMatch(/hasCompanionSession\s*\(/);
    expect(source).not.toContain("تسجيل الدخول مطلوب لاستخدام رفيق أثر");
  });
});
