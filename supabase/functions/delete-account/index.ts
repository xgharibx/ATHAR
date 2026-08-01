/**
 * Permanently delete the calling user's account and all their synced rows.
 *
 * Google Play requires an in-app account-deletion path for any app that offers
 * account creation, so this is a store-compliance requirement, not polish.
 *
 * It lives server-side because deleting an auth user needs the SERVICE ROLE
 * key, which must never be shipped in a client bundle. The function verifies
 * the caller's JWT first and only ever deletes *that* user — it never accepts a
 * user id from the request body, which would let anyone delete anyone.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "missing bearer token" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "function not configured" }, 500);

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Identity comes from the verified token only — never from the request.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "invalid session" }, 401);

    // Synced rows are ON DELETE CASCADE from auth.users, but delete them
    // explicitly first so a failure surfaces as an error instead of leaving
    // the user deleted and their data orphaned.
    const { error: dataErr } = await admin.from("athar_sync").delete().eq("user_id", user.id);
    if (dataErr) return json({ error: dataErr.message }, 500);
    await admin.from("athar_profiles").delete().eq("user_id", user.id);

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unexpected error" }, 500);
  }
});
