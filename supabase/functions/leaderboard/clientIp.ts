/** Supabase's edge gateway overwrites this value. Forwarded headers can be set by callers. */
export function readTrustedClientIp(headers: Headers): string {
  const ip = headers.get("cf-connecting-ip")?.trim();
  if (!ip || ip.length > 64) return "unknown";
  return ip;
}
