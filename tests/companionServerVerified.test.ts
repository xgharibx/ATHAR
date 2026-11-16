import { describe, expect, it } from "vitest";
import { verifyAnswerAsync } from "@/lib/companionKnowledge";

describe("server-verified citations", () => {
  it("raises no warning for a hadith block the server inserted with its source and grading", async () => {
    const reply = [
      "صيام يوم عرفة سنة مستحبة لغير الحاج.",
      ":::hadith",
      "«صِيامُ يومِ عَرَفَةَ ، إِنِّي أحْتَسِبُ على اللهِ أنْ يُكَفِّرَ السنَةَ التي قَبلَهُ ، و السنَةَ التي بَعدَهُ»",
      "— الراوي: أبو قتادة | المصدر: صحيح الجامع (3853) | الدرجة: صحيح — الألباني",
      ":::",
    ].join("\n");
    const report = await verifyAnswerAsync(reply);
    expect(report.notes).toEqual([]);
    expect(report.flagged).toBe(false);
  });

  it("still flags a hadith block that carries no verified source line", async () => {
    const report = await verifyAnswerAsync(":::hadith\n«نص بلا مصدر موثَّق على الإطلاق هنا»\n:::");
    expect(report.flagged).toBe(true);
  });
});
