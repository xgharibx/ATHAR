import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "https://www.athark.org",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const encoder = new TextEncoder();

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function fingerprint(request: Request, secret: string) {
  // The gateway-provided connecting IP is used for anti-abuse only. Never store it.
  // If the trusted gateway header is absent, apply one global quota (fail closed).
  const ip = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const date = new Date().toISOString().slice(0, 10);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC", hash: "SHA-256",
  }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(date + ":" + ip));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" });
  const origin = request.headers.get("origin");
  if (origin && origin !== "https://www.athark.org" && origin !== "https://athark.org") {
    return reply(403, { error: "ORIGIN_NOT_ALLOWED" });
  }
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 16000) return reply(413, { error: "TOO_LARGE" });
  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return reply(413, { error: "TOO_LARGE" });
    payload = JSON.parse(raw);
    if (!payload || Array.isArray(payload) || typeof payload !== "object") throw Error("bad payload");
  } catch {
    return reply(400, { error: "INVALID_REQUEST" });
  }
  // Honeypot silently accepts bots without writing messages.
  if (typeof payload.website === "string" && payload.website.length > 0) return reply(200, { ok: true });
  const category = payload.category;
  const message = payload.message;
  const senderName = payload.sender_name;
  const contact = payload.contact;
  if (!["problem", "feature", "suggestion", "content", "other"].includes(String(category)) ||
      typeof message !== "string" || message.trim().length < 10 || message.trim().length > 3000 ||
      (senderName != null && (typeof senderName !== "string" || senderName.length > 80)) ||
      (contact != null && (typeof contact !== "string" || contact.length > 160))) {
    return reply(400, { error: "INVALID_FIELDS" });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return reply(503, { error: "NOT_CONFIGURED" });
  try {
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await db.rpc("athar_submit_feedback", {
      p_category: category,
      p_message: message,
      p_sender_name: senderName || null,
      p_contact: contact || null,
      p_fingerprint: await fingerprint(request, secret),
    });
    if (error) {
      if (error.message?.includes("FEEDBACK_RATE_LIMIT")) return reply(429, { error: "RATE_LIMIT" });
      console.error("feedback storage failed", error.code);
      return reply(503, { error: "STORAGE_UNAVAILABLE" });
    }
    return reply(201, { ok: true });
  } catch {
    return reply(503, { error: "STORAGE_UNAVAILABLE" });
  }
});
