import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("supabase/migrations/20261003051933_companion_global_budget.sql");

describe("Companion global-budget migration", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  it("keeps aggregate usage private and bounds the estimated daily provider spend", () => {
    expect(sql).toMatch(/create table(?: if not exists)? public\.companion_global_usage_counters/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.companion_global_usage_counters from public, anon, authenticated/);
    expect(sql).toMatch(/grant select, insert, update, delete on table public\.companion_global_usage_counters to service_role/);
    expect(sql).toMatch(/v_daily_budget_micro_usd bigint := 1000000/);
    expect(sql).toMatch(/v_daily_request_limit integer := 250/);
    expect(sql).toMatch(/p_request_bytes::bigint \+ 1024 \+ \(p_max_output_tokens::bigint \* 3\)/);
  });

  it("serializes global and per-user quota reservations before updating either counter", () => {
    const globalLock = sql.indexOf("from public.companion_global_usage_counters\n  where utc_day = v_utc_day\n  for update");
    const accountLock = sql.indexOf("from public.companion_usage_counters\n  where user_id = p_user_id\n  for update");
    const limitCheck = sql.indexOf("v_global.reserved_cost_micro_usd + v_request_cost_micro_usd > v_daily_budget_micro_usd");
    const accountIncrement = sql.indexOf("daily_count = v_daily_count + 1");
    const globalIncrement = sql.indexOf("reserved_cost_micro_usd = v_global.reserved_cost_micro_usd + v_request_cost_micro_usd");

    expect(globalLock).toBeGreaterThan(-1);
    expect(accountLock).toBeGreaterThan(globalLock);
    expect(limitCheck).toBeGreaterThan(accountLock);
    expect(accountIncrement).toBeGreaterThan(limitCheck);
    expect(globalIncrement).toBeGreaterThan(limitCheck);
  });

  it("restricts both the parameterized RPC and legacy wrapper to service_role", () => {
    expect(sql).toMatch(/revoke all on function public\.reserve_companion_request\(uuid, integer, integer\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.reserve_companion_request\(uuid, integer, integer\) to service_role/);
    expect(sql).toMatch(/revoke all on function public\.reserve_companion_request\(uuid\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.reserve_companion_request\(uuid\) to service_role/);
  });
});
