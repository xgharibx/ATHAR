import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repositoryRoot = process.cwd();

describe("leaderboard rollup retention migration", () => {
  it("keeps only years that can appear in the yearly board and schedules recurring cleanup", () => {
    const migrationDirectory = path.join(repositoryRoot, "supabase/migrations");
    const migrationName = fs.readdirSync(migrationDirectory).find((file) =>
      file.endsWith("_leaderboard_rollup_retention.sql")
    );

    expect(migrationName).toBeDefined();
    const migration = fs.readFileSync(path.join(migrationDirectory, migrationName!), "utf8");

    expect(migration).toMatch(/delete\s+from\s+public\.leaderboard_rollups[\s\S]*?day\s*<\s*date_trunc\('year',\s*current_date\)::date/i);
    expect(migration).toMatch(/cron\.schedule\s*\([\s\S]*?athar_prune_leaderboard_rollups/i);
  });
});
