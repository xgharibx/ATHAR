import { Capacitor } from "@capacitor/core";

const CONSENT_KEY = "athar_companion_minimax_consent_v1";

export function hasCompanionAiConsent(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CONSENT_KEY) === "granted";
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
    window.localStorage.setItem(CONSENT_KEY, "granted");
  } catch {
    // The current message can still proceed from the user's explicit choice;
    // without persistent storage, the next send will ask again.
  }
}

export function revokeCompanionAiConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Keep this helper safe in restricted browser contexts.
  }
}
