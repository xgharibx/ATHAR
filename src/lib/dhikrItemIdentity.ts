import { createRandomId } from "@/lib/randomId";

/** Create a stable identity for an adhkar item when older saved data has none. */
export function createDhikrItemId(scope: string, index: number, text: string): string {
  const source = `${scope}\u0000${Math.max(0, Math.trunc(index))}\u0000${text.trim()}`;
  const hash = (value: string, seed: number) => {
    let result = seed >>> 0;
    for (let i = 0; i < value.length; i += 1) {
      result = Math.imul(result ^ value.charCodeAt(i), 16777619) >>> 0;
    }
    return result.toString(36);
  };
  return `dh_${hash(source, 2166136261)}_${hash([...source].reverse().join(""), 2246822519)}`;
}

/** Generate an identity for a brand-new user item; legacy IDs use the function above. */
export function newDhikrItemId(): string {
  return `dh_${createRandomId()}`;
}

/** Stable state keys for mutable items; bundled catalog items retain old keys. */
export function dhikrStateKey(sectionId: string, index: number, itemId?: string | null): string {
  return itemId
    ? `${sectionId}:item:${encodeURIComponent(itemId)}`
    : `${sectionId}:${index}`;
}
