/**
 * Live Supabase session for the UI.
 *
 * Also owns the native deep-link handshake: after Google sign-in the system
 * browser returns to `app.athar://auth`, Capacitor raises `appUrlOpen`, and we
 * exchange that URL for a session. Without this the user would sign in
 * successfully and then land back in the app still signed out.
 */
import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import {
  completeNativeSignIn,
  getSession,
  isAuthConfigured,
  onAuthChange,
} from "@/lib/authClient";

export type AuthState = {
  session: Session | null;
  /** True until the first session read resolves — used to avoid flashing a
   *  "sign in" button at someone who is already signed in. */
  loading: boolean;
  configured: boolean;
};

export function useAuthSession(): AuthState {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const configured = isAuthConfigured();

  React.useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let alive = true;

    void getSession().then((s) => {
      if (!alive) return;
      setSession(s);
      setLoading(false);
    });

    const unsub = onAuthChange((s) => { if (alive) setSession(s); });

    // Native OAuth return leg: MainActivity dispatches this DOM event when the
    // system browser hands back app.athar://auth (see AuthBridgePlugin /
    // MainActivity.deliverPendingAuthUrl). A DOM event rather than
    // @capacitor/app because that plugin's build.gradle breaks current AGP.
    let removeUrlListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const onCallback = (e: Event) => {
        const url = (e as CustomEvent<{ url?: string }>).detail?.url;
        if (typeof url === "string" && url.startsWith("app.athar://auth")) {
          void completeNativeSignIn(url);
        }
      };
      window.addEventListener("athar-auth-callback", onCallback as EventListener);
      removeUrlListener = () => window.removeEventListener("athar-auth-callback", onCallback as EventListener);
    }

    return () => {
      alive = false;
      unsub();
      removeUrlListener?.();
    };
  }, [configured]);

  return { session, loading, configured };
}
