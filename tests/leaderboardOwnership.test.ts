import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { computeScores, hasMetrics, FARD_PRAYERS_PER_DAY } from "../supabase/functions/leaderboard/scoring";

/** Execute the deployed handler source with only external database I/O replaced. */
function server(claim: { data: boolean | null; error: { message: string } | null }) {
  let handler: (req: Request) => Promise<Response>;
  const mutations: string[] = [];
  const db = {
    rpc: async (name: string) => {
      if (name === "leaderboard_claim_identity") return claim;
      mutations.push(name);
      return { data: null, error: null };
    },
    from(table: string) {
      let operation = "select";
      const query = {
        select() { return this; }, eq() { return this; }, is() { return this; }, in() { return this; },
        order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
        insert() { operation = "insert"; return this; }, upsert() { operation = "upsert"; return this; },
        delete() { operation = "delete"; return this; },
        then(resolve: (value: unknown) => unknown) {
          if (operation !== "select") mutations.push(`${table}:${operation}`);
          return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve);
        },
      };
      return query;
    },
  };
  const edgeDir = path.resolve("supabase/functions/leaderboard");
  const ownershipPath = path.join(edgeDir, "ownership.ts");
  const ownership: { exports: Record<string, unknown> } = { exports: {} };
  if (fs.existsSync(ownershipPath)) {
    const js = ts.transpileModule(fs.readFileSync(ownershipPath, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(js, { exports: ownership.exports });
  }
  const source = fs.readFileSync(path.join(edgeDir, "index.ts"), "utf8").replace(/^import .*;\r?\n/gm, "");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, {
    console, createClient: () => db, computeScores, hasMetrics, FARD_PRAYERS_PER_DAY,
    ...ownership.exports, Request, Response, Headers, URL,
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, env: { get: () => "synthetic-only" } },
  });
  const submit = async (fingerprint = "a".repeat(64)) => handler(new Request("https://synthetic.invalid/leaderboard", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      v: 1, identity: { id: "synthetic-public-id", fingerprint, alias: "synthetic" },
      day: new Date().toISOString().slice(0, 10), generatedAt: new Date().toISOString(), checksum: "c".repeat(64),
      scores: { global: 100, dhikr: 100, quran: 0, prayers: 0, tasbeehDaily: 0, sections: {} },
    }),
  }));
  return { submit, mutations };
}

describe("leaderboard identity ownership", () => {
  it("rejects another identity's credential before any profile, alias or score write", async () => {
    const edge = server({ data: false, error: null });
    expect((await edge.submit()).status).toBe(403);
    expect(edge.mutations).toEqual([]);
  });

  it("fails closed when the ownership RPC is missing or unavailable", async () => {
    const edge = server({ data: null, error: { message: "function missing" } });
    expect((await edge.submit()).status).toBe(503);
    expect(edge.mutations).toEqual([]);
  });

  it("lets the identity owner continue recording scores", async () => {
    const edge = server({ data: true, error: null });
    expect((await edge.submit()).status).toBe(200);
    expect(edge.mutations).toContain("leaderboard_rollups:upsert");
  });

  it("rejects malformed ownership credentials before any database mutation", async () => {
    const edge = server({ data: true, error: null });
    expect((await edge.submit("not-a-sha256-fingerprint")).status).toBe(400);
    expect(edge.mutations).toEqual([]);
  });
});
