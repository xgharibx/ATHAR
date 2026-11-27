/**
 * The hadith audit rows 32–49: chains and lists (D2, D8), books in parts
 * (B7), search filters (A3), explanation links (E1), curated cards into the
 * books (G2), folders and export (F3), one review queue (K1), shared links
 * (L3), asking about a hadith (J1), word meanings (D6) and reading plans (L6).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { chainEnd, parseIsnadChain } from "@/lib/isnadParser";
import { splitHadithText } from "@/lib/hadithText";
import { foldHadithSearch, gradeGroup } from "@/lib/fullHadithSearch";
import { markWordMeanings } from "@/lib/hadithWords";
import { savedHadithsText, type SavedHadith } from "@/lib/useSavedHadiths";
import { useHadithPrefs } from "@/lib/hadithPrefs";
import { hadithDueOn, localDayKey } from "@/lib/reviewToday";
import { reminderBody } from "@/quran2/native/reminder";
import { hadithShareUrl } from "@/data/hadithNumbers";
import { bookHadithGrade, libraryLinkFor } from "@/lib/libraryHadithLinks";
import { HADITH_PLANS, planDef, planPerDay, planToday } from "@/lib/hadithPlans";
import { planReminderBody } from "@/lib/hadithPlanReminder";
import { HADITH_GRADERS as APP_GRADERS } from "@/data/hadithTypes";
import { androidAssetLinks, appleAssociation } from "../tools/scripts/app-links.mjs";
import { explanationRecord } from "../tools/scripts/bundle-sharh.mjs";
import {
  HADITH_GRADERS,
  buildHadithBlock,
  gatherHadithSources,
  hadithTrustedTexts,
  readHadithAskRequest,
} from "../supabase/functions/companion/hadithAsk";

const BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

type Item = { n: number; a: number | string; s: number; t: string; r?: string; g?: string };

function chapters(book: string): Map<number, Item[]> {
  const dir = `public/data/hadith/books/${book}`;
  const out = new Map<number, Item[]>();
  for (const f of readdirSync(dir)) {
    const part = json(`${dir}/${f}`) as { key: string; s: number; hadiths: Item[] };
    expect(part.key).toBe(book);
    expect(`${part.s}.json`).toBe(f);
    out.set(part.s, part.hadiths);
  }
  return out;
}

describe("B7: each book ships as a table of contents and one file per chapter", () => {
  it.each(BOOKS)("%s: the parts hold exactly the source book, in order", (book) => {
    const source = json(`data/hadith/${book}.json`) as { hadiths: Item[] };
    const toc = json(`public/data/hadith/books/${book}.json`) as { rows: [number, number, string?][]; sections: unknown[] };
    const parts = chapters(book);
    expect(toc.rows.length).toBe(source.hadiths.length);
    // Every row names its hadith in book order, and the chapter file it is in.
    toc.rows.forEach(([n, s], i) => {
      expect(n).toBe(source.hadiths[i]!.n);
      expect(parts.get(s)?.some((h) => h.n === n), `${book}:${n} in chapter ${s}`).toBe(true);
    });
    const shipped = [...parts.values()].flat().sort((x, y) => x.n - y.n);
    const sourceSorted = [...source.hadiths].sort((x, y) => x.n - y.n);
    expect(shipped.map((h) => h.n)).toEqual(sourceSorted.map((h) => h.n));
    // The texts are the source's own (the parts change nothing).
    const byN = new Map(source.hadiths.map((h) => [h.n, h]));
    for (const h of shipped) expect(h.t).toBe(byN.get(h.n)!.t);
    // No chapter file is too big for a phone to open quickly.
    for (const [s] of parts) expect(readFileSync(`public/data/hadith/books/${book}/${s}.json`).length).toBeLessThan(900_000);
  });

  it("the whole books are no longer shipped", () => {
    for (const book of BOOKS) expect(existsSync(`public/data/hadith/${book}.json`)).toBe(false);
  });
});

describe("D2/D8: chains read link by link, lists show the hadith not the chain", () => {
  it("walks a chain to its last narrator", () => {
    const text = "حدثنا الحميدي عبد الله بن الزبير قال حدثنا سفيان قال حدثنا يحيى بن سعيد الأنصاري قال أخبرني محمد بن إبراهيم التيمي أنه سمع علقمة بن وقاص الليثي يقول سمعت عمر بن الخطاب على المنبر";
    expect(parseIsnadChain(text).length).toBeGreaterThanOrEqual(3);
    const ibnmajah = "حَدَّثَنَا أَبُو بَكْرِ بْنُ أَبِي شَيْبَةَ، حَدَّثَنَا سُفْيَانُ بْنُ عُيَيْنَةَ، عَنِ الزُّهْرِيِّ، عَنْ عُرْوَةَ، عَنْ عَائِشَةَ، قَالَتْ كُنَّ نِسَاءُ الْمُؤْمِنَاتِ يُصَلِّينَ مَعَ النَّبِيِّ";
    expect(chainEnd(ibnmajah)).toBeGreaterThan(0);
    expect(foldHadithSearch(splitHadithText(ibnmajah).matn)).toMatch(/^قالت كن نساء/);
    expect(chainEnd("إنما الأعمال بالنيات")).toBe(0);
  });

  it.each(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"])("%s: under 5% of hadiths still open on the chain", (book) => {
    let n = 0;
    let chainy = 0;
    for (const items of chapters(book).values()) {
      for (const h of items) {
        n++;
        const start = foldHadithSearch(splitHadithText(h.t).matn.slice(0, 40));
        if (/^(و ?)?(حدثنا|حدثني|اخبرنا|اخبرني|انبانا)/.test(start)) chainy++;
      }
    }
    expect(chainy / n).toBeLessThan(0.05);
  });
});

describe("D8: almost no hadith loses its text to the chain", () => {
  it("leaves at most a handful empty (those that really are a chain only: «وساق الحديث»)", () => {
    let empty = 0;
    for (const book of BOOKS) for (const items of chapters(book).values()) for (const h of items) if (!splitHadithText(h.t).matn.trim()) empty++;
    expect(empty).toBeLessThanOrEqual(5);
  });

  it("ends the chain where the words begin («قال كنا …»، «أنه كان …»، a long «وهو …»)", () => {
    expect(foldHadithSearch(splitHadithText("حَدَّثَنَا عَبْدَانُ، قَالَ أَخْبَرَنَا عَبْدُ اللَّهِ، قَالَ أَخْبَرَنَا حُمَيْدٌ، عَنْ أَنَسٍ، قَالَ كُنَّا نُبَكِّرُ بِالْجُمُعَةِ، وَنَقِيلُ بَعْدَ الْجُمُعَةِ").matn)).toMatch(/^قال كنا نبكر/);
    expect(foldHadithSearch(splitHadithText("وَحَدَّثَنِي عَنْ مَالِكٍ، أَنَّهُ بَلَغَهُ أَنَّ أَبَا بَكْرٍ وَعُمَرَ كَانَا يَفْعَلَانِ ذَلِكَ").matn)).toMatch(/^انه بلغه/);
    // «قال ابن رمح أخبرنا …» is a narrator, not the hadith.
    expect(foldHadithSearch(splitHadithText("حَدَّثَنَا قُتَيْبَةُ، وَابْنُ رُمْحٍ، قَالَ ابْنُ رُمْحٍ أَخْبَرَنَا اللَّيْثُ، عَنْ نَافِعٍ، عَنِ ابْنِ عُمَرَ، أَنَّهُ قَالَ نَهَى رَسُولُ اللَّهِ عَنْ ذَلِكَ").matn)).not.toMatch(/^قال ابن رمح/);
  });
});

describe("A3: grade filter groups", () => {
  it("counts the two Sahihs as sahih and «-» as no grade", () => {
    expect(gradeGroup("bukhari", "")).toBe("sahih");
    expect(gradeGroup("abudawud", "")).toBeNull();
    expect(gradeGroup("abudawud", "-")).toBeNull();
    expect(gradeGroup("tirmidhi", "hasan")).toBe("hasan");
    expect(gradeGroup("ibnmajah", "mawdu")).toBe("daif");
  });
});

describe("E1: explanations", () => {
  const links = json("public/data/hadith/sharh-links.json") as Record<string, string>;
  const bundled = json("public/data/hadith/sharh-bundled.json") as Record<string, unknown>;

  it("explains every hadith of the Nawawi forty, offline", () => {
    for (let n = 1; n <= 42; n++) {
      const id = links[`nawawi:${n}`];
      expect(id, `nawawi:${n}`).toBeTruthy();
      expect(bundled[id!], `nawawi:${n} bundled`).toBeTruthy();
    }
  });

  it("bundles only well-formed explanation records, plain text, known fields", () => {
    const record = explanationRecord({ id: 7, hadeeth: "نص <b>", explanation: "شرح", extra: "x", hints: ["فائدة", 1], words_meanings: [{ word: "كلمة", meaning: "معنى" }, {}] }, "7");
    expect(record).toEqual({ id: "7", title: "", hadeeth: "نص b", attribution: "", grade: "", explanation: "شرح", hints: ["فائدة"], words_meanings: [{ word: "كلمة", meaning: "معنى" }] });
    expect(explanationRecord({ id: 8, hadeeth: "x", explanation: "y" }, "7")).toBeNull();
    expect(explanationRecord({ id: 7, hadeeth: "x" }, "7")).toBeNull();
  });

  it("links several thousand hadiths, each to a known record, without the rejected matches", () => {
    expect(Object.keys(links).length).toBeGreaterThan(4000);
    for (const id of Object.values(links)) expect(id).toMatch(/^\d+$/);
    expect(links["qudsi:8"]).toBeUndefined();
    expect(links["qudsi:9"]).toBeUndefined();
  });
});

describe("G2: curated cards point into the books", () => {
  it("picks the most authoritative book and its grade", () => {
    const map = { "1": [{ bookKey: "nawawi", n: 1 }, { bookKey: "bukhari", n: 1 }] };
    expect(libraryLinkFor(map, "core_1")).toEqual({ bookKey: "bukhari", n: 1 });
    expect(libraryLinkFor(map, "core_2")).toBeNull();
    expect(libraryLinkFor(undefined, "core_1")).toBeNull();
    expect(bookHadithGrade("bukhari", "")).toBe("sahih");
    expect(bookHadithGrade("tirmidhi", "hasan")).toBe("hasan");
    expect(bookHadithGrade("abudawud", "-")).toBe("");
  });

  it("every curated link names a hadith that exists", () => {
    const links = json("public/data/hadith/library-links.json") as Record<string, { bookKey: string; n: number }[]>;
    const tocs = new Map<string, Set<number>>();
    for (const hits of Object.values(links)) {
      for (const { bookKey, n } of hits) {
        if (!tocs.has(bookKey)) tocs.set(bookKey, new Set((json(`public/data/hadith/books/${bookKey}.json`).rows as [number][]).map((r) => r[0])));
        expect(tocs.get(bookKey)!.has(n), `${bookKey}:${n}`).toBe(true);
      }
    }
  });
});

describe("F3: folders and export", () => {
  beforeEach(() => useHadithPrefs.setState({ folders: [], inFolders: {} }));

  it("adds, files, unfiles and removes folders", () => {
    const s = useHadithPrefs.getState();
    s.addFolder("  الصلاة ");
    s.addFolder("الصلاة");
    s.addFolder("");
    expect(useHadithPrefs.getState().folders).toEqual(["الصلاة"]);
    s.toggleInFolder("bukhari:1", "الصلاة");
    s.toggleInFolder("bukhari:1", "غير موجودة");
    expect(useHadithPrefs.getState().inFolders).toEqual({ "bukhari:1": ["الصلاة"] });
    s.toggleInFolder("bukhari:1", "الصلاة");
    expect(useHadithPrefs.getState().inFolders).toEqual({});
    s.toggleInFolder("bukhari:2", "الصلاة");
    s.removeFolder("الصلاة");
    expect(useHadithPrefs.getState()).toMatchObject({ folders: [], inFolders: {} });
  });

  it("exports what you saved, with notes and folders", () => {
    const items: SavedHadith[] = [{
      kind: "book", key: "bukhari:1", bookKey: "bukhari", n: 1, title: "صحيح البخاري", color: "", place: "الحديث ١",
      text: "إنما الأعمال بالنيات", bookmarked: true, note: "أراجعه كل يوم",
    }];
    const text = savedHadithsText(items, { "bukhari:1": ["النية"] });
    expect(text).toContain("صحيح البخاري، الحديث ١");
    expect(text).toContain("إنما الأعمال بالنيات");
    expect(text).toContain("ملاحظتي: أراجعه كل يوم");
    expect(text).toContain("المجموعات: النية");
  });
});

describe("K1: one review queue with the Quran", () => {
  it("counts hadith cards due by the day", () => {
    const cards = {
      "a:1": { interval: 1, ease: 2.5, due: "2026-11-26", reviews: 1 },
      "a:2": { interval: 1, ease: 2.5, due: "2026-11-27", reviews: 1 },
      "a:3": { interval: 1, ease: 2.5, due: "2026-11-28", reviews: 1 },
    };
    expect(hadithDueOn(cards, "2026-11-27")).toBe(2);
    expect(localDayKey(new Date(2026, 0, 5, 10).getTime())).toBe("2026-01-05");
  });

  it("the memorisation reminder names the hadith cards too", () => {
    expect(reminderBody(2)).toBe("صفحتان تنتظرانك في جلسة اليوم.");
    expect(reminderBody(2, 1)).toBe("صفحتان تنتظرانك في جلسة اليوم. ومعها بطاقة حديث واحدة للمراجعة.");
    expect(reminderBody(0, 5)).toContain("٥ بطاقات حديث");
  });
});

describe("L3: shared links open the hadith in the app", () => {
  it("shares a link to the hadith", () => {
    expect(hadithShareUrl("bukhari", 1)).toBe("https://www.athark.org/hadith/bukhari/1");
  });

  it("writes the link files only from valid values", () => {
    expect(appleAssociation("AB12CD34EF")).toEqual({
      applinks: { details: [{ appIDs: ["AB12CD34EF.com.athar.adhkar"], components: [{ "/": "/hadith/*" }] }] },
    });
    expect(appleAssociation("bad")).toBeNull();
    expect(appleAssociation(undefined)).toBeNull();
    const fp = Array.from({ length: 32 }, () => "ab").join(":");
    expect(androidAssetLinks(fp)?.[0]?.target.sha256_cert_fingerprints).toEqual([fp.toUpperCase()]);
    expect(androidAssetLinks("nope")).toBeNull();
  });

  it("both apps claim only hadith pages", () => {
    const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    expect(manifest).toMatch(/android:autoVerify="true"[\s\S]*?android:host="www\.athark\.org"[\s\S]*?android:pathPrefix="\/hadith\/"/);
    const entitlements = readFileSync("ios/App/App/App.entitlements", "utf8");
    expect(entitlements).toContain("applinks:www.athark.org");
    expect(readFileSync("ios/App/App/AppDelegate.swift", "utf8")).toContain("sharedLinkRoute(from: url)");
    expect(readFileSync("android/app/src/main/java/com/athar/adhkar/AtharActivity.java", "utf8")).toContain("readSharedLink(intent)");
    expect(readFileSync(".github/workflows/deploy-pages.yml", "utf8")).toContain("tools/scripts/app-links.mjs dist \"$APPLE_TEAM_ID\"");
  });
});

describe("J1: «اسأل عن الحديث» on the server", () => {
  const serve = (async (input: string | URL | Request) => {
    const url = String(input);
    const local = url.replace("https://www.athark.org/", "public/");
    if (url.startsWith("https://www.athark.org/") && existsSync(local)) return new Response(readFileSync(local, "utf8"), { status: 200 });
    if (url.startsWith("https://hadeethenc.com/")) {
      const id = new URL(url).searchParams.get("id")!;
      const bundled = json("public/data/hadith/sharh-bundled.json") as Record<string, unknown>;
      return bundled[id] ? new Response(JSON.stringify(bundled[id]), { status: 200 }) : new Response("", { status: 404 });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;

  it("accepts only the app's books and real numbers", () => {
    expect(readHadithAskRequest({ book: "bukhari", n: 1 })).toEqual({ book: "bukhari", n: 1 });
    expect(readHadithAskRequest({ book: "other", n: 1 })).toBeNull();
    expect(readHadithAskRequest({ book: "bukhari", n: 0 })).toBeNull();
    expect(readHadithAskRequest({ book: "bukhari", n: 1.5 })).toBeNull();
    expect(readHadithAskRequest({ book: "__proto__", n: 1 })).toBeNull();
    expect(readHadithAskRequest({ book: "constructor", n: 1 })).toBeNull();
  });

  it("names the same scholars as the app", () => {
    expect(HADITH_GRADERS).toEqual([...APP_GRADERS]);
  });

  it("reads the hadith, its rulings and its explanation from the published data", async () => {
    const sources = await gatherHadithSources({ book: "nawawi", n: 1 }, { fetcher: serve });
    expect(foldHadithSearch(sources?.text ?? "")).toContain("الاعمال");
    expect(sources?.explanation?.text.length).toBeGreaterThan(100);
    const block = buildHadithBlock({ book: "nawawi", n: 1 }, sources);
    expect(block).toContain("الأربعون النووية");
    expect(block).toContain("#### شرح الحديث");
    expect(hadithTrustedTexts(sources).length).toBeGreaterThan(1);

    // A book with scholars' rulings: they are passed with who gave them.
    const abudawud = json("public/data/hadith/text/abudawud.json") as { rows: unknown[][] };
    const toc = json("public/data/hadith/books/abudawud.json") as { rows: [number, number][] };
    const parts = chapters("abudawud");
    const withRulings = toc.rows.find(([n, s]) => (parts.get(s)!.find((h) => h.n === n) as { gr?: unknown[] } | undefined)?.gr?.length);
    expect(abudawud.rows.length).toBeGreaterThan(0);
    const ruled = await gatherHadithSources({ book: "abudawud", n: withRulings![0] }, { fetcher: serve });
    expect(ruled?.rulings.length).toBeGreaterThan(0);
    expect(buildHadithBlock({ book: "abudawud", n: withRulings![0] }, ruled)).toContain("#### أحكام العلماء على الحديث");
  });

  it("says so when the hadith cannot be read", async () => {
    expect(await gatherHadithSources({ book: "nawawi", n: 99_999 }, { fetcher: serve })).toBeNull();
    expect(buildHadithBlock({ book: "nawawi", n: 99_999 }, null)).toContain("تعذّر جلب نص الحديث");
    expect(hadithTrustedTexts(null)).toEqual([]);
  });

  it("the server routes the hadith mode", () => {
    const index = readFileSync("supabase/functions/companion/index.ts", "utf8");
    expect(index).toContain("readHadithAskRequest(body.athar_hadith)");
    expect(index).toContain('sseEvent("athar_hadith"');
  });
});

describe("D6: tap a word for its meaning", () => {
  it("marks the encyclopedia's words in the text, longest first, never overlapping", () => {
    const parts = markWordMeanings("إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", [
      { word: "النيات:", meaning: "جمع نية، وهي القصد" },
      { word: "امرئ", meaning: "إنسان" },
      { word: "", meaning: "x" },
      { word: "نوى", meaning: null as unknown as string },
    ]);
    expect(parts.map((p) => p.text).join("")).toBe("إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى");
    expect(parts.filter((p) => p.meaning).map((p) => p.word)).toEqual(["النيات", "امرئ"]);
    expect(markWordMeanings("نص", [])).toEqual([{ text: "نص" }]);
  });
});

describe("L6: reading plans", () => {
  beforeEach(() => useHadithPrefs.setState({ plan: null }));

  it("knows each plan's share a day", () => {
    expect(HADITH_PLANS.map((p) => p.book)).toEqual(["nawawi", "qudsi", "bukhari", "muslim"]);
    expect(planPerDay(planDef("nawawi"), 42)).toBe(1);
    expect(planPerDay(planDef("bukhari-year"), 7277)).toBe(20);
  });

  it("counts today's share, what is left and how far behind", () => {
    const plan = { id: "nawawi" as const, start: "2026-11-25", read: 1, reminder: null };
    expect(planToday(plan, 42, "2026-11-25")).toMatchObject({ day: 1, target: 1, left: 0, done: true, behind: 0 });
    expect(planToday(plan, 42, "2026-11-27")).toMatchObject({ day: 3, target: 3, left: 2, done: false, behind: 1 });
    expect(planToday({ ...plan, read: 42 }, 42, "2027-02-01")).toMatchObject({ finished: true, done: true });
  });

  it("moves on as you read in order, not when you jump far ahead or read another book", () => {
    const s = useHadithPrefs.getState();
    s.startPlan("qudsi");
    s.advancePlan("qudsi", 0);
    expect(useHadithPrefs.getState().plan?.read).toBe(1);
    s.advancePlan("nawawi", 1);
    s.advancePlan("qudsi", 500);
    s.advancePlan("qudsi", 0);
    expect(useHadithPrefs.getState().plan?.read).toBe(1);
    s.advancePlan("qudsi", 2);
    expect(useHadithPrefs.getState().plan?.read).toBe(3);
    s.setPlanReminder("20:00");
    expect(useHadithPrefs.getState().plan?.reminder).toBe("20:00");
    s.stopPlan();
    expect(useHadithPrefs.getState().plan).toBeNull();
    expect(planReminderBody("الأربعون القدسية")).toBe("وِرد اليوم من «الأربعون القدسية» ينتظرك.");
  });
});

describe("I1: «أفق» keeps one top bar", () => {
  it("hides the page's own back button and stars under «أفق»", () => {
    const css = readFileSync("src/styles/ufuq.css", "utf8");
    expect(css).toMatch(/:root\[data-design="ufuq"\] \[data-page-back\]/);
    expect(css).toMatch(/:root\[data-design="ufuq"\] \[data-hadith-stars\]/);
  });
});
