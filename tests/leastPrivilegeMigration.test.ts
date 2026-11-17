import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("least-privilege hardening migration", () => {
  const sql = fs.readFileSync(
    path.resolve("supabase/migrations/20261116215522_least_privilege_hardening.sql"),
    "utf8",
  ).toLowerCase();

  it("removes every table privilege from anonymous callers on synced data", () => {
    expect(sql).toContain("revoke all privileges on table public.athar_sync, public.athar_profiles from public, anon;");
    expect(sql).toContain("revoke truncate, references, trigger on table public.athar_sync, public.athar_profiles from authenticated;");
  });

  it("scopes every sync policy to signed-in users", () => {
    const scoped = sql.match(/alter policy \w+ on public\.athar_(sync|profiles) to authenticated;/g) ?? [];
    expect(scoped).toHaveLength(7);
  });

  it("never opens access: no grant and no permissive policy", () => {
    expect(sql).not.toMatch(/\bgrant\b/);
    expect(sql).not.toMatch(/using \(true\)/);
    expect(sql).toContain("as restrictive for all to anon, authenticated using (false) with check (false)");
  });

  it("enables row-level security on the account link table", () => {
    expect(sql).toContain("alter table private.auth_leaderboard_identity_links enable row level security;");
  });
});
