import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { challengeOfWeek, challengeStatus, weekDays, weekStartOf } from "@/lib/weeklyChallenge";
import { readFriendCode } from "@/lib/friendCode";

/* ─── The leaderboard server, reading scores ──────────────────────────── */

type Row = { day: string; board: string; section_id: string | null; user_id: string; alias: string; score: number; period: string };

function server(rows: Row[], hidden: string[] = []) {
  let handler: (request: Request) => Promise<Response>;
  const queries: Array<Record<string, unknown>> = [];
  const query = (table: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];
    const record: Record<string, unknown> = { table };
    const api = {
      select: () => api,
      gte: (k: string, v: string) => { filters.push((r) => String(r[k]) >= v); return api; },
      lte: (k: string, v: string) => { filters.push((r) => String(r[k]) <= v); return api; },
      eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return api; },
      is: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return api; },
      in: (k: string, v: unknown[]) => { record.in = v; filters.push((r) => v.includes(r[k])); return api; },
      order: () => api,
      limit: () => api,
      then: (resolve: (value: unknown) => void) => {
        queries.push(record);
        const source: Array<Record<string, unknown>> = table === "leaderboard_rollups" ? rows
          : table === "leaderboard_user_moderation" ? hidden.map((user_id) => ({ user_id, hidden: true }))
          : [];
        resolve({ data: source.filter((row) => filters.every((f) => f(row))), error: null });
      },
    };
    return api;
  };
  const strip = (name: string) => ts.transpileModule(
    fs.readFileSync(path.resolve(`supabase/functions/leaderboard/${name}.ts`), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
  ).outputText;
  const context = vm.createContext({
    console, Request, Response, Headers, URL, TextDecoder, TextEncoder, crypto,
    createClient: () => ({ from: query, rpc: async () => ({ data: null, error: null }) }),
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, env: { get: (k: string) => ({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" } as Record<string, string>)[k] } },
  });
  for (const name of ["scoring", "ownership", "clientIp", "index"]) vm.runInContext(strip(name), context);
  return { get: (qs: string) => handler(new Request(`https://x.invalid/leaderboard?${qs}`)), queries };
}

const row = (user_id: string, score: number, day = "2026-11-19"): Row => ({ day, board: "global", section_id: null, user_id, alias: "", score, period: "daily" });

describe("friends' scores from the leaderboard", () => {
  const rows = [
    ...Array.from({ length: 40 }, (_, i) => row(`anon_top${String(i).padStart(4, "0")}`, 1000 - i)),
    row("anon_friend0001", 3), row("anon_friend0002", 7),
  ];

  it("returns the scores of the people asked for, however low their rank", async () => {
    const app = server(rows);
    const body = await (await app.get("board=global&period=weekly&day=2026-11-19&ids=anon_friend0001,anon_friend0002")).json() as { rows: Array<{ id: string; score: number }> };
    expect(body.rows.map((r) => [r.id, r.score])).toEqual([["anon_friend0002", 7], ["anon_friend0001", 3]]);
  });

  it("keeps the ordinary board to the top thirty", async () => {
    const body = await (await server(rows).get("board=global&period=weekly&day=2026-11-19")).json() as { rows: unknown[] };
    expect(body.rows).toHaveLength(30);
  });

  it("ignores malformed ids, caps the list at fifty, and still hides moderated people", async () => {
    const app = server(rows, ["anon_friend0002"]);
    const many = Array.from({ length: 80 }, (_, i) => `anon_x${i}xxxxx`).join(",");
    const body = await (await app.get(`board=global&period=weekly&day=2026-11-19&ids=anon_friend0002,bad id!,${many}`)).json() as { rows: unknown[] };
    expect(body.rows).toEqual([]);
    const asked = app.queries.find((q) => q.table === "leaderboard_rollups")!.in as string[];
    expect(asked.length).toBe(50);
    expect(asked).not.toContain("bad id!");
  });
});

describe("friend codes", () => {
  it("reads the new short code, a shared message, and codes from earlier versions", () => {
    expect(readFriendCode("anon_0123456789abcdef0123456789abcdef")).toEqual({ id: "anon_0123456789abcdef0123456789abcdef" });
    expect(readFriendCode("أضفني صديقًا في «أثر»\nالكود:\nanon_0123456789abcdef0123456789abcdef")).toEqual({ id: "anon_0123456789abcdef0123456789abcdef" });
    const old = Buffer.from(JSON.stringify({ id: "anon_feedbeef", alias: "أبو عمر", score: 120 })).toString("base64");
    expect(readFriendCode(old)).toEqual({ id: "anon_feedbeef", alias: "أبو عمر" });
    expect(readFriendCode("not a code")).toBeNull();
  });
});

/* ─── The weekly challenge ────────────────────────────────────────────── */

const none = { sectionCompletions: {}, quranDailyAyahs: {}, quranDailyGoal: 10, kahfReadOn: [] as string[] };

describe("weekly challenge", () => {
  it("runs Saturday to Friday by the phone's own date", () => {
    // Thursday 19 November 2026 belongs to the week of Saturday the 14th.
    expect(weekStartOf("2026-11-19")).toBe("2026-11-14");
    expect(weekStartOf("2026-11-14")).toBe("2026-11-14");
    expect(weekStartOf("2026-11-20")).toBe("2026-11-14");
    expect(weekStartOf("2026-11-21")).toBe("2026-11-21");
    expect(weekDays("2026-11-14")).toEqual(["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]);
  });

  it("takes four challenges in turn, one a week", () => {
    const kinds = new Set(Array.from({ length: 4 }, (_, i) => challengeOfWeek(["2026-11-14", "2026-11-21", "2026-11-28", "2026-12-05"][i]!)));
    expect(kinds.size).toBe(4);
  });

  it("counts the days the app saw done, and past days marked by hand, never future ones", () => {
    const today = "2026-11-19";
    const week = "2026-11-14";
    const kind = challengeOfWeek(week);
    const evidence = {
      ...none,
      sectionCompletions: { morning: ["2026-11-14", "2026-11-15"], evening: ["2026-11-14", "2026-11-15"] },
      quranDailyAyahs: { "2026-11-14": 12, "2026-11-15": 10 },
      kahfReadOn: ["2026-11-15"],
    };
    const status = challengeStatus(today, { "2026-11-16": true, "2026-11-20": true }, evidence);
    expect(status.kind).toBe(kind);
    const auto = status.days.filter((d) => d.auto).map((d) => d.key);
    expect(auto).toEqual(kind === "al_kahf" ? ["2026-11-15"] : ["2026-11-14", "2026-11-15"]);
    expect(status.days.find((d) => d.key === "2026-11-16")!.manual).toBe(true);
    expect(status.days.find((d) => d.key === "2026-11-20")!.isFuture).toBe(true);
  });

  it("is complete at five days, or once for al-Kahf", () => {
    const fiveMornings = { ...none, sectionCompletions: { morning: ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"], evening: ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"] }, quranDailyAyahs: Object.fromEntries(["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"].map((d) => [d, 10])), kahfReadOn: ["2026-11-18"] };
    expect(challengeStatus("2026-11-19", {}, fiveMornings).completed).toBe(true);
    expect(challengeStatus("2026-11-19", {}, none).completed).toBe(false);
  });
});
