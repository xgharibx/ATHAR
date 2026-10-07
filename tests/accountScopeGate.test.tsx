// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AccountScopeGate", () => {
  it("keeps the launch surface clear while account data is hydrating", () => {
    const app = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
    const accountGate = app.slice(app.indexOf("if (!accountScope.ready)"), app.indexOf("function AppContent"));
    expect(accountGate).not.toMatch(/PageSkeleton/);
  });

  it("does not show a skeleton while a lazy route loads", () => {
    const app = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
    const routeBoundary = app.slice(app.indexOf("function S("), app.indexOf("const HomePage"));
    expect(routeBoundary).toMatch(/<RouteScene>/);
    const scene = fs.readFileSync(path.resolve("src/components/layout/RouteScene.tsx"), "utf8");
    expect(scene).toMatch(/fallback=\{null\}/);
    expect(routeBoundary).not.toMatch(/PageSkeleton/);
  });
});
