import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type ValidPayload = (payload: Record<string, unknown>) => { ok: boolean; reason?: string };

function loadPayloadValidator(): ValidPayload {
  const source = fs.readFileSync(path.resolve("supabase/functions/leaderboard/index.ts"), "utf8")
    .replace(/^import .*;\r?\n/gm, "");
  const js = ts.transpileModule(`${source}\nglobalThis.__validatePayload = validatePayload;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const context = vm.createContext({
    Deno: { serve: () => undefined, env: { get: () => "" } },
  });
  vm.runInContext(js, context);
  return (context as typeof context & { __validatePayload: ValidPayload }).__validatePayload;
}

function payload(generatedAt: string) {
  return {
    v: 1,
    generatedAt,
    day: new Date().toISOString().slice(0, 10),
    identity: { id: "anon_synthetic_validation", fingerprint: "a".repeat(64) },
    checksum: "b".repeat(64),
  };
}

describe("leaderboard Edge payload time validation", () => {
  it("accepts an older queued snapshot while its leaderboard day is still eligible", () => {
    const validatePayload = loadPayloadValidator();

    expect(validatePayload(payload(new Date(Date.now() - 37 * 60 * 60 * 1000).toISOString()))).toEqual({ ok: true });
  });

  it("rejects timestamps too far in the past even when the payload day is current", () => {
    const validatePayload = loadPayloadValidator();

    expect(validatePayload(payload(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()))).toEqual({
      ok: false,
      reason: "generatedAt-skew",
    });
  });

  it("continues to reject timestamps more than 36 hours in the future", () => {
    const validatePayload = loadPayloadValidator();

    expect(validatePayload(payload(new Date(Date.now() + 37 * 60 * 60 * 1000).toISOString()))).toEqual({
      ok: false,
      reason: "generatedAt-skew",
    });
  });
});
