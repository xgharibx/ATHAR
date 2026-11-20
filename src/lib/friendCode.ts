/**
 * Reading a friend's code.
 */
/** A friend's code is their leaderboard id. Codes from earlier versions held a
 *  whole copy of the friend's numbers; the id inside them is all that is kept. */
const FRIEND_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;
export function readFriendCode(code: string): { id: string; alias?: string } | null {
  const text = code.trim().replace(/^.*?(anon_[A-Za-z0-9_-]+).*$/s, "$1");
  if (FRIEND_ID_RE.test(text)) return { id: text };
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as { id?: unknown; alias?: unknown };
    if (typeof data.id === "string" && FRIEND_ID_RE.test(data.id)) {
      return { id: data.id, alias: typeof data.alias === "string" ? data.alias.slice(0, 40) : undefined };
    }
  } catch { /* not an old code either */ }
  return null;
}
