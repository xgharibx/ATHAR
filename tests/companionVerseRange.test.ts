// @vitest-environment jsdom
import { expect, it } from "vitest";
import fs from "node:fs";

/**
 * The server writes a verified passage of several verses as one block
 * ("﴿…﴾ — سورة البقرة: ١٨٣-١٨٤"). The app's own check used to compare it with
 * the first verse only and warn that the Quran text did not match.
 */
it("accepts a verified passage of several verses, and still catches an altered one", async () => {
  const quran = JSON.parse(fs.readFileSync("public/data/quran.json", "utf8")) as { surahs: Array<{ ayahs: string[] }> };
  globalThis.fetch = (async () => new Response(JSON.stringify(quran))) as typeof fetch;
  const { verifyAnswerAsync } = await import("@/lib/companionKnowledge");
  const verse = (n: number) => quran.surahs[1]!.ayahs[n - 1]!;

  const single = await verifyAnswerAsync(`كلام\n\n:::verse\n﴿${verse(183)}﴾ — سورة البقرة: ١٨٣\n:::`);
  const range = await verifyAnswerAsync(`كلام\n\n:::verse\n﴿${verse(183)} ${verse(184)}﴾ — سورة البقرة: ١٨٣-١٨٤\n:::`);
  const altered = await verifyAnswerAsync(`كلام\n\n:::verse\n﴿${verse(183)} نص مختلق لا وجود له في المصحف﴾ — سورة البقرة: ١٨٣-١٨٤\n:::`);

  expect(single.flagged).toBe(false);
  expect(range.flagged).toBe(false);
  expect(altered.flagged).toBe(true);
});
