import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const migrations = path.join(root, "supabase/migrations");
const migrationName = fs.readdirSync(migrations).find((file) =>
  file.endsWith("_leaderboard_submit_score_snapshot.sql"),
);

describe("leaderboard score submission transaction migration", () => {
  it("serializes score writes with account deletion and keeps event and rollup writes atomic", () => {
    expect(migrationName).toBeTruthy();
    const sql = fs.readFileSync(path.join(migrations, migrationName!), "utf8");
    const body = sql.slice(sql.indexOf("as $$"), sql.lastIndexOf("$$;"));

    expect(body).toMatch(/pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(v_user_id,\s*0\)\)/i);
    expect(body).toMatch(/from public\.leaderboard_user_profiles[\s\S]*?if not found/i);
    expect(body).toMatch(/insert into public\.leaderboard_score_events/i);
    expect(body).toMatch(/insert into public\.leaderboard_rollups/i);
    expect(sql).toMatch(/revoke all on function public\.leaderboard_submit_score_snapshot\(text, text, jsonb, jsonb\)\s+from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.leaderboard_submit_score_snapshot\(text, text, jsonb, jsonb\)\s+to service_role/i);
  });
});
