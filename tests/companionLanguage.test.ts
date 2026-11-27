import { describe, expect, it } from "vitest";
import { createCompanionStreamSanitizer, sanitizeCompanionText, writtenInAnotherScript } from "@/lib/companionSanitize";
import { ReplyGuard, finalizeReplyDetailed, isUsableReply, writtenInAnotherScript as serverWrittenInAnotherScript } from "../supabase/functions/companion/guard";

const english = "Praying on time is among the deeds most beloved to Allah.";

describe("«اسأل أثر» answers in the user's language", () => {
  it("tells a question in another language from an Arabic one", () => {
    for (const detect of [writtenInAnotherScript, serverWrittenInAnotherScript]) {
      expect(detect("What is the reward of praying on time?")).toBe(true);
      expect(detect("ما فضل الصلاة في وقتها؟")).toBe(false);
      expect(detect("ما معنى كلمة sabr في القرآن؟")).toBe(false);
    }
  });

  it("keeps an English reply on the server when the question was English", () => {
    expect(isUsableReply(english)).toBe(false);
    expect(isUsableReply(english, true)).toBe(true);
    const kept = finalizeReplyDetailed(english, new ReplyGuard({ quran: null, hadith: [], trustedTexts: [], foreignReplyAllowed: true }));
    expect(kept.text).toContain("Praying on time");
  });

  it("still removes stray foreign words from an Arabic reply", () => {
    expect(sanitizeCompanionText("الصلاة في وقتها hello من أحب الأعمال")).not.toContain("hello");
  });

  it("keeps an English reply in the app as it streams", () => {
    const sanitizer = createCompanionStreamSanitizer(true);
    const shown = sanitizer.push(english) + sanitizer.flush();
    expect(shown).toBe(english);
  });
});
