/**
 * Athar accounts — Supabase Auth wrapper.
 *
 * Core app features remain available without sign-in. Accounts enable cloud
 * sync and Companion replies. Every export degrades to a no-op when auth isn't
 * configured (missing env vars) rather than taking local features down.
 *
 * Two providers, per the owner's choice:
 *   - Google OAuth
 *   - Email magic link (passwordless), for users without a Google account
 *
 * Platform note — the OAuth redirect differs and this is the usual thing that
 * breaks on mobile:
 *   - Web / iOS PWA: normal browser redirect back to the site origin.
 *   - Android (Capacitor): the app is a WebView on `https://localhost`, so a
 *     normal web redirect would strand the user in a browser tab that can never
 *     hand the session back. It instead redirects to our custom scheme
 *     (`app.athar://auth`), which Android's intent filter and iOS's registered
 *     URL type route back into the app for the shared native callback handler.
 */
import { Capacitor } from "@capacitor/core";
import { createClient, type AuthChangeEvent, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import { normalizeAccountStorageOwner, type AccountStorageOwner } from "@/lib/accountStorageScope";

/** Custom scheme used for native OAuth round-trips. It must match the
 *  Android intent filter, iOS URL type, and Supabase redirect allow-list. */
export const NATIVE_AUTH_REDIRECT = "app.athar://auth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the project has been given Supabase credentials. When false the
 *  whole accounts feature stays invisible instead of showing broken UI. */
export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function sessionStorageKey(): string | null {
  if (!isAuthConfigured()) return null;
  try {
    // Keep the SDK's existing project-specific key so upgrades preserve sessions.
    return `sb-${new URL(SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

/**
 * Saved identity for device-local UI and storage routing only. Expiry does not
 * change ownership of offline data. Cloud requests still use getSession(),
 * which lets the SDK refresh/validate the access token.
 */
export function getCachedSession(): Session | null {
  const key = sessionStorageKey();
  if (!key) return null;
  try {
    if (typeof globalThis.localStorage === "undefined") return null;
    const serialized = globalThis.localStorage.getItem(key);
    if (!serialized) return null;
    const saved = JSON.parse(serialized) as Partial<Session> | null;
    if (!saved || typeof saved !== "object" ||
        typeof saved.access_token !== "string" || !saved.access_token ||
        typeof saved.refresh_token !== "string" || !saved.refresh_token ||
        typeof saved.expires_at !== "number" || !Number.isFinite(saved.expires_at) ||
        typeof saved.user?.id !== "string" || !saved.user.id.trim()) return null;
    return saved as Session;
  } catch {
    // Invalid/unavailable auth storage cannot authorize an account partition.
    return null;
  }
}

/** Checks persisted ownership without waiting for SDK initialization/network. */
export function getPersistedAccountStorageOwner(): AccountStorageOwner {
  return normalizeAccountStorageOwner(getCachedSession()?.user.id);
}

let _client: SupabaseClient | null = null;
let nativeCallbackInstalled = false;
const nativeExchanges = new Map<string, Promise<AuthResult>>();

type NativeAuthWindow = Window & {
  __atharPendingAuthUrl?: string;
  __atharAuthCallbackReady?: boolean;
};

function finishNativeAuthCallback(url: string): void {
  const publish = (result: AuthResult) => {
    window.dispatchEvent(new CustomEvent("athar-auth-result", { detail: result }));
  };
  void completeNativeSignIn(url).then(
    publish,
    () => publish({ ok: false, error: "تعذّر إكمال تسجيل الدخول" }),
  );
}

/** One app-wide consumer. Native retains a callback until this listener is ready. */
function installNativeAuthCallback(): void {
  if (nativeCallbackInstalled || !Capacitor.isNativePlatform() || typeof window === "undefined") return;
  nativeCallbackInstalled = true;
  const authWindow = window as NativeAuthWindow;
  authWindow.addEventListener("athar-auth-callback", (event: Event) => {
    const url = (event as CustomEvent<{ url?: unknown }>).detail?.url;
    if (typeof url === "string") finishNativeAuthCallback(url);
  });
  authWindow.__atharAuthCallbackReady = true;
  const queued = authWindow.__atharPendingAuthUrl;
  delete authWindow.__atharPendingAuthUrl;
  if (typeof queued === "string") finishNativeAuthCallback(queued);
}

/** Lazily-created singleton. Returns null when unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (!isAuthConfigured()) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: sessionStorageKey() ?? undefined,
      // On native the session arrives via our custom scheme, which Supabase's
      // URL detection can't see, so we complete the exchange by hand in
      // completeNativeSignIn() instead.
      detectSessionInUrl: !Capacitor.isNativePlatform(),
      flowType: "pkce",
    },
  });
  installNativeAuthCallback();
  return _client;
}

function redirectTarget(): string {
  if (Capacitor.isNativePlatform()) return NATIVE_AUTH_REDIRECT;
  return `${window.location.origin}/`;
}

export type AuthResult = { ok: boolean; error?: string };

/**
 * Start Google sign-in.
 *
 * On native we must NOT let Supabase navigate the WebView itself — that would
 * load Google's consent page inside the app, which Google blocks for OAuth
 * ("disallowed_useragent"). We ask for the URL only, then hand it to the system
 * browser, which is both the supported path and the one that can reach an
 * existing Google session.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "الحسابات غير مُهيّأة بعد" };

  const native = Capacitor.isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTarget(),
      skipBrowserRedirect: native,
    },
  });
  if (error) return { ok: false, error: error.message };

  if (native && data?.url) {
    // The local AuthBridge uses ASWebAuthenticationSession on iOS and the
    // system URL handler on Android. We avoid @capacitor/browser because its
    // Android Gradle config is rejected by the project's current AGP.
    const { registerPlugin } = await import("@capacitor/core");
    const AuthBridge = registerPlugin<{ openExternal(o: { url: string }): Promise<void> }>("AuthBridge");
    try {
      await AuthBridge.openExternal({ url: data.url });
    } catch {
      return { ok: false, error: "تعذّر فتح المتصفح الآمن لتسجيل الدخول" };
    }
  }
  return { ok: true };
}

/** Send a passwordless magic link. */
export async function signInWithEmail(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "الحسابات غير مُهيّأة بعد" };
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "أدخل بريدًا إلكترونيًا صحيحًا" };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { emailRedirectTo: redirectTarget() },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Finish a native sign-in from the deep link the system browser returns to.
 * Accept only a PKCE authorization code. This client is explicitly configured
 * for PKCE, so accepting bearer tokens from a custom-scheme URL would let any
 * app or webpage open this app as a different Supabase user.
 */
export function completeNativeSignIn(url: string): Promise<AuthResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "app.athar:" || parsed.hostname !== "auth" ||
        parsed.port || parsed.username || parsed.password ||
        (parsed.pathname !== "" && parsed.pathname !== "/")) {
      return Promise.resolve({ ok: false, error: "رابط الدخول غير صالح" });
    }
  } catch {
    return Promise.resolve({ ok: false, error: "رابط الدخول غير صالح" });
  }

  const existing = nativeExchanges.get(url);
  if (existing) return existing;
  // Defer the exchange until the map owns it: creating the client also drains
  // an early native callback and must share this same one-time-code exchange.
  const exchange = Promise.resolve().then(() => exchangeNativeSignIn(parsed));
  nativeExchanges.set(url, exchange);
  void exchange.then((result) => {
    if (!result.ok) nativeExchanges.delete(url);
    // Bound successful callback retention; tokens are kept only in memory.
    while (nativeExchanges.size > 32) nativeExchanges.delete(nativeExchanges.keys().next().value!);
  }, () => {
    nativeExchanges.delete(url);
  });
  return exchange;
}

async function exchangeNativeSignIn(parsed: URL): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "الحسابات غير مُهيّأة بعد" };
  try {
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    if (parsed.searchParams.has("error") || parsed.searchParams.has("error_description") ||
        hash.has("error") || hash.has("error_description")) {
      return { ok: false, error: "تعذّر تسجيل الدخول" };
    }
    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    return { ok: false, error: "رابط الدخول غير مكتمل" };
  } catch {
    return { ok: false, error: "تعذّر إكمال تسجيل الدخول" };
  }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: true };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const SESSION_READ_TIMEOUT_MS = 5_000;

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("تعذّر التحقق من جلسة الحساب")),
          SESSION_READ_TIMEOUT_MS,
        );
      }),
    ]);
    if (error) throw error;
    return data.session ?? null;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/** Subscribe to sign-in/sign-out. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null, event?: AuthChangeEvent) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(session, event));
  return () => data.subscription.unsubscribe();
}

/** A friendly display name for the signed-in user. */
export function displayNameOf(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name = typeof meta?.full_name === "string" ? meta.full_name
    : typeof meta?.name === "string" ? meta.name
    : "";
  return name || user.email || "حسابي";
}

/**
 * Permanently delete the account and all its synced rows.
 *
 * Google Play REQUIRES an in-app path to account deletion for any app that
 * offers account creation, so this is not optional polish. Deleting an auth
 * user needs the service-role key, which must never ship in a client bundle —
 * so this calls an edge function that performs the delete server-side.
 */
export async function deleteAccount(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "الحسابات غير مُهيّأة بعد" };
  let session: Session | null;
  try {
    session = await getSession();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "تعذّر التحقق من جلسة الحساب",
    };
  }
  const token = session?.access_token;
  if (!token) return { ok: false, error: "لست مسجّل الدخول" };

  try {
    const { error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) return { ok: false, error: error.message };
    await supabase.auth.signOut();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذّر حذف الحساب" };
  }
}
