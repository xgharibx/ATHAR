import { Capacitor } from "@capacitor/core";
import { accountScopedLocalStorage } from "@/lib/accountStorageScope";

// v2 is intentionally separate from the legacy device-wide grant. That old
// value cannot be attributed to a particular account, so reusing it could let
// one account inherit another person's approval on a shared device.
const CONSENT_KEY = "athar_companion_minimax_consent_v2";

export function hasCompanionAiConsent(): boolean {
  try {
    return accountScopedLocalStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function needsCompanionAiConsent(): boolean {
  return Capacitor.getPlatform() === "ios" && !hasCompanionAiConsent();
}

/** Returns false before any message state or network work when iOS consent is missing. */
export function canSendCompanionAiMessage(
  consentApprovedForThisSend: boolean,
  onConsentRequired: () => void,
): boolean {
  if (consentApprovedForThisSend || !needsCompanionAiConsent()) return true;
  onConsentRequired();
  return false;
}

export function grantCompanionAiConsent(): void {
  try {
    accountScopedLocalStorage.setItem(CONSENT_KEY, "granted");
  } catch {
    // The current message can still proceed from the user's explicit choice;
    // without persistent storage, the next send will ask again.
  }
}

export function revokeCompanionAiConsent(): void {
  try {
    accountScopedLocalStorage.removeItem(CONSENT_KEY);
  } catch {
    // Keep this helper safe in restricted browser contexts.
  }
}
