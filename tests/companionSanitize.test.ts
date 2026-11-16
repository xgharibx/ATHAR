import { describe, expect, it } from "vitest";
import { createCompanionStreamSanitizer, sanitizeCompanionText } from "@/lib/companionSanitize";
import { isTrustedSourceUrl } from "@/lib/companionSources";

function streamed(text: string, size: number): string {
  const sanitizer = createCompanionStreamSanitizer();
  let out = "";
  for (let index = 0; index < text.length; index += size) out += sanitizer.push(text.slice(index, index + size));
  return out + sanitizer.flush();
}

describe("companion reply sanitizer", () => {
  it("removes stray foreign words from Arabic prose", () => {
    expect(sanitizeCompanionText("هذا جواب actually واضح")).toBe("هذا جواب واضح");
    expect(sanitizeCompanionText("الصبر (patience) مفتاح الفرج")).toBe("الصبر () مفتاح الفرج");
  });

  it("gives the same result on every call", () => {
    const text = "كلمة word كلمة";
    expect(sanitizeCompanionText(text)).toBe(sanitizeCompanionText(text));
    expect(sanitizeCompanionText(text)).toBe("كلمة كلمة");
  });

  it("keeps block markers, routes and source links intact", () => {
    const reply = [
      ":::verse",
      "﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾ — سورة الرعد ٢٨",
      ":::",
      "",
      ":::action(/c/morning)",
      "افتح أذكار الصباح",
      ":::",
      "",
      "راجع [/quran] ثم المصادر: [الدرر السنية](https://dorar.net/hadith/sharh/1)",
    ].join("\n");
    expect(sanitizeCompanionText(reply)).toBe(reply);
  });

  it.each([1, 2, 3, 5, 8, 13, 64])("is independent of how the stream is fragmented (%i)", (size) => {
    const reply = "السلام عليكم hello يا صديقي.\n\n:::action(/sebha)\nافتح السبحة\n:::\n\nالمصادر: [إسلام ويب](https://www.islamweb.net/ar/fatwa/1) done";
    expect(streamed(reply, size)).toBe(sanitizeCompanionText(reply));
  });

  it("never emits part of a marker before it is complete", () => {
    const sanitizer = createCompanionStreamSanitizer();
    expect(sanitizer.push(":::ver")).toBe("");
    expect(sanitizer.push("se\n")).toBe(":::verse\n");
  });
});

describe("trusted source links", () => {
  it("accepts listed domains and their subdomains over https", () => {
    expect(isTrustedSourceUrl("https://dorar.net/hadith/1")).toBe(true);
    expect(isTrustedSourceUrl("https://www.islamweb.net/ar/fatwa/1")).toBe(true);
  });

  it("rejects other hosts, look-alikes, plain http and credentials", () => {
    expect(isTrustedSourceUrl("https://example.com/")).toBe(false);
    expect(isTrustedSourceUrl("https://dorar.net.evil.example/")).toBe(false);
    expect(isTrustedSourceUrl("https://evildorar.net/")).toBe(false);
    expect(isTrustedSourceUrl("http://dorar.net/")).toBe(false);
    expect(isTrustedSourceUrl("https://user:pw@dorar.net/")).toBe(false);
    expect(isTrustedSourceUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedSourceUrl(undefined)).toBe(false);
  });
});
