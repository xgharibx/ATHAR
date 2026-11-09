import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repositoryRoot = process.cwd();

const readProfileUpsert = (sql: string) => {
  const start = sql.search(/create\s+or\s+replace\s+function\s+public\.leaderboard_upsert_user_profile\s*\(/i);
  expect(start, "profile upsert function should be present").toBeGreaterThanOrEqual(0);
  const bodyStart = sql.indexOf("as $$", start);
  expect(bodyStart, "profile upsert body should be present").toBeGreaterThan(start);
  const bodyEnd = sql.indexOf("$$;", bodyStart);
  expect(bodyEnd, "profile upsert body should terminate").toBeGreaterThan(bodyStart);
  return sql.slice(bodyStart, bodyEnd);
};

const expectIdentityLockBeforeProfileWrite = (sql: string) => {
  const body = readProfileUpsert(sql);
  const identityLock = body.search(/pg_advisory_xact_lock\s*\(\s*(?:pg_catalog\.)?hashtextextended\s*\(\s*v_user_id\s*,\s*0\s*\)\s*\)/i);
  const profileWrite = body.search(/insert\s+into\s+(?:public\.)?leaderboard_user_profiles\b/i);

  expect(identityLock, "profile upsert must take the same user identity lock as account deletion").toBeGreaterThanOrEqual(0);
  expect(profileWrite, "profile upsert must write a profile").toBeGreaterThanOrEqual(0);
  expect(identityLock).toBeLessThan(profileWrite);
};

describe("leaderboard profile lock order", () => {
  it("locks the leaderboard identity before the profile UPSERT in current setup SQL", () => {
    const sql = fs.readFileSync(path.join(repositoryRoot, "tools/backend/leaderboard_v3_profiles.sql"), "utf8");
    expectIdentityLockBeforeProfileWrite(sql);
  });

  it("keeps the legacy full setup script from restoring the unsafe lock order", () => {
    const sql = fs.readFileSync(path.join(repositoryRoot, "tools/backend/leaderboard_ultimate_setup_2026-07-13.sql"), "utf8");
    expectIdentityLockBeforeProfileWrite(sql);
  });

  it("ships the lock-order repair as a forward migration", () => {
    const migrationDirectory = path.join(repositoryRoot, "supabase/migrations");
    const migrationName = fs.readdirSync(migrationDirectory).find((file) => file.endsWith("_leaderboard_profile_lock_order.sql"));

    expect(migrationName, "a forward migration is required; editing deployed migrations is unsafe").toBeDefined();
    const sql = fs.readFileSync(path.join(migrationDirectory, migrationName!), "utf8");
    expectIdentityLockBeforeProfileWrite(sql);
  });
});
