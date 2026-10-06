const ALLOWED_ORIGINS = new Set([
  "https://www.athark.org",
  "https://athark.org",
  "capacitor://localhost",
  "https://localhost",
]);

const ALLOWED_HEADERS = [
  "authorization", "apikey", "cache-control", "content-type", "x-api-key", "x-client-info",
  "anthropic-version", "anthropic-beta", "anthropic-dangerous-direct-browser-access",
  "x-stainless-retry-count", "x-stainless-timeout", "x-stainless-lang",
  "x-stainless-package-version", "x-stainless-os", "x-stainless-arch",
  "x-stainless-runtime", "x-stainless-runtime-version", "x-stainless-helper",
  // Required by the current Anthropic SDK's messages.stream() request.
  "x-stainless-helper-method",
].join(", ");

/** CORS headers shared by the app's PWA and Capacitor WebViews. */
export function companionCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
