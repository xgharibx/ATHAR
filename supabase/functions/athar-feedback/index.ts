import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "https://www.athark.org",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const encoder = new TextEncoder();

function corsFor(request: Request) {
  const origin = request.headers.get("origin");
  return { ...cors, "Access-Control-Allow-Origin": origin === "https://athark.org" ? origin : "https://www.athark.org" };
}

function reply(status: number, body: Record<string, unknown>, request: Request) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsFor(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function fingerprint(request: Request, secret: string) {
  // The gateway-provided connecting IP is used for anti-abuse only. Never store it.
  // If the trusted gateway header is absent, apply one global quota (fail closed).
  const ip = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  const date = new Date().toISOString().slice(0, 10);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC", hash: "SHA-256",
  }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(date + ":" + ip));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsFor(request) });
  if (request.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" }, request);
  const origin = request.headers.get("origin");
  if (origin && origin !== "https://www.athark.org" && origin !== "https://athark.org") {
    return reply(403, { error: "ORIGIN_NOT_ALLOWED" }, request);
  }
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 16000) return reply(413, { error: "TOO_LARGE" }, request);
  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return reply(413, { error: "TOO_LARGE" }, request);
    payload = JSON.parse(raw);
    if (!payload || Array.isArray(payload) || typeof payload !== "object") throw Error("bad payload");
  } catch {
    return reply(400, { error: "INVALID_REQUEST" }, request);
  }
  // Honeypot silently accepts bots without writing messages.
  if (typeof payload.website === "string" && payload.website.length > 0) return reply(200, { ok: true }, request);
  const category = payload.category;
  const message = payload.message;
  const senderName = payload.sender_name;
  const contact = payload.contact;
  const shareConsent = payload.share_consent === true;
  if (!["problem", "feature", "suggestion", "content", "other"].includes(String(category)) ||
      typeof message !== "string" || message.trim().length < 10 || message.trim().length > 3000 ||
      (senderName != null && (typeof senderName !== "string" || senderName.length > 80)) ||
      (contact != null && (typeof contact !== "string" || contact.length > 160)) ||
      (payload.share_consent != null && typeof payload.share_consent !== "boolean")) {
    return reply(400, { error: "INVALID_FIELDS" }, request);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return reply(503, { error: "NOT_CONFIGURED" }, request);
  try {
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: feedbackId, error } = await db.rpc("athar_submit_feedback_v2", {
      p_category: category,
      p_message: message,
      p_sender_name: senderName || null,
      p_contact: contact || null,
      p_fingerprint: await fingerprint(request, secret),
      p_share_consent: shareConsent,
    });
    if (error) {
      if (error.message?.includes("FEEDBACK_RATE_LIMIT")) return reply(429, { error: "RATE_LIMIT" }, request);
      console.error("feedback storage failed", error.code);
      return reply(503, { error: "STORAGE_UNAVAILABLE" }, request);
    }
    // Never email the message text, name, or contact details: only a private inbox alert.
    // Resend credentials are project secrets, never part of public client code.
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const to = Deno.env.get("FEEDBACK_NOTIFY_TO");
    const from = Deno.env.get("FEEDBACK_NOTIFY_FROM");
    let emailStatus: "not_configured" | "queued" | "failed" = "not_configured";
    if (apiKey && to && from) {
      try {
        const labels: Record<string, string> = {
          problem: "مشكلة", feature: "طلب ميزة", suggestion: "اقتراح",
          content: "ملاحظة على المحتوى", other: "رسالة أخرى",
        };
        const outgoing = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            from,
            to: [to],
            subject: `[أثر] رسالة جديدة: ${labels[String(category)] || "ملاحظة"}`,
            text: `وصلت رسالة جديدة إلى صندوق ملاحظات أثر.\n\nالتصنيف: ${labels[String(category)] || "أخرى"}\nموافقة على مشاركة النص دون هوية: ${shareConsent ? "نعم" : "لا"}\n\nراجع الرسالة داخل لوحة إدارة قاعدة البيانات:\nhttps://supabase.com/dashboard/project/ojstudhmcypoqfnwugbf/editor\n\nمعرّف الرسالة: ${feedbackId}\n\nهذه رسالة تنبيه فقط. لا تحتوي على نص الملاحظة أو بيانات صاحبها حفاظًا على الخصوصية.`,
          }),
          signal: AbortSignal.timeout(8000),
        });
        emailStatus = outgoing.ok ? "queued" : "failed";
        if (!outgoing.ok) console.warn("Feedback notification provider rejected request", outgoing.status);
      } catch {
        emailStatus = "failed";
        console.warn("Feedback email notification unavailable");
      }
    }
    // The submission is already stored. Do not turn notification outages into duplicate submissions.
    const { error: updateError } = await db.from("athar_feedback_submissions").update({
      email_status: emailStatus,
      email_attempted_at: new Date().toISOString(),
    }).eq("id", feedbackId);
    if (updateError) console.warn("Feedback email state update failed", updateError.code);
    return reply(201, { ok: true }, request);
  } catch {
    return reply(503, { error: "STORAGE_UNAVAILABLE" }, request);
  }
});
