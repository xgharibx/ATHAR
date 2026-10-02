import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function routePaths(source: string): Set<string> {
  const file = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const paths = new Set<string>();

  const visit = (node: ts.Node, parentPath: string) => {
    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText(file)
      : ts.isJsxSelfClosingElement(node)
        ? node.tagName.getText(file)
        : "";

    if (tagName === "Route") {
      const attributes = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
      const pathAttribute = attributes.properties.find((attribute) =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "path",
      );
      const pathInitializer = pathAttribute && ts.isJsxAttribute(pathAttribute)
        ? pathAttribute.initializer
        : undefined;
      const segment = pathInitializer && ts.isStringLiteral(pathInitializer)
        ? pathInitializer.text
        : "";
      const currentPath = [parentPath, segment].filter(Boolean).join("/");
      const isIndex = attributes.properties.some((attribute) =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "index",
      );

      if ((segment && !/[:*]/.test(currentPath)) || isIndex) {
        paths.add(currentPath ? `/${currentPath}` : "/");
      }

      if (ts.isJsxElement(node)) {
        for (const child of node.children) visit(child, currentPath);
      }
      return;
    }

    ts.forEachChild(node, (child) => visit(child, parentPath));
  };

  visit(file, "");
  return paths;
}

describe("public sitemap routes", () => {
  it("lists only static paths registered by the app router", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const sitemap = readFileSync(resolve(process.cwd(), "public/sitemap.xml"), "utf8");
    const { document } = new JSDOM(sitemap, { contentType: "text/xml" }).window;
    const locs = Array.from(document.getElementsByTagName("loc"), (loc) => new URL(loc.textContent ?? "").pathname);
    const registered = routePaths(app);

    expect(locs.length).toBeGreaterThan(0);
    expect(locs.filter((path) => !registered.has(path))).toEqual([]);
  });
});
