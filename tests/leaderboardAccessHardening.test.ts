import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readTrustedClientIp } from "../supabase/functions/leaderboard/clientIp";

describe("leaderboard trusts only the edge-provided client IP", () => {
  it("ignores caller-controlled forwarding headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.7, 198.51.100.8",
      "x-real-ip": "192.0.2.4",
    });

    expect(readTrustedClientIp(headers)).toBe("203.0.113.9");
  });

  it("uses one bounded fallback key when the trusted edge header is absent or oversized", () => {
    expect(readTrustedClientIp(new Headers({ "x-forwarded-for": "198.51.100.7" }))).toBe("unknown");
    expect(readTrustedClientIp(new Headers({ "cf-connecting-ip": "x".repeat(65) }))).toBe("unknown");
  });
});

describe("leaderboard SQL access stays behind the filtered Edge Function", () => {
  const backend = path.resolve("tools/backend");
  const read = (name: string) => fs.readFileSync(path.join(backend, name), "utf8");

  it("does not grant public reads to raw rollups or the unfiltered V3 view", () => {
    const schema = read("leaderboard_supabase_schema.sql");
    const profiles = read("leaderboard_v3_profiles.sql");

    expect(schema).not.toMatch(/create\s+policy\s+["']lb_rollups_read["'][\s\S]*?using\s*\(\s*true\s*\)/i);
    expect(schema).toMatch(/revoke\s+all\s+privileges\s+on\s+table\s+public\.leaderboard_rollups\s+from\s+public,\s*anon,\s*authenticated/i);
    expect(schema).toMatch(/revoke\s+all\s+privileges\s+on\s+table\s+public\.leaderboard_top\s+from\s+public,\s*anon,\s*authenticated/i);
    expect(profiles).not.toMatch(/grant\s+select\s+on\s+public\.leaderboard_ranked_v3\s+to\s+anon,\s*authenticated/i);
    expect(profiles).toMatch(/revoke\s+all\s+privileges\s+on\s+table\s+public\.leaderboard_ranked_v3\s+from\s+public,\s*anon,\s*authenticated/i);
  });

  it("provides an idempotent lockdown script for already-installed manual SQL", () => {
    const lockdown = read("leaderboard_public_reads_lockdown.sql");

    expect(lockdown).toMatch(/revoke\s+all\s+privileges\s+on\s+table\s+public\.%I\s+from\s+public,\s*anon,\s*authenticated/i);
    expect(lockdown).toMatch(/leaderboard_ranked_v3/i);
    expect(lockdown).toMatch(/drop\s+policy\s+%I\s+on\s+public\.leaderboard_rollups/i);
    expect(lockdown).toMatch(/alter\s+default\s+privileges\s+for\s+role\s+postgres[\s\S]*revoke\s+all\s+on\s+tables[\s\S]*revoke\s+all\s+on\s+sequences[\s\S]*revoke\s+all\s+on\s+functions/i);
    expect(lockdown).toMatch(/alter\s+view\s+public\.%I\s+set\s+\(security_invoker\s*=\s*true\)/i);
    expect(lockdown).toMatch(/has_table_privilege/);
  });
});
