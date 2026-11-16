import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Companion daily budget", () => {
  const sql = fs.readFileSync(
    path.resolve("supabase/migrations/20261116165455_companion_daily_budget_two_usd.sql"),
    "utf8",
  );

  it("raises the shared ceiling to two dollars for both reservation functions", () => {
    expect(sql).toContain("'reserve_companion_request', 'reserve_companion_anonymous_request'");
    expect(sql).toContain("'v_daily_budget_micro_usd bigint := 1000000;'");
    expect(sql).toContain("'v_daily_budget_micro_usd bigint := 2000000;'");
  });

  it("changes nothing but that constant, so access rules are untouched", () => {
    expect(sql.toLowerCase()).not.toMatch(/\bgrant\b|\brevoke\b|\bdrop\b|security invoker/);
  });
});
