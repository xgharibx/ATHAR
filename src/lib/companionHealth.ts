/**
 * Companion proxy health check.
 *
 * The Companion AI streams via a Supabase Edge Function that must be
 * deployed + warmed up. We run a tiny OPTIONS preflight on app boot so
 * the UI can show a clear "AI ready / not reachable" pill instead of the
 * user discovering the outage by typing a message and getting a generic
 * toast. Result is cached for `CACHE_MS` ms.
 */
import { COMPANION_PROXY_URL } from "./companionAI";

const CACHE_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry = { at: number; ok: boolean; detail: string };
const cache = new Map<string, CacheEntry>();

export type CompanionHealthState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ready"; at: number; latencyMs: number }
  | { status: "unreachable"; at: number; reason: string; latencyMs: number };

let memo: { value: CompanionHealthState; at: number } | null = null;

async function checkOnce(): Promise<{ ok: boolean; latencyMs: number; detail: string }> {
  const start = performance.now();
  const url = `${COMPANION_PROXY_URL.replace(/\/$/, "")}/v1/messages`;
  try {
    const res = await fetch(url, {
      method: "OPTIONS",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const ms = Math.round(performance.now() - start);
    if (res.ok || res.status === 405 || res.status === 400) {
      // 200/202/204/400/405 all imply the proxy is reachable and responding.
      // Only outright network failure or 5xx are 'unreachable'.
      return { ok: true, latencyMs: ms, detail: `HTTP ${res.status}` };
    }
    if (res.status >= 500) {
      return { ok: false, latencyMs: ms, detail: `HTTP ${res.status} from proxy` };
    }
    // Auth-ish errors we can't fix client-side are still reachable — report as ready.
    return { ok: true, latencyMs: ms, detail: `HTTP ${res.status} (proxy reachable)` };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const detail = (err as Error)?.message ?? "network-error";
    return { ok: false, latencyMs: ms, detail };
  }
}

/** Run a single OPTIONS preflight on the proxy URL and memoize. */
export async function checkCompanionHealth(force = false): Promise<CompanionHealthState> {
  if (!force && memo && Date.now() - memo.at < CACHE_MS) return memo.value;
  const peek: CompanionHealthState = { status: "checking" };
  memo = { value: peek, at: Date.now() };
  const result = await checkOnce();
  const now = Date.now();
  cache.set("last", { at: now, ok: result.ok, detail: result.detail });
  const next: CompanionHealthState = result.ok
    ? { status: "ready", at: now, latencyMs: result.latencyMs }
    : { status: "unreachable", at: now, reason: result.detail, latencyMs: result.latencyMs };
  memo = { value: next, at: now };
  return next;
}

/** Returns last cached state synchronously (or null). */
export function peekCompanionHealth(): CompanionHealthState | null {
  return memo ? memo.value : null;
}

void cache;
