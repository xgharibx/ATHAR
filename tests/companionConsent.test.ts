import { beforeEach, describe, expect, it, vi } from "vitest";

const platformState = vi.hoisted(() => ({ value: "ios" }));
const storageState = vi.hoisted(() => new Map<string, string>());

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => platformState.value,
  },
}));

import {
  canSendCompanionAiMessage,
  grantCompanionAiConsent,
  hasCompanionAiConsent,
  needsCompanionAiConsent,
  revokeCompanionAiConsent,
} from "@/lib/companionConsent";

describe("iOS Ask Athar sharing consent", () => {
  beforeEach(() => {
    storageState.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storageState.get(key) ?? null,
        setItem: (key: string, value: string) => storageState.set(key, value),
        removeItem: (key: string) => storageState.delete(key),
      },
    });
    platformState.value = "ios";
  });

  it("requires permission before the first iOS message is sent", () => {
    expect(needsCompanionAiConsent()).toBe(true);
  });

  it("remembers an approved choice on the device", () => {
    grantCompanionAiConsent();

    expect(hasCompanionAiConsent()).toBe(true);
    expect(needsCompanionAiConsent()).toBe(false);
  });

  it("asks again after permission is withdrawn", () => {
    grantCompanionAiConsent();
    revokeCompanionAiConsent();

    expect(hasCompanionAiConsent()).toBe(false);
    expect(needsCompanionAiConsent()).toBe(true);
  });

  it("blocks persistence and provider requests until the user approves the pending send", () => {
    const onConsentRequired = vi.fn();
    const persistMessage = vi.fn();
    const requestProvider = vi.fn();

    const initiallyAllowed = canSendCompanionAiMessage(false, onConsentRequired);
    if (initiallyAllowed) {
      persistMessage("سؤال اختباري");
      requestProvider("سؤال اختباري");
    }

    expect(initiallyAllowed).toBe(false);
    expect(onConsentRequired).toHaveBeenCalledOnce();
    expect(persistMessage).not.toHaveBeenCalled();
    expect(requestProvider).not.toHaveBeenCalled();

    const approved = canSendCompanionAiMessage(true, onConsentRequired);
    if (approved) {
      persistMessage("سؤال اختباري");
      requestProvider("سؤال اختباري");
    }
    expect(persistMessage).toHaveBeenCalledOnce();
    expect(requestProvider).toHaveBeenCalledOnce();
  });

  it.each(["android", "web"])("does not change the %s send flow", (platform) => {
    platformState.value = platform;

    expect(needsCompanionAiConsent()).toBe(false);
  });
});
