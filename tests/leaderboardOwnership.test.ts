import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { computeScores, hasMetrics, FARD_PRAYERS_PER_DAY } from "../supabase/functions/leaderboard/scoring";

/** Execute the deployed handler source with only external database I/O replaced. */
function server(
  claim: { data: boolean | null; error: { message: string } | null },
  options: { failFirstRollupUpsert?: boolean } = {},
) {
  let handler: (req: Request) => Promise<Response>;
  const mutations: string[] = [];
  const writes: Array<{ table: string; operation: string; value: unknown }> = [];
  const storedEvents: Array<Record<string, unknown>> = [];
  let rollupUpserts = 0;
  const db = {
    rpc: async (name: string) => {
      if (name === "leaderboard_claim_identity") return claim;
      mutations.push(name);
      return { data: null, error: null };
    },
    from(table: string) {
      let operation = "select";
      let selectedColumn = "";
      let selectOptions: Record<string, unknown> = {};
      let single = false;
      let filters: Record<string, unknown> = {};
      let operationError: { message: string } | null = null;
      const query = {
        select(column = "", selectOptionsArg: Record<string, unknown> = {}) {
          selectedColumn = column;
          selectOptions = selectOptionsArg;
          return this;
        },
        eq(column: string, value: unknown) { filters[column] = value; return this; },
        is(column: string, value: unknown) { filters[column] = value; return this; },
        in(column: string, value: unknown[]) { filters[column] = value; return this; },
        order() { return this; },
        limit() { return this; },
        maybeSingle() { single = true; return this; },
        insert(value: unknown) {
          operation = "insert";
          writes.push({ table, operation, value });
          if (table === "leaderboard_score_events") {
            const rows = Array.isArray(value) ? value : [value];
            storedEvents.push(...rows as Array<Record<string, unknown>>);
          }
          return this;
        },
        upsert(value: unknown) {
          operation = "upsert";
          writes.push({ table, operation, value });
          if (table === "leaderboard_rollups") {
            rollupUpserts += 1;
            if (options.failFirstRollupUpsert && rollupUpserts === 1) {
              operationError = { message: "synthetic rollup failure" };
            }
          }
          return this;
        },
        delete() { operation = "delete"; return this; },
        then(resolve: (value: unknown) => unknown) {
          if (operation !== "select") mutations.push(`${table}:${operation}`);
          let data: unknown = null;
          let count = 0;
          if (operation === "select" && table === "leaderboard_score_events") {
            const rows = storedEvents.filter((row) => Object.entries(filters).every(([key, value]) => {
              const actual = row[key];
              return Array.isArray(value) ? value.includes(actual) : actual === value;
            }));
            count = rows.length;
            if (selectOptions.count === "exact") {
              data = null;
            } else if (selectedColumn === "payload") {
              data = single ? rows.at(-1) ?? null : rows;
            } else {
              data = single ? rows[0] ?? null : rows;
            }
          }
          return Promise.resolve({ data, error: operationError, count }).then(resolve);
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
    ...ownership.exports, Request, Response, Headers, URL, TextDecoder,
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, env: { get: () => "synthetic-only" } },
  });
  const validSubmission = (fingerprint = "a".repeat(64)) => ({
      v: 1, identity: { id: "synthetic-public-id", fingerprint, alias: "synthetic" },
      day: new Date().toISOString().slice(0, 10), generatedAt: new Date().toISOString(), checksum: "c".repeat(64),
      scores: { global: 100, dhikr: 100, quran: 0, prayers: 0, tasbeehDaily: 0, sections: {} },
  });
  const sendRequest = (request: Request) => handler(request);
  const submitRaw = (body: string) => sendRequest(new Request("https://synthetic.invalid/leaderboard", {
    method: "POST", headers: { "content-type": "application/json" }, body,
  }));
  const submit = async (fingerprint = "a".repeat(64), overrides: Record<string, unknown> = {}) =>
    submitRaw(JSON.stringify({ ...validSubmission(fingerprint), ...overrides }));
  return { validSubmission, submit, submitRaw, sendRequest, mutations, writes, rollupUpserts: () => rollupUpserts };
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

  it("rejects oversized streamed submissions before any database mutation", async () => {
    const edge = server({ data: true, error: null });
    const body = JSON.stringify({ ...edge.validSubmission(), padding: "x".repeat(80 * 1024) });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    });
    const request = new Request("https://synthetic.invalid/leaderboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await edge.sendRequest(request);

    expect(response.status).toBe(413);
    expect(edge.mutations).toEqual([]);
  });

  it("rejects null JSON as an invalid request object", async () => {
    const edge = server({ data: true, error: null });
    const response = await edge.submitRaw("null");

    expect(response.status).toBe(400);
    expect(edge.mutations).toEqual([]);
  });

  it("persists only allowlisted submission fields", async () => {
    const edge = server({ data: true, error: null });
    const base = edge.validSubmission();
    const response = await edge.submit("a".repeat(64), {
      extra: { private: "should not be persisted" },
      identity: {
        id: "synthetic-public-id",
        fingerprint: "a".repeat(64),
        alias: "synthetic",
        unexpected: "should not be persisted",
      },
      scores: {
        ...base.scores,
        unexpected: "should not be persisted",
        sections: { morning: 3, ["x".repeat(81)]: 9 },
      },
      metrics: {
        dhikr: 3,
        quranAyahs: 1,
        prayersLogged: 1,
        tasksDone: 0,
        tasbeehTaps: 4,
        sections: { morning: 3 },
        unexpected: "should not be persisted",
      },
    });

    expect(response.status).toBe(200);
    const inserted = edge.writes.find((write) => write.table === "leaderboard_score_events")?.value as
      Array<{ payload: Record<string, unknown> }> | undefined;
    expect(inserted?.[0]?.payload).not.toHaveProperty("extra");
    expect(inserted?.[0]?.payload.identity).not.toHaveProperty("unexpected");
    expect(inserted?.[0]?.payload.scores).not.toHaveProperty("unexpected");
    expect(inserted?.[0]?.payload.scores.sections).not.toHaveProperty("x".repeat(81));
    expect(inserted?.[0]?.payload.metrics).not.toHaveProperty("unexpected");
  });

  it("repairs a rollup after the event was saved but its first upsert failed", async () => {
    const edge = server({ data: true, error: null }, { failFirstRollupUpsert: true });

    expect((await edge.submit()).status).toBe(500);
    expect(edge.rollupUpserts()).toBe(1);

    const retry = await edge.submit();

    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ deduped: true });
    expect(edge.rollupUpserts()).toBe(2);
    expect(edge.writes.filter((write) => write.table === "leaderboard_score_events" && write.operation === "insert")).toHaveLength(1);
  });
});
