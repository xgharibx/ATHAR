/**
 * Athar accounts — Supabase Auth wrapper.
 *
 * Sign-in is entirely OPTIONAL: the app must keep working exactly as before
 * for anyone who never signs in, so every export here degrades to a no-op when
 * auth isn't configured (missing env vars) rather than throwing and taking the
 * app down with it.
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
 *     (`app.athar://auth`), which the manifest's intent-filter routes back into
 *     the app, where `appUrlOpen` completes the session exchange.
 */
import { Capacitor } from "@capacitor/core";
import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";

/** Custom scheme used for the Android OAuth round-trip. Must match the
 *  intent-filter in AndroidManifest.xml and the redirect allow-list in the
 *  Supabase dashboard. */
export const NATIVE_AUTH_REDIRECT = "app.athar://auth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the project has been given Supabase credentials. When false the
 *  whole accounts feature stays invisible instead of showing broken UI. */
export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let _client: SupabaseClient | null = null;

/** Lazily-created singleton. Returns null when unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (!isAuthConfigured()) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // On native the session arrives via our custom scheme, which Supabase's
      // URL detection can't see, so we complete the exchange by hand in
      // completeNativeSignIn() instead.
      detectSessionInUrl: !Capacitor.isNativePlatform(),
      flowType: "pkce",
    },
  });
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
    // Native bridge rather than @capacitor/browser — that plugin ships a
    // build.gradle current AGP rejects outright. See AuthBridgePlugin.java.
    const { registerPlugin } = await import("@capacitor/core");
    const AuthBridge = registerPlugin<{ openExternal(o: { url: string }): Promise<void> }>("AuthBridge");
    await AuthBridge.openExternal({ url: data.url });
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
 * Handles both PKCE (`?code=`) and implicit (`#access_token=`) shapes, since
 * which one arrives depends on the provider and Supabase settings.
 */
export async function completeNativeSignIn(url: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "الحسابات غير مُهيّأة بعد" };
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
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

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Subscribe to sign-in/sign-out. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
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
