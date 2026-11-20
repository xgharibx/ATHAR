/**
 * The shared group khatma, client side (server: supabase/functions/khatma).
 *
 * The khatma lives on the server; each phone keeps only its code and the
 * keys it was given — a member key on joining, and the owner key for the
 * one who created it. Everyone sees the same 30 juz: who took which, and
 * what is done.
 */
export type KhatmaPart = { juz: number; holder: string | null; memberId: string | null; guest: boolean; done: boolean };
export type KhatmaMember = { id: string; name: string; juz: number[]; done: number };
export type SharedKhatma = {
  code: string;
  name: string;
  round: number;
  createdAt: string;
  completedAt: string | null;
  members: KhatmaMember[];
  parts: KhatmaPart[];
  done: number;
  you: { memberId: string | null; isOwner: boolean };
};
/** What this phone keeps. */
export type KhatmaKeys = { code: string; memberToken: string | null; ownerToken: string | null; name?: string };

export type KhatmaError = "offline" | "not_found" | "taken" | "full" | "not_member" | "not_owner" | "invalid" | "server";

const ERROR_TEXT: Record<KhatmaError, string> = {
  offline: "تعذّر الاتصال. تحقّق من الإنترنت وحاول مجددًا",
  not_found: "لا توجد ختمة بهذا الكود",
  taken: "أخذ أحدهم هذا الجزء قبلك",
  full: "اكتمل عدد أعضاء هذه الختمة",
  not_member: "انضمّ إلى الختمة أولًا",
  not_owner: "هذا لمنشئ الختمة فقط",
  invalid: "تحقّق من الاسم أو الكود",
  server: "حدث خطأ، حاول بعد قليل",
};

export function khatmaErrorText(error: KhatmaError): string {
  return ERROR_TEXT[error];
}

export function khatmaEndpoint(): string | null {
  const leaderboard = import.meta.env.VITE_LEADERBOARD_ENDPOINT as string | undefined;
  if (leaderboard && /\/leaderboard\/?$/.test(leaderboard)) return leaderboard.replace(/\/leaderboard\/?$/, "/khatma");
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? `${base.replace(/\/$/, "")}/functions/v1/khatma` : null;
}

function headers(keys: Partial<KhatmaKeys> | null, withBody: boolean): Record<string, string> {
  const apiKey =
    (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    "";
  const out: Record<string, string> = withBody ? { "Content-Type": "application/json" } : {};
  if (apiKey) {
    out.apikey = apiKey;
    if (apiKey.split(".").length === 3) out.Authorization = `Bearer ${apiKey}`;
  }
  if (keys?.memberToken) out["x-khatma-member"] = keys.memberToken;
  if (keys?.ownerToken) out["x-khatma-owner"] = keys.ownerToken;
  return out;
}

export type KhatmaResult<T = { khatma: SharedKhatma }> = { ok: true; data: T } | { ok: false; error: KhatmaError };

function mapError(status: number, code: unknown): KhatmaError {
  if (code === "not_found" || status === 404) return "not_found";
  if (code === "taken") return "taken";
  if (code === "full") return "full";
  if (code === "not_member") return "not_member";
  if (code === "not_owner") return "not_owner";
  if (status === 400) return "invalid";
  return "server";
}

async function call<T>(method: "GET" | "POST", keys: Partial<KhatmaKeys> | null, body?: Record<string, unknown>, query?: string): Promise<KhatmaResult<T>> {
  const endpoint = khatmaEndpoint();
  if (!endpoint) return { ok: false, error: "server" };
  let response: Response;
  try {
    response = await fetch(`${endpoint}${query ?? ""}`, {
      method,
      headers: headers(keys, method === "POST"),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return { ok: false, error: "offline" };
  }
  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  if (!response.ok) return { ok: false, error: mapError(response.status, payload.error) };
  return { ok: true, data: payload as T };
}

export function fetchKhatma(keys: KhatmaKeys) {
  return call<{ khatma: SharedKhatma }>("GET", keys, undefined, `?code=${encodeURIComponent(keys.code)}`);
}

export function createKhatma(name: string, memberName: string) {
  return call<{ khatma: SharedKhatma; memberToken: string; ownerToken: string }>("POST", null, { action: "create", name, memberName });
}

export function joinKhatma(code: string, name: string, keys: Partial<KhatmaKeys> | null = null) {
  return call<{ khatma: SharedKhatma; memberToken?: string }>("POST", keys, { action: "join", code: normalizeKhatmaCode(code), name });
}

export function khatmaAction(
  keys: KhatmaKeys,
  body:
    | { action: "claim" | "release"; juz: number }
    | { action: "done"; juz: number; done: boolean }
    | { action: "assign"; juz: number; memberId: string | null; guestName: string | null }
    | { action: "rename"; name: string }
    | { action: "newRound" | "leave" | "delete" },
) {
  return call<{ khatma?: SharedKhatma; left?: boolean; deleted?: boolean }>("POST", keys, { ...body, code: keys.code });
}

/** Codes are read aloud and typed: accept lower case, spaces and dashes. */
export function normalizeKhatmaCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isKhatmaCode(input: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeKhatmaCode(input));
}

/** «ABCD-EFGH», easier to read out. */
export function formatKhatmaCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** A link that opens the khatma's join screen in the app or on the site. */
export function khatmaLink(code: string): string {
  return `https://www.athark.org/leaderboard?khatma=${code}`;
}

/** The free juz, for a member choosing what to read. */
export function freeJuz(k: SharedKhatma): number[] {
  return k.parts.filter((p) => !p.holder).map((p) => p.juz);
}
