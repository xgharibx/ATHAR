import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

describe("mobile browser magnification", () => {
  it("does not disable pinch zoom in the page viewport", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const { document } = new JSDOM(html).window;
    const content = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.content ?? "";
    const directives = content.split(",").map((directive) => directive.trim().toLowerCase());

    expect(directives).not.toContain("user-scalable=no");
    expect(directives).not.toContain("maximum-scale=1.0");
    expect(directives).not.toContain("maximum-scale=1");
  });
});
