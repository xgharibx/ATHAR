/**
 * Create an opaque non-secret identifier across older WebViews.
 * Prefer the platform UUID implementation, then its widely supported secure
 * random source. The final fallback is only for local entity IDs and must not
 * be used for credentials, tokens, or cryptographic material.
 */
export function createRandomId(): string {
  const cryptoApi = globalThis.crypto;
  try {
    if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
    if (typeof cryptoApi?.getRandomValues === "function") {
      return Array.from(cryptoApi.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
    }
  } catch {
    // Fall through if a WebView exposes but cannot use a crypto method.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}
