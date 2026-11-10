import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/20261110000806_leaderboard_atomic_rollup_upsert.sql",
);

describe("atomic leaderboard rollup upsert migration", () => {
  it("performs each score merge inside the conflict update transaction", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/create or replace function public\.leaderboard_upsert_rollups_batch\s*\(p_rows jsonb\)/i);
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/on conflict\s*\(day,\s*period,\s*board,\s*section_id,\s*user_id\)\s*do update/i);
    expect(sql).toMatch(/excluded\.generated_at\s*>\s*public\.leaderboard_rollups\.generated_at/i);
    expect(sql).toMatch(/greatest\(public\.leaderboard_rollups\.score,\s*excluded\.score\)/i);
    expect(sql).toMatch(/grant execute on function public\.leaderboard_upsert_rollups_batch\(jsonb\) to service_role/i);
    expect(sql).toMatch(/revoke all on function public\.leaderboard_upsert_rollups_batch\(jsonb\) from public, anon, authenticated/i);
  });
});
