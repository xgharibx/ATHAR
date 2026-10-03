import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readFunctionAuthConfig(slug: string): boolean {
  let config = "";
  try {
    config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  } catch {
    return true;
  }

  const section = new RegExp(`\\[functions\\.${slug}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`).exec(config);
  const setting = section?.[1].match(/^\s*verify_jwt\s*=\s*(true|false)\s*$/m)?.[1];
  return setting === "false" ? false : true;
}

describe("Supabase Edge Function gateway authentication", () => {
  it("keeps intentionally public or self-authenticating functions out of gateway JWT verification", () => {
    expect(readFunctionAuthConfig("companion")).toBe(false);
    expect(readFunctionAuthConfig("dorar")).toBe(false);
    expect(readFunctionAuthConfig("leaderboard")).toBe(false);
  });

  it("keeps sensitive functions on the secure JWT-verification default", () => {
    expect(readFunctionAuthConfig("delete-account")).toBe(true);
    expect(readFunctionAuthConfig("quran-translations")).toBe(true);
  });
});
