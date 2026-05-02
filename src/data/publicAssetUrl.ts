export function publicDataUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

  if (!base || base === ".") {
    return `/${cleanPath}`;
  }

  return `${base}/${cleanPath}`;
}