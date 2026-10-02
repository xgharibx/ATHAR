import {
  accountScopedStorageKey,
  getAccountStorageOwner,
  setAccountStorageOwner,
  type AccountStorageOwner,
} from "@/lib/accountStorageScope";
import { copyHadithUserState } from "@/lib/hadithIDB";
import { copyReminderDataBetweenOwners } from "@/lib/reminderStorage";
import { copyConversationsBetweenOwners, listConversations, listPins } from "@/lib/companionHistory";
import { hydrateAccountStorageOwner } from "@/store/noorStore";
import { useNoorStore } from "@/store/noorStore";
import { bucketize, debucketize, emptyBuckets, mergeDoc, SYNC_KINDS, type SyncBlob } from "@/lib/syncMerge";
import { adoptLeaderboardIdentity, peekLeaderboardIdentity } from "@/lib/leaderboard";

export const ACCOUNT_IMPORT_CHOICE_KEY = "noor_account_import_choice_v1";

const COMPANION_LOCAL_KEYS = [
  "noor_companion_profile_v1",
  "noor_companion_memory_v1",
  "noor_companion_pins_v1",
  "noor_companion_partial_v1",
  "noor_companion_bookmarks",
] as const;

export async function hasLocalDataToImport(): Promise<boolean> {
  const state = useNoorStore.getState().exportState() as unknown as Record<string, unknown>;
  if (state.onboardingDone === true) return true;
  const ignored = new Set(["version", "exportedAt", "prefs", "reminders", "weeklyReportSentISO"]);
  for (const [key, value] of Object.entries(state)) {
    if (ignored.has(key) || value == null || value === false || value === "") continue;
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === "object" && Object.keys(value as object).length > 0) return true;
    if (typeof value === "number" && value !== 0) return true;
  }
  if (await hasLocalCompanionData()) return true;
  try {
    for (const key of ["noor_data_packs_v1"]) {
      const value = JSON.parse(localStorage.getItem(key) ?? "null");
      if (Array.isArray(value) && value.length > 0) return true;
    }
  } catch { /* malformed legacy values remain available for explicit import */ }
  if (localStorage.getItem("noor_lb_id_v2") && localStorage.getItem("noor_lb_secret_v2")) return true;
  return false;
}

/** Companion text/profile data gets a separate, unchecked import option. */
export async function hasLocalCompanionData(): Promise<boolean> {
  const conversations = await listConversations("local");
  if (conversations.length > 0 || listPins("local").length > 0) return true;
  try {
    for (const key of COMPANION_LOCAL_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw) as unknown;
      if (Array.isArray(value) ? value.length > 0 : value != null && typeof value === "object" && Object.keys(value).length > 0) {
        return true;
      }
    }
  } catch { /* malformed legacy Companion values remain available for explicit import */ }
  return false;
}

function shouldCopyLegacyKey(key: string): boolean {
  if (key.includes("::")) return false;
  if (key.startsWith("sb-")) return false; // Supabase session tokens are credentials, never app data.
  if (key.startsWith("noor_sharh_v1:")) return false; // Public provider-response cache.
  if (key.startsWith("noor_companion_")) return false; // Requires its own explicit, unchecked choice.
  if (key === "noor_store_v1" || key === "noor_data_packs_v1" || key.startsWith("noor_lb_")) return false;
  return !new Set([
    "athar_device_id_v1",
    "athar_mushaf_opened",
    "noor_app_runtime_version",
    "noor_react_root_instance",
  ]).has(key);
}

function mergeLegacyArray(targetRaw: string, sourceRaw: string, key: string): string | null {
  try {
    const target = JSON.parse(targetRaw) as unknown;
    const source = JSON.parse(sourceRaw) as unknown;
    if (!Array.isArray(target) || !Array.isArray(source)) return null;
    const merged = new Map<string, unknown>();
    for (const item of [...target, ...source]) {
      const identity = item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? `id:${(item as { id: string }).id}`
        : JSON.stringify(item);
      if (!merged.has(identity)) merged.set(identity, item);
    }
    const values = [...merged.values()];
    if (key === "noor_companion_pins_v1") values.splice(100);
    if (key === "noor_companion_memory_v1") values.splice(0, Math.max(0, values.length - 14));
    return JSON.stringify(values);
  } catch {
    return null;
  }
}

/**
 * Copies local-only data into the selected account and keeps the original
 * signed-out copy untouched. Repeating a partially completed import is safe.
 */
export async function copyLocalDataIntoAccount(
  targetOwner: AccountStorageOwner,
  shouldContinue: () => boolean = () => true,
  options: { includeCompanionData?: boolean } = {},
): Promise<void> {
  if (targetOwner === "local") throw new Error("يلزم تسجيل الدخول لاستيراد البيانات إلى الحساب");
  if (!shouldContinue()) return;

  // A hydrated account on this device has an existing preference authority.
  // For a first-time account partition, the user's explicit import should
  // carry local preferences and onboarding state instead of fresh defaults.
  const accountHadStore = localStorage.getItem(accountScopedStorageKey("noor_store_v1", targetOwner)) !== null;

  await hydrateAccountStorageOwner("local");
  if (!shouldContinue()) return;
  const localStore = useNoorStore.getState().exportState() as unknown as SyncBlob;
  const localIdentity = peekLeaderboardIdentity();

  const legacyKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && shouldCopyLegacyKey(key)) legacyKeys.push(key);
  }

  for (const key of legacyKeys) {
    if (!shouldContinue()) return;
    const destinationKey = accountScopedStorageKey(key, targetOwner);
    const existing = localStorage.getItem(destinationKey);
    const value = localStorage.getItem(key);
    if (value === null) continue;
    if (existing === null) localStorage.setItem(destinationKey, value);
    else {
      const mergedArray = mergeLegacyArray(existing, value, key);
      if (mergedArray !== null) localStorage.setItem(destinationKey, mergedArray);
    }
  }

  if (options.includeCompanionData) {
    for (const key of COMPANION_LOCAL_KEYS) {
      if (!shouldContinue()) return;
      const sourceValue = localStorage.getItem(key);
      if (sourceValue === null) continue;
      const destinationKey = accountScopedStorageKey(key, targetOwner);
      const existing = localStorage.getItem(destinationKey);
      if (existing === null) localStorage.setItem(destinationKey, sourceValue);
      else {
        const mergedArray = mergeLegacyArray(existing, sourceValue, key);
        if (mergedArray !== null) localStorage.setItem(destinationKey, mergedArray);
      }
    }
  }

  await copyHadithUserState("local", targetOwner);
  if (!shouldContinue()) return;
  await copyReminderDataBetweenOwners("local", targetOwner);
  if (!shouldContinue()) return;
  if (options.includeCompanionData) {
    await copyConversationsBetweenOwners("local", targetOwner);
    if (!shouldContinue()) return;
  }

  await hydrateAccountStorageOwner(targetOwner);
  if (!shouldContinue()) return;
  const accountStore = useNoorStore.getState().exportState() as unknown as SyncBlob;
  const accountIdentity = peekLeaderboardIdentity();
  const localFields = { ...localStore };
  const accountFields = { ...accountStore };
  delete localFields.version;
  delete localFields.exportedAt;
  delete accountFields.version;
  delete accountFields.exportedAt;
  if (localIdentity) localFields.leaderboardIdentity = localIdentity;
  if (accountIdentity) accountFields.leaderboardIdentity = accountIdentity;

  const localBuckets = bucketize(localFields);
  const accountBuckets = bucketize(accountFields);
  const mergedBuckets = emptyBuckets();
  for (const kind of SYNC_KINDS) {
    // Keep preferences from an existing account snapshot. If this account has
    // no persisted snapshot yet, the explicit import should bring over the
    // local settings and onboarding completion along with the user's data.
    mergedBuckets[kind] = mergeDoc(accountBuckets[kind], localBuckets[kind], {
      remoteNewer: !accountHadStore,
      base: null,
    });
  }
  const merged = debucketize(mergedBuckets);
  await useNoorStore.getState().importState({
    version: 1,
    exportedAt: new Date().toISOString(),
    ...merged,
  } as never);
  if (merged.leaderboardIdentity) adoptLeaderboardIdentity(merged.leaderboardIdentity);

  setAccountStorageOwner(targetOwner);
}

export function getAccountImportChoice(): "copy" | "keep" | null {
  const value = localStorage.getItem(accountScopedStorageKey(ACCOUNT_IMPORT_CHOICE_KEY));
  return value === "copy" || value === "keep" ? value : null;
}

export function setAccountImportChoice(choice: "copy" | "keep"): void {
  localStorage.setItem(accountScopedStorageKey(ACCOUNT_IMPORT_CHOICE_KEY), choice);
}

export function getActiveAccountImportOwner(): AccountStorageOwner {
  return getAccountStorageOwner();
}
