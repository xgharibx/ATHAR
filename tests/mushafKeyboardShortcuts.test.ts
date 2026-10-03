import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const mushafSource = readFileSync(
  fileURLToPath(new URL("../src/pages/Mushaf.tsx", import.meta.url)),
  "utf8",
);

describe("Mushaf keyboard shortcuts", () => {
  it("tracks share-sheet state so Escape closes the open sheet", () => {
    const keyboardEffect = mushafSource.match(
      /\/\/ Keyboard navigation([\s\S]*?)\/\/ Share selected ayah/,
    )?.[1];
    expect(keyboardEffect).toBeDefined();

    const dependencies = keyboardEffect?.match(/\}, \[([\s\S]*?)\]\);/)?.[1];
    expect(keyboardEffect).toContain("if (shareSheetOpen)");
    expect(dependencies?.split(",").map((dependency) => dependency.trim())).toContain(
      "shareSheetOpen",
    );
  });
});
