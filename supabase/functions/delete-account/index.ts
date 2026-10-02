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
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { ...CORS, Allow: "POST, OPTIONS" },
    });
  }

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

    // Both athar_sync and athar_profiles reference auth.users with ON DELETE
    // CASCADE. Delete the auth row once so its dependent rows are removed in
    // the same database transaction; separate REST deletes can otherwise
    // erase data and then fail while leaving the account active.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unexpected error" }, 500);
  }
});
