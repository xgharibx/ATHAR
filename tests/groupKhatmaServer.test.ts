import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { cleanName, normalizeCode, parseAction } from "../supabase/functions/khatma/logic";

/* An in-memory stand-in for the three tables, enough for the queries the function makes. */
type Row = Record<string, unknown>;
function fakeDb() {
  const tables: Record<string, Row[]> = { athar_group_khatmas: [], athar_group_khatma_members: [], athar_group_khatma_parts: [] };
  let seq = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
  const from = (table: string) => {
    const rows = tables[table]!;
    const filters: Array<(r: Row) => boolean> = [];
    let op: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    let single: "single" | "maybe" | null = null;
    const run = () => {
      if (op === "insert") {
        const list = (Array.isArray(payload) ? payload : [payload!]).map((r) => ({ id: uuid(), round: 1, created_at: new Date().toISOString(), completed_at: null, member_id: null, guest_name: null, done_at: null, ...r }));
        if (table === "athar_group_khatmas" && list.some((r) => rows.some((x) => x.code === r.code))) return { data: null, error: { code: "23505" } };
        rows.push(...list);
        return { data: single ? list[0] : list, error: null };
      }
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") hit.forEach((r) => Object.assign(r, payload));
      if (op === "delete") {
        for (const r of hit) rows.splice(rows.indexOf(r), 1);
        if (table === "athar_group_khatmas") for (const r of hit) {
          for (const t of ["athar_group_khatma_members", "athar_group_khatma_parts"]) tables[t] = tables[t]!.filter((x) => x.khatma_id !== r.id);
        }
      }
      // Copies, as a real database returns.
      const out = hit.map((r) => ({ ...r }));
      return { data: single ? (out[0] ?? null) : out, error: null };
    };
    const api: Record<string, unknown> = {
      select: () => api,
      insert: (r: Row | Row[]) => { op = "insert"; payload = r; return api; },
      update: (r: Row) => { op = "update"; payload = r; return api; },
      delete: () => { op = "delete"; return api; },
      eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return api; },
      is: (k: string, v: unknown) => { filters.push((r) => (r[k] ?? null) === v); return api; },
      order: () => api,
      single: () => { single = "single"; return api; },
      maybeSingle: () => { single = "maybe"; return api; },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    };
    return api;
  };
  return { tables, client: { from, rpc: () => Promise.resolve({ data: 0, error: null }) } };
}

function server() {
  const db = fakeDb();
  let handler!: (request: Request) => Promise<Response>;
  const strip = (file: string) => ts.transpileModule(
    fs.readFileSync(path.resolve(file), "utf8").replace(/^import [\s\S]*?;\r?\n/gm, "").replace(/^export /gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
  ).outputText;
  const context = vm.createContext({
    console: { ...console, error: () => {} }, Request, Response, Headers, URL, TextEncoder, crypto,
    createClient: () => db.client,
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, env: { get: () => "x" } },
  });
  vm.runInContext(strip("supabase/functions/leaderboard/clientIp.ts"), context);
  vm.runInContext(strip("supabase/functions/khatma/logic.ts"), context);
  vm.runInContext(strip("supabase/functions/khatma/index.ts"), context);
  const send = async (body: Record<string, unknown>, keys: { member?: string; owner?: string } = {}) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (keys.member) headers["x-khatma-member"] = keys.member;
    if (keys.owner) headers["x-khatma-owner"] = keys.owner;
    const res = await handler(new Request("https://x.invalid/khatma", { method: "POST", headers, body: JSON.stringify(body) }));
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  const get = async (code: string, member?: string) => {
    const res = await handler(new Request(`https://x.invalid/khatma?code=${code}`, { headers: member ? { "x-khatma-member": member } : {} }));
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  return { db, send, get };
}

describe("shared group khatma server", () => {
  it("creates a khatma with 30 free juz, the creator as owner and first member", async () => {
    const app = server();
    const { status, body } = await app.send({ action: "create", name: "ختمة العائلة", memberName: "عمرو" });
    expect(status).toBe(200);
    expect(body.khatma.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(body.khatma.parts).toHaveLength(30);
    expect(body.khatma.parts.every((p: any) => p.holder === null)).toBe(true);
    expect(body.khatma.you.isOwner).toBe(true);
    expect(body.memberToken).toMatch(/^[0-9a-f]{64}$/);
    // Only hashes are stored.
    expect(JSON.stringify(app.db.tables)).not.toContain(body.memberToken);
    expect(JSON.stringify(app.db.tables)).not.toContain(body.ownerToken);
  });

  it("lets friends join, take free juz, and tick only their own", async () => {
    const app = server();
    const owner = (await app.send({ action: "create", name: "ختمة", memberName: "عمرو" })).body;
    const code = owner.khatma.code;
    const friend = (await app.send({ action: "join", code: code.toLowerCase(), name: "فاطمة" })).body;
    expect(friend.khatma.members.map((m: any) => m.name)).toEqual(["عمرو", "فاطمة"]);

    expect((await app.send({ action: "claim", code, juz: 3 }, { member: friend.memberToken })).status).toBe(200);
    // Someone else cannot take a juz already taken…
    expect((await app.send({ action: "claim", code, juz: 3 }, { member: owner.memberToken })).body.error).toBe("taken");
    // …nor tick it (unless they own the khatma).
    const stranger = (await app.send({ action: "join", code, name: "زائر" })).body;
    expect((await app.send({ action: "done", code, juz: 3, done: true }, { member: stranger.memberToken })).body.error).toBe("not_yours");

    const done = await app.send({ action: "done", code, juz: 3, done: true }, { member: friend.memberToken });
    expect(done.body.khatma.parts[2]).toMatchObject({ juz: 3, holder: "فاطمة", done: true });
    // Everyone sees the same progress.
    const seen = await app.get(code, owner.memberToken);
    expect(seen.body.khatma.done).toBe(1);
    expect(seen.body.khatma.members.find((m: any) => m.name === "فاطمة")).toMatchObject({ juz: [3], done: 1 });
  });

  it("lets the owner give a juz to a name, tick it, and the khatma completes at 30", async () => {
    const app = server();
    const owner = (await app.send({ action: "create", name: "ختمة", memberName: "عمرو" })).body;
    const code = owner.khatma.code;
    const keys = { member: owner.memberToken, owner: owner.ownerToken };
    for (let juz = 1; juz <= 30; juz++) {
      await app.send({ action: "assign", code, juz, memberId: null, guestName: "جدتي" }, keys);
      await app.send({ action: "done", code, juz, done: true }, keys);
    }
    const view = (await app.get(code)).body.khatma;
    expect(view.done).toBe(30);
    expect(view.completedAt).not.toBeNull();
    expect(view.parts[0]).toMatchObject({ holder: "جدتي", guest: true, done: true });
    const next = (await app.send({ action: "newRound" }, keys)).body;
    expect(next.error).toBe("invalid_request"); // a round needs the code
    const round2 = (await app.send({ action: "newRound", code }, keys)).body.khatma;
    expect(round2).toMatchObject({ round: 2, done: 0, completedAt: null });
    expect(round2.parts[0].holder).toBe("جدتي");
  });

  it("keeps owner powers to the owner", async () => {
    const app = server();
    const owner = (await app.send({ action: "create", name: "ختمة", memberName: "عمرو" })).body;
    const friend = (await app.send({ action: "join", code: owner.khatma.code, name: "علي" })).body;
    const code = owner.khatma.code;
    expect((await app.send({ action: "assign", code, juz: 1, memberId: null, guestName: "س" }, { member: friend.memberToken })).body.error).toBe("not_owner");
    expect((await app.send({ action: "delete", code }, { member: friend.memberToken })).body.error).toBe("not_owner");
    expect((await app.send({ action: "delete", code }, { owner: owner.ownerToken })).body.deleted).toBe(true);
    expect((await app.get(code)).status).toBe(404);
  });

  it("a member who leaves gives their juz back", async () => {
    const app = server();
    const owner = (await app.send({ action: "create", name: "ختمة", memberName: "عمرو" })).body;
    const code = owner.khatma.code;
    const friend = (await app.send({ action: "join", code, name: "علي" })).body;
    await app.send({ action: "claim", code, juz: 7 }, { member: friend.memberToken });
    expect((await app.send({ action: "leave", code }, { member: friend.memberToken })).body.left).toBe(true);
    const view = (await app.get(code)).body.khatma;
    expect(view.parts[6].holder).toBeNull();
    expect(view.members.map((m: any) => m.name)).toEqual(["عمرو"]);
  });

  it("rejects malformed requests", async () => {
    const app = server();
    expect((await app.send({ action: "create", name: "", memberName: "x" })).status).toBe(400);
    expect((await app.send({ action: "claim", code: "ABCD2345", juz: 31 })).status).toBe(400);
    expect((await app.get("nope")).status).toBe(400);
    expect((await app.get("ABCD2345")).status).toBe(404);
  });
});

describe("khatma request checks", () => {
  it("cleans names and codes", () => {
    expect(cleanName("  عمرو​   غريب ")).toBe("عمرو غريب");
    expect(cleanName("<script>")).toBeNull();
    expect(normalizeCode("abcd-2345")).toBe("ABCD2345");
    expect(normalizeCode("ABCD0OI1")).toBeNull(); // no look-alike characters
  });
  it("accepts only known actions with valid fields", () => {
    expect(parseAction({ action: "done", code: "ABCD2345", juz: 5, done: true })).toEqual({ action: "done", code: "ABCD2345", juz: 5, done: true });
    expect(parseAction({ action: "assign", code: "ABCD2345", juz: 5, memberId: "00000000-0000-4000-8000-000000000001", guestName: "x" })).toBeNull();
    expect(parseAction({ action: "drop_table", code: "ABCD2345" })).toBeNull();
  });
});

describe("khatma codes", () => {
  it("uses every one of the 32 characters equally across all byte values", async () => {
    const { makeCode, CODE_ALPHABET } = await import("../supabase/functions/khatma/logic");
    const counts = new Map<string, number>();
    for (let b = 0; b < 256; b++) {
      const ch = makeCode(new Uint8Array(8).fill(b))[0]!;
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect(counts.size).toBe(CODE_ALPHABET.length);
    expect(new Set(counts.values())).toEqual(new Set([8]));
  });
});
