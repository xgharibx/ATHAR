/**
 * Companion user profile — lightweight, on-device only.
 *
 * Stored in localStorage. Drives prompt-level personalization and the warm
 * greeting. We never ask for anything sensitive (no name, no location) — the
 * "level" + "goals" framing lets the system adapt without ever feeling profiled.
 */

export type CompanionProfile = {
  level: "new" | "regular" | "advanced";
  goals: Array<"quran" | "adhkar" | "consistency" | "learning" | "tarbiyah">;
  concerns: Array<"worry" | "distraction" | "guilt" | "loneliness" | "none">;
  greetingName: string;
  onboarded: boolean;
  createdAt: number;
};

const KEY = "noor_companion_profile_v1";

const DEFAULT_PROFILE: CompanionProfile = {
  level: "regular",
  goals: ["consistency"],
  concerns: ["none"],
  greetingName: "",
  onboarded: false,
  createdAt: 0,
};

export function loadProfile(): CompanionProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<CompanionProfile>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: CompanionProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

export function updateProfile(patch: Partial<CompanionProfile>): CompanionProfile {
  const next = { ...loadProfile(), ...patch };
  saveProfile(next);
  return next;
}

export const LEVEL_LABEL: Record<CompanionProfile["level"], string> = {
  new: "مبتدئ في طريقه",
  regular: "منتظم بإذن الله",
  advanced: "متقدم يطلب المزيد",
};

export function buildCompanionProfileContext(p: CompanionProfile): string {
  if (!p.onboarded) {
    return "حالة المستخدم: لم يُعرِّف نفسه بعد. اقترح عليه أول محادثة بنبرة ترحيب خفيفة ودافئة، ولا تُكثر الأسئلة.";
  }
  const goals = p.goals.length > 0
    ? p.goals
        .map((g) => ({ quran: "القرآن وتدبُّره", adhkar: "الأذكار والورد اليومي", consistency: "المواظبة وبناء السلسلة", learning: "تعلُّم العلم الشرعي", tarbiyah: "التربية والتزكية" }[g]))
        .filter(Boolean)
        .join(" • ")
    : "غير محدَّد";
  const concerns = p.concerns.filter((c) => c !== "none")
    .map((c) => ({ worry: "بعض القلق", distraction: "تشتُّت", guilt: "شعور بالتقصير", loneliness: "شيء من الوحدة" }[c]))
    .filter(Boolean)
    .join(" • ");
  return [
    `حالة المستخدم: ${LEVEL_LABEL[p.level]}.`,
    p.greetingName ? `اسمه المختصر: ${p.greetingName}.` : "لم يختر اسمًا بعد.",
    `أهدافه الآن: ${goals}.`,
    concerns ? `ما يشغله: ${concerns}.` : "ما يشغله: لا شيء محدَّد.",
  ].join(" ");
}
