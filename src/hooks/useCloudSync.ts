/**
 * Wires the sync engine to the auth session.
 *
 * `useCloudSync()` belongs at the app root, not in the settings screen: sync
 * has to keep running while the user is counting tasbeeh or reading Quran,
 * which is exactly when the panel is unmounted.
 *
 * Signing out deliberately does NOT wipe the local base snapshot — the user
 * keeps everything on the device, and signing back into the same account
 * resumes with a correct base instead of re-merging from nothing. The base is
 * only forgotten when the account itself changes, which `runSync` detects.
 */
import * as React from "react";
import {
  getSyncStatus,
  startCloudSync,
  stopCloudSync,
  subscribeSyncStatus,
  type SyncStatus,
} from "@/lib/syncClient";
import { useAuthSession } from "@/hooks/useAuthSession";

export function useCloudSync(): void {
  const { session, configured } = useAuthSession();
  const userId = session?.user?.id ?? null;

  React.useEffect(() => {
    if (!configured || !userId) {
      stopCloudSync();
      return;
    }
    startCloudSync();
    return () => stopCloudSync();
  }, [configured, userId]);
}

/** Live sync status for the account panel. */
export function useSyncStatus(): SyncStatus {
  return React.useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}
