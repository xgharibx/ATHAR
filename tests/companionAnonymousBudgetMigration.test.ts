import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("supabase/migrations/20261005010354_companion_anonymous_budget.sql");

describe("anonymous Companion usage budget migration", () => {
  it("adds a service-role-only reservation against the shared daily spend cap", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/create or replace function public\.reserve_companion_anonymous_request\(\s*p_request_bytes integer,\s*p_max_output_tokens integer\s*\)/i);
    expect(sql).toMatch(/v_global\.daily_request_count\s*>?=\s*v_daily_request_limit/i);
    expect(sql).toMatch(/v_global\.reserved_cost_micro_usd\s*\+\s*v_request_cost_micro_usd\s*>\s*v_daily_budget_micro_usd/i);
    expect(sql).toMatch(/revoke all on function public\.reserve_companion_anonymous_request\(integer, integer\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.reserve_companion_anonymous_request\(integer, integer\) to service_role/i);
  });
});
