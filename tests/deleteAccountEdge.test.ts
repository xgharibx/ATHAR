import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

type DeleteOptions = {
  authDeleteError?: string;
  prepareError?: string;
  authError?: string;
};

function createDeleteAccountEdge(options: DeleteOptions = {}) {
  let handler: (request: Request) => Promise<Response> | Response;
  const calls: string[] = [];
  const mockCreateClient = vi.fn(() => ({
    auth: {
      getUser: async (token: string) => {
        calls.push(`getUser:${token}`);
        return options.authError
          ? { data: { user: null }, error: new Error(options.authError) }
          : { data: { user: { id: "synthetic-user" } }, error: null };
      },
      admin: {
        deleteUser: async (userId: string) => {
          calls.push(`deleteUser:${userId}`);
          return { error: options.authDeleteError ? new Error(options.authDeleteError) : null };
        },
      },
    },
      rpc: async (name: string, params: Record<string, unknown>) => {
        const identity = params.p_local_identity as { id?: string } | null;
        calls.push(`rpc:${name}:${String(params.p_auth_user_id)}:${identity?.id ?? "none"}`);
        return {
          data: { ok: true },
          error: options.prepareError ? new Error(options.prepareError) : null,
        };
      },
  }));
  const source = fs.readFileSync(path.resolve("supabase/functions/delete-account/index.ts"), "utf8")
    .replace(
      'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";',
      "const { createClient } = mocks;",
    );
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;

  vm.runInNewContext(js, {
    console,
    Request,
    Response,
    Headers,
    mocks: { createClient: mockCreateClient },
    Deno: {
      serve: (callback: typeof handler) => { handler = callback; },
      env: { get: (name: string) => ({
        SUPABASE_URL: "https://synthetic.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
      } as Record<string, string | undefined>)[name] },
    },
  });

  const request = (method: string, authorization?: string, body?: unknown) => handler(new Request("https://synthetic.supabase.co/functions/v1/delete-account", {
    method,
    headers: authorization ? { Authorization: authorization, ...(body ? { "Content-Type": "application/json" } : {}) } : undefined,
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));

  return { request, calls, mockCreateClient };
}

describe("delete-account Edge Function safeguards", () => {
  it("purges only the verified synced leaderboard identity in the Auth delete transaction", () => {
    const migration = fs.readFileSync(
      path.resolve("supabase/migrations/20261004100429_leaderboard_delete_account_data.sql"),
      "utf8",
    );
    const handoffMigration = fs.readFileSync(
      path.resolve("supabase/migrations/20261109031940_account_delete_leaderboard_handoff.sql"),
      "utf8",
    );

    expect(migration).toMatch(/create\s+or\s+replace\s+function\s+private\.purge_leaderboard_for_auth_user_delete/i);
    expect(migration).toMatch(/before\s+delete\s+on\s+auth\.users/i);
    expect(migration).toMatch(/leaderboardIdentity/i);
    expect(migration).toMatch(/extensions\.digest/i);
    expect(migration).toMatch(/leaderboard_score_events/i);
    expect(migration).toMatch(/leaderboard_rollups/i);
    expect(migration).toMatch(/leaderboard_alias_audit/i);
    expect(migration).toMatch(/fingerprint.*immutable|immutable.*fingerprint/is);
    expect(handoffMigration).toMatch(/create\s+table\s+if\s+not\s+exists\s+private\.auth_leaderboard_identity_links/i);
    expect(handoffMigration).toMatch(/prepare_account_leaderboard_deletion/i);
    expect(handoffMigration).toMatch(/athar_00_linked_leaderboard_purge_before_auth_delete/i);
    expect(handoffMigration).toMatch(/anon_fallback[\s\S]*fallback_secret/i);
    expect(handoffMigration).toMatch(/other_link\.auth_user_id\s*<>\s*p_auth_user_id/i);
    expect(handoffMigration).toMatch(/pg_advisory_xact_lock[\s\S]*hashtextextended/i);
    expect(handoffMigration).toMatch(/after\s+insert\s+or\s+update\s+of\s+payload/i);
  });

  it("keeps the dependent account rows tied to auth deletion by cascade", () => {
    const migration = fs.readFileSync(
      path.resolve("supabase/migrations/20260725000001_accounts_sync.sql"),
      "utf8",
    );

    expect(migration).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.athar_sync[\s\S]*?references\s+auth\.users\s*\(id\)\s+on\s+delete\s+cascade/i);
    expect(migration).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.athar_profiles[\s\S]*?references\s+auth\.users\s*\(id\)\s+on\s+delete\s+cascade/i);
  });

  it("rejects non-POST requests before reading auth or deleting rows", async () => {
    const edge = createDeleteAccountEdge();

    const response = await edge.request("GET", "Bearer synthetic-user-token");

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
    expect(edge.calls).toEqual([]);
    expect(edge.mockCreateClient).not.toHaveBeenCalled();
  });

  it("does not prepare or delete an account when the bearer token is invalid", async () => {
    const edge = createDeleteAccountEdge({ authError: "invalid JWT" });

    const response = await edge.request("POST", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid session" });
    expect(edge.calls).toEqual(["getUser:invalid-token"]);
  });

  it("does not delete the Auth user when server-side ownership preparation fails", async () => {
    const edge = createDeleteAccountEdge({ prepareError: "identity could not be verified" });

    const response = await edge.request("POST", "Bearer synthetic-user-token", {
      leaderboardIdentity: { id: "local_123", secret: "local-secret" },
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "identity could not be verified" });
    expect(edge.calls).toEqual([
      "getUser:synthetic-user-token",
      "rpc:prepare_account_leaderboard_deletion:synthetic-user:local_123",
    ]);
  });

  it("does not purge linked rows before auth deletion succeeds", async () => {
    const edge = createDeleteAccountEdge({ authDeleteError: "auth deletion failed" });

    const response = await edge.request("POST", "Bearer synthetic-user-token");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "auth deletion failed" });
    expect(edge.calls).toEqual([
      "getUser:synthetic-user-token",
      "rpc:prepare_account_leaderboard_deletion:synthetic-user:none",
      "deleteUser:synthetic-user",
    ]);
  });

  it("links an existing verified local identity and deletes only the authenticated user", async () => {
    const edge = createDeleteAccountEdge();

    const response = await edge.request("POST", "Bearer synthetic-user-token", {
      leaderboardIdentity: { id: "anon_local_123", secret: "synthetic-secret" },
      userId: "attacker-chosen-user",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(edge.calls).toEqual([
      "getUser:synthetic-user-token",
      "rpc:prepare_account_leaderboard_deletion:synthetic-user:anon_local_123",
      "deleteUser:synthetic-user",
    ]);
  });
});
