import { accountScopedLocalStorage } from "@/lib/accountStorageScope";

// A grant names the service it was given for: the move from MiniMax to OpenAI
// asks everyone again (the MiniMax grants, v1 device-wide and v2 per account,
// no longer count). Grants are per account, so on a shared device one account
// never inherits another person's approval.
const CONSENT_KEY = "athar_companion_openai_consent_v1";

export function hasCompanionAiConsent(): boolean {
  try {
    return accountScopedLocalStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

/**
 * Asked everywhere before the first message reaches the outside AI service:
 * the App Store and Google Play both require clear disclosure and consent
 * before personal data goes to a third party (Settings › الخصوصية والأمان
 * shows and withdraws it).
 */
export function needsCompanionAiConsent(): boolean {
  return !hasCompanionAiConsent();
}

/** Returns false before any message state or network work when consent is missing. */
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
