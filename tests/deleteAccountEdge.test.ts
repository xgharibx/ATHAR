import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

type DeleteOptions = {
  authDeleteError?: string;
};

function createDeleteAccountEdge(options: DeleteOptions = {}) {
  let handler: (request: Request) => Promise<Response> | Response;
  const calls: string[] = [];
  const mockCreateClient = vi.fn(() => ({
    auth: {
      getUser: async (token: string) => {
        calls.push(`getUser:${token}`);
        return { data: { user: { id: "synthetic-user" } }, error: null };
      },
      admin: {
        deleteUser: async (userId: string) => {
          calls.push(`deleteUser:${userId}`);
          return { error: options.authDeleteError ? new Error(options.authDeleteError) : null };
        },
      },
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

  const request = (method: string, authorization?: string) => handler(new Request("https://synthetic.supabase.co/functions/v1/delete-account", {
    method,
    headers: authorization ? { Authorization: authorization } : undefined,
  }));

  return { request, calls, mockCreateClient };
}

describe("delete-account Edge Function safeguards", () => {
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

  it("does not partially remove synced rows when auth deletion fails", async () => {
    const edge = createDeleteAccountEdge({ authDeleteError: "auth deletion failed" });

    const response = await edge.request("POST", "Bearer synthetic-user-token");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "auth deletion failed" });
    expect(edge.calls).toEqual([
      "getUser:synthetic-user-token",
      "deleteUser:synthetic-user",
    ]);
  });

  it("deletes only the authenticated user's rows and auth record", async () => {
    const edge = createDeleteAccountEdge();

    const response = await edge.request("POST", "Bearer synthetic-user-token");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(edge.calls).toEqual([
      "getUser:synthetic-user-token",
      "deleteUser:synthetic-user",
    ]);
  });
});
