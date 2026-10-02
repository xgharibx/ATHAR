/**
 * Live Supabase session for the UI.
 *
 * The auth client also owns the native deep-link handshake: after Google
 * sign-in the system browser returns to `app.athar://auth`, and the native
 * bridge forwards that callback to the auth client to exchange for a session.
 */
import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import {
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

    return () => {
      alive = false;
      unsub();
    };
  }, [configured]);

  return { session, loading, configured };
}
