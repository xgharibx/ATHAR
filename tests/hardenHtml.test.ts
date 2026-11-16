import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEVTOOLS_GUARD,
  buildContentSecurityPolicy,
  hardenHtml,
  inlineExecutableScripts,
} from "../tools/build/hardenHtml";

const sha = (source: string) => createHash("sha256").update(source, "utf8").digest("base64");

const shell = `<!doctype html><html><head>
    <meta charset="UTF-8" />
    <script type="application/ld+json">{"a":1}</script>
    <script id="boot">window.x = 1;</script>
    <script type="module" src="/assets/index.js"></script>
  </head><body></body></html>`;

describe("hardenHtml", () => {
  it("collects only inline scripts the browser executes", () => {
    expect(inlineExecutableScripts(shell)).toEqual(["window.x = 1;"]);
  });

  it("allows inline scripts by hash and never by 'unsafe-inline'", () => {
    const html = hardenHtml(shell);
    const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
    const scriptSrc = policy.split("; ").find((d) => d.startsWith("script-src ")) ?? "";
    expect(scriptSrc).toContain(`'sha256-${sha("window.x = 1;")}'`);
    expect(scriptSrc).toContain(`'sha256-${sha(DEVTOOLS_GUARD)}'`);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
  });

  it("places the policy before any script", () => {
    const html = hardenHtml(shell);
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<script"));
    expect(html.indexOf(DEVTOOLS_GUARD)).toBeLessThan(html.indexOf('id="boot"'));
  });

  it("rejects inline event handlers, which the policy would silently block", () => {
    const bad = shell.replace("<body>", '<body><img src="a.png" onerror="alert(1)">');
    expect(() => hardenHtml(bad)).toThrow(/inline event handlers/);
  });

  it("keeps script sources to the app and the video player", () => {
    const scriptSrc = buildContentSecurityPolicy([]).split("; ")[1];
    expect(scriptSrc).toBe("script-src 'self' 'wasm-unsafe-eval' https://www.youtube.com https://s.ytimg.com");
  });

  it("accepts the real application shell", () => {
    const html = hardenHtml(readFileSync("index.html", "utf8"));
    expect(html).toContain("Content-Security-Policy");
  });
});
