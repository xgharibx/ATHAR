import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repositoryRoot = process.cwd();
const cutoffMigration = "20261003061100_athar_sync_write_cutoff.sql";

describe("Supabase migration release gates", () => {
  it("keeps the legacy-write cutoff out of routine db push migrations", () => {
    const activeMigrationDirectory = path.join(repositoryRoot, "supabase/migrations");
    const releaseGateDirectory = path.join(repositoryRoot, "supabase/release-gates");

    expect(fs.readdirSync(activeMigrationDirectory)).not.toContain(cutoffMigration);
    expect(fs.existsSync(path.join(releaseGateDirectory, cutoffMigration))).toBe(true);
  });
});
