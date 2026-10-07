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
import { getPersistedAccountStorageOwner } from "@/lib/authClient";
import { getAccountStorageOwner, normalizeAccountStorageOwner, type AccountStorageOwner } from "@/lib/accountStorageScope";
import { hydrateAccountStorageOwner } from "@/store/noorStore";
import { copyLocalDataIntoAccount, getAccountImportChoice, hasLocalCompanionData as inspectLocalCompanionData, hasLocalDataToImport, setAccountImportChoice } from "@/lib/accountDataImport";
import { beginAccountReminderTransition, cancelRemindersForAccountSwitch, completeAccountReminderTransition } from "@/lib/reminders";

export type AccountScopeState = {
  ready: boolean;
  error: string | null;
  needsImportChoice: boolean;
  importing: boolean;
  checkingImport: boolean;
  hasLocalCompanionData: boolean;
  includeCompanionData: boolean;
  setIncludeCompanionData: (include: boolean) => void;
  retry: () => void;
  chooseImport: (choice: "copy" | "keep", includeCompanionData?: boolean) => Promise<void>;
};

export function useCloudSync(): AccountScopeState {
  const { session, configured, loading } = useAuthSession();
  const userId = session?.user?.id ?? null;
  const targetOwner = normalizeAccountStorageOwner(configured ? userId : null);
  const targetOwnerRef = React.useRef(targetOwner);
  targetOwnerRef.current = targetOwner;
  const [hydratedOwner, setHydratedOwner] = React.useState<AccountStorageOwner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [needsImportChoice, setNeedsImportChoice] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [checkingImport, setCheckingImport] = React.useState(false);
  const [hasLocalCompanionData, setHasLocalCompanionData] = React.useState(false);
  const [includeCompanionData, setIncludeCompanionData] = React.useState(false);
  const [retryToken, setRetryToken] = React.useState(0);
  const needsInitialReminderCleanup = React.useRef(true);

  React.useEffect(() => {
    const requestImport = () => {
      const requestedForOwner = targetOwnerRef.current;
      setError(null);
      setNeedsImportChoice(true);
      setCheckingImport(true);
      setIncludeCompanionData(false);
      stopCloudSync();
      void inspectLocalCompanionData().then((hasData) => {
        if (targetOwnerRef.current === requestedForOwner) setHasLocalCompanionData(hasData);
      }).catch((cause: unknown) => {
        if (targetOwnerRef.current === requestedForOwner) {
          setError(cause instanceof Error ? cause.message : "تعذّر فحص سجل الرفيق المحلي");
        }
      }).finally(() => {
        if (targetOwnerRef.current === requestedForOwner) setCheckingImport(false);
      });
    };
    window.addEventListener("athar-request-data-import", requestImport);
    return () => window.removeEventListener("athar-request-data-import", requestImport);
  }, []);

  React.useEffect(() => {
    if (loading) return;
    let alive = true;
    stopCloudSync();
    setError(null);
    setNeedsImportChoice(false);
    setHasLocalCompanionData(false);
    setIncludeCompanionData(false);
    void (async () => {
      const stillCurrent = () => {
        if (!alive || targetOwnerRef.current !== targetOwner) return false;
        if (!configured) return targetOwner === "local";
        // Preserve the persisted-session race guard without refreshing a token
        // or waiting for network/SDK locks before opening device-local data.
        return getPersistedAccountStorageOwner() === targetOwner;
      };
      if (!await stillCurrent()) {
        if (!alive || targetOwnerRef.current !== targetOwner) return;
        throw new Error("تعذّر التحقق من جلسة الحساب الحالية");
      }
      if (needsInitialReminderCleanup.current || getAccountStorageOwner() !== targetOwner) {
        // Clear persisted OS/browser reminders before exposing even the local
        // scope. The in-memory owner resets to "local" after process restart,
        // so an owner comparison alone cannot identify alarms from a prior run.
        beginAccountReminderTransition();
        // Do not hydrate the new account if cancellation fails. The existing
        // retry/error screen lets the user retry without exposing stale alarms.
        await cancelRemindersForAccountSwitch(
          targetOwner,
          stillCurrent,
        );
        if (!alive) return;
        if (!await stillCurrent()) {
          if (!alive || targetOwnerRef.current !== targetOwner) return;
          throw new Error("تغيّرت جلسة الحساب قبل اكتمال تبديل التذكيرات");
        }
        needsInitialReminderCleanup.current = false;
      }
      await hydrateAccountStorageOwner(targetOwner);
      if (!alive) return;
      if (configured && userId && !getAccountImportChoice()) {
        await hydrateAccountStorageOwner("local");
        if (!alive) return;
        const hasLocalData = await hasLocalDataToImport();
        const hasCompanionData = await inspectLocalCompanionData();
        if (!alive) return;
        await hydrateAccountStorageOwner(targetOwner);
        if (!alive) return;
        setHasLocalCompanionData(hasCompanionData);
        if (hasLocalData) {
          completeAccountReminderTransition(targetOwner);
          setNeedsImportChoice(true);
          setHydratedOwner(targetOwner);
          return;
        }
        setAccountImportChoice("keep");
      }
      completeAccountReminderTransition(targetOwner);
      setHydratedOwner(targetOwner);
      if (configured && userId) startCloudSync();
    })().catch((cause: unknown) => {
      if (!alive) return;
      setError(cause instanceof Error ? cause.message : "تعذّر تحميل بيانات الحساب بأمان");
    });
    return () => {
      alive = false;
      stopCloudSync();
    };
  }, [configured, loading, retryToken, targetOwner, userId]);

  const chooseImport = React.useCallback(async (choice: "copy" | "keep", copyCompanionData = false) => {
    if (importing || checkingImport || !needsImportChoice) return;
    const stillCurrent = () => targetOwnerRef.current === targetOwner;
    setImporting(true);
    setError(null);
    try {
      if (choice === "copy") {
        await copyLocalDataIntoAccount(targetOwner, stillCurrent, {
          includeCompanionData: copyCompanionData && hasLocalCompanionData,
        });
      }
      // The session can change while IndexedDB is copying. A stale import must
      // never mark the new account as settled or start its cloud sync early.
      if (!stillCurrent()) return;
      setAccountImportChoice(choice);
      setNeedsImportChoice(false);
      setIncludeCompanionData(false);
      setHydratedOwner(targetOwner);
      if (configured && userId) startCloudSync();
    } catch (cause) {
      if (!stillCurrent()) return;
      setError(cause instanceof Error ? cause.message : "تعذّر استيراد بيانات هذا الجهاز");
    } finally {
      setImporting(false);
    }
  }, [checkingImport, configured, hasLocalCompanionData, importing, needsImportChoice, targetOwner, userId]);

  return {
    ready: !loading && !error && !needsImportChoice && !importing && hydratedOwner === targetOwner,
    error,
    needsImportChoice,
    importing,
    checkingImport,
    hasLocalCompanionData,
    includeCompanionData,
    setIncludeCompanionData,
    retry: () => setRetryToken((current) => current + 1),
    chooseImport,
  };
}

/** Live sync status for the account panel. */
export function useSyncStatus(): SyncStatus {
  return React.useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}
