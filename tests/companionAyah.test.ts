import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AYAH_TAFSIRS, buildAyahBlock, clip, gatherTafsirs, readAyahRequest, tafsirPlainText } from "../supabase/functions/companion/ayah";
import type { Q2Meta } from "@/quran2/data/meta";

const meta = JSON.parse(readFileSync("public/data/quran2/tanzil-meta.json", "utf8")) as Q2Meta;

describe("«اسأل عن الآية» on the server", () => {
  it("accepts only real ayahs", () => {
    expect(readAyahRequest({ surah: 2, ayah: 286 })).toEqual({ surah: 2, ayah: 286 });
    expect(readAyahRequest({ surah: 2, ayah: 287 })).toBeNull();
    expect(readAyahRequest({ surah: 114, ayah: 6 })).toEqual({ surah: 114, ayah: 6 });
    expect(readAyahRequest({ surah: 0, ayah: 1 })).toBeNull();
    expect(readAyahRequest({ surah: 1.5, ayah: 1 })).toBeNull();
    expect(readAyahRequest(null)).toBeNull();
    // Its ayah counts are the mushaf's own, surah by surah.
    for (let s = 1; s <= 114; s++) {
      const n = meta.surahs[s - 1]!.ayahs;
      expect(readAyahRequest({ surah: s, ayah: n })).not.toBeNull();
      expect(readAyahRequest({ surah: s, ayah: n + 1 })).toBeNull();
    }
  });

  it("turns tafsir HTML into plain text, footnote numbers and markup gone", () => {
    expect(tafsirPlainText("<p>الله<sup foot_note=1>1</sup> لا إله إلا هو</p><p>الحي &amp; القيوم</p><script>x</script>")).toBe("الله لا إله إلا هو\nالحي & القيوم\nx");
    expect(tafsirPlainText("a <b onclick=\"<\">b</b> &lt;c&gt;")).not.toMatch(/[<>]/);
  });

  it("clips long tafsirs at a sentence end", () => {
    const long = `${"جملة طويلة. ".repeat(60)}`;
    const out = clip(long, 100);
    expect(out.length).toBeLessThanOrEqual(102);
    expect(out.endsWith("…")).toBe(true);
    expect(clip("قصير", 100)).toBe("قصير");
  });

  it("fetches the seven tafsirs and keeps those that answered", async () => {
    const asked: string[] = [];
    const fake = (async (url: string) => {
      asked.push(url);
      if (url.includes("/tafsirs/15/")) return new Response("down", { status: 503 });
      return new Response(JSON.stringify({ tafsir: { text: `<p>نص ${/tafsirs\/(\d+)/.exec(url)![1]}</p>` } }), { status: 200 });
    }) as unknown as typeof fetch;
    const got = await gatherTafsirs({ surah: 112, ayah: 1 }, fake);
    expect(asked).toHaveLength(AYAH_TAFSIRS.length);
    expect(asked.every((u) => u.endsWith("/by_ayah/112:1"))).toBe(true);
    expect(got.map((t) => t.name)).not.toContain("تفسير الطبري");
    expect(got).toHaveLength(6);
    const block = buildAyahBlock({ surah: 112, ayah: 1 }, "قُلْ هُوَ ٱللَّهُ أَحَدٌ", got);
    expect(block).toContain("سورة الإخلاص، الآية 1");
    expect(block).toContain("#### تفسير السعدي\nنص 91");
    expect(block).toContain("لم تتناول التفاسير السبعة");
  });
});
