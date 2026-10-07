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
  getCachedSession,
  isAuthConfigured,
  onAuthChange,
} from "@/lib/authClient";

export type AuthState = {
  session: Session | null;
  /** Local identity is available synchronously; network refresh runs separately. */
  loading: boolean;
  configured: boolean;
};

const SESSION_READ_TIMEOUT_MS = 5_000;

export function useAuthSession(): AuthState {
  const [session, setSession] = React.useState<Session | null>(getCachedSession);
  const loading = false;
  const configured = isAuthConfigured();

  React.useEffect(() => {
    if (!configured) return;
    let alive = true;
    let revision = 0;
    const readRevision = revision;
    const restoreSavedIdentity = () => {
      if (alive && revision === readRevision) setSession(getCachedSession());
    };
    const timeout = window.setTimeout(() => {
      restoreSavedIdentity();
    }, SESSION_READ_TIMEOUT_MS);

    const unsub = onAuthChange((s, event) => {
      if (!alive) return;
      revision += 1;
      // INITIAL_SESSION may carry null after an offline refresh fails while
      // the SDK still retains the saved session. SIGNED_OUT is authoritative.
      setSession(event === "SIGNED_OUT" ? null : s ?? getCachedSession());
    });

    void getSession().then((s) => {
      if (!alive || revision !== readRevision) return;
      setSession(s ?? getCachedSession());
    }).catch(restoreSavedIdentity).finally(() => window.clearTimeout(timeout));

    return () => {
      alive = false;
      window.clearTimeout(timeout);
      unsub();
    };
  }, [configured]);

  return { session, loading, configured };
}
