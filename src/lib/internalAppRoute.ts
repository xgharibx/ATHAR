/**
 * Validate an in-app navigation destination before passing untrusted strings
 * to React Router. WHATWG URL parsing normalizes backslashes in special-scheme
 * URLs, so reject them before checking that the parsed origin stays local.
 */
export function getInternalAppRoute(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\") || hasControlChars(value)) return null;

  try {
    // Use a stable HTTP base for normalization. Capacitor iOS uses a custom
    // scheme with an opaque origin, which cannot be compared to URL.origin.
    const validationOrigin = "https://athar.invalid";
    const destination = new URL(value, validationOrigin);
    if (destination.origin !== validationOrigin) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function hasControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
