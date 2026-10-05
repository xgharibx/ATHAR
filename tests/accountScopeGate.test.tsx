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
});
