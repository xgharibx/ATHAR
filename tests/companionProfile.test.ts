// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { detectMood } from "@/lib/companionKnowledge";
import {
  buildCompanionProfileContext,
  LEVEL_LABEL,
  loadProfile,
  saveProfile,
  updateProfile,
  type CompanionProfile,
} from "@/lib/companionProfile";

beforeEach(() => {
  try { localStorage.removeItem("noor_companion_profile_v1"); } catch { /* ignore */ }
});

describe("detectMood", () => {
  it("detects sadness/worry", () => {
    expect(detectMood("أحسّ بقلق شديد هذه الأيام")).toBe("حزين أو مهموم");
  });
  it("detects gratitude", () => {
    expect(detectMood("الحمد لله أنا فرحان جدًا")).toBe("فرحان ومتحمس");
  });
  it("detects repentance", () => {
    expect(detectMood("أريد توبة صادقة")).toBe("تائب وقريب من الله");
  });
  it("returns empty for neutral", () => {
    expect(detectMood("ما هي سورة الفاتحة؟")).toBe("");
  });
});

describe("companionProfile", () => {
  it("loadProfile returns default", () => {
    const p = loadProfile();
    expect(p.onboarded).toBe(false);
    expect(p.level).toBe("regular");
    expect(p.includePersonalContext).toBe(false);
  });

  it("updateProfile merges and persists", () => {
    const next = updateProfile({ level: "advanced", goals: ["quran", "consistency"], greetingName: "أبو عبدالله", onboarded: true });
    expect(next.level).toBe("advanced");
    expect(next.goals).toContain("quran");
    const reloaded = loadProfile();
    expect(reloaded.greetingName).toBe("أبو عبدالله");
    expect(reloaded.onboarded).toBe(true);
  });

  it("persists the explicit personal-context choice", () => {
    updateProfile({ includePersonalContext: true });
    expect(loadProfile().includePersonalContext).toBe(true);

    updateProfile({ includePersonalContext: false });
    expect(loadProfile().includePersonalContext).toBe(false);
  });

  it("fails closed when a stored opt-in value is missing or malformed", () => {
    saveProfile({ ...loadProfile(), includePersonalContext: "false" as unknown as boolean });
    expect(loadProfile().includePersonalContext).toBe(false);

    const { includePersonalContext: _legacyFlag, ...legacyProfile } = loadProfile();
    saveProfile(legacyProfile as CompanionProfile);
    expect(loadProfile().includePersonalContext).toBe(false);
  });

  it("LEVEL_LABEL covers all levels", () => {
    expect(LEVEL_LABEL.new).toBeTruthy();
    expect(LEVEL_LABEL.regular).toBeTruthy();
    expect(LEVEL_LABEL.advanced).toBeTruthy();
  });

  it("buildCompanionProfileContext reflects choices", () => {
    updateProfile({ level: "new", goals: ["adhkar"], concerns: ["distraction"], greetingName: "أم عبدالله", onboarded: true });
    const p = loadProfile();
    const ctx = buildCompanionProfileContext(p);
    expect(ctx).toContain("أم عبدالله");
    expect(ctx).toContain("الأذكار والورد اليومي");
    expect(ctx).toContain("تشتُّت");
    expect(ctx).toContain("مبتدئ");
  });

  it("buildCompanionProfileContext pre-onboarding message", () => {
    const p = loadProfile();
    const ctx = buildCompanionProfileContext(p);
    expect(ctx).toContain("لم يُعرِّف نفسه بعد");
  });
});
