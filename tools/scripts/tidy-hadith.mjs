#!/usr/bin/env node
/**
 * Tidies the hadith bundle after import-hadith.mjs. Safe to run again.
 *
 *   node tools/scripts/tidy-hadith.mjs
 *
 * - Leaves out entries with no text: numbering placeholders the source kept
 *   (203 in Muslim, a few in the other books). Their «n» are never reused.
 * - Cleans the forties' web markup: «<br>» becomes a line break, and the
 *   Nawawi forty's bracketed repeat of the attribution is dropped (or
 *   unbracketed when the text does not already name who narrated it).
 *   Same rule as tidyHadithMarkup() in src/lib/hadithText.ts.
 * - Gives each of the two forties' hadiths its title («ti»).
 * - Updates the counts and the Muwatta's description in index.json.
 * - refsOf() gives each entry's printed-number ref, the same rule as
 *   hadithRefs() in src/data/hadithNumbers.ts; hadith-bundle-v2.mjs writes
 *   it into the search text (tests/hadithBundle.test.ts checks the two
 *   agree on every entry).
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
/** The books (source of truth, not shipped as is) and the shipped index. */
const DIR = join(ROOT, "data/hadith");
const PUBLIC = join(ROOT, "public/data/hadith");
const BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];

export const MUWATTA_DESCRIPTION = "أقدم ما وصلنا من كتب السنة المصنَّفة، للإمام مالك بن أنس";

/** The titles the Nawawi forty is known by, in its order. */
const NAWAWI_TITLES = [
  "إنما الأعمال بالنيات",
  "حديث جبريل: الإسلام والإيمان والإحسان",
  "بُني الإسلام على خمس",
  "مراحل خلق الإنسان وكتابة القدر",
  "من أحدث في أمرنا هذا ما ليس منه فهو رد",
  "الحلال بيّن والحرام بيّن",
  "الدين النصيحة",
  "أُمرت أن أقاتل الناس",
  "ما نهيتكم عنه فاجتنبوه",
  "إن الله طيب لا يقبل إلا طيبًا",
  "دع ما يريبك إلى ما لا يريبك",
  "من حسن إسلام المرء تركه ما لا يعنيه",
  "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه",
  "لا يحل دم امرئ مسلم إلا بإحدى ثلاث",
  "فليقل خيرًا أو ليصمت",
  "لا تغضب",
  "إن الله كتب الإحسان على كل شيء",
  "اتق الله حيثما كنت",
  "احفظ الله يحفظك",
  "إذا لم تستحِ فاصنع ما شئت",
  "قل آمنت بالله ثم استقم",
  "أرأيت إذا صليت المكتوبات",
  "الطهور شطر الإيمان",
  "يا عبادي إني حرمت الظلم على نفسي",
  "ذهب أهل الدثور بالأجور",
  "كل سُلامى من الناس عليه صدقة",
  "البر حسن الخلق",
  "عليكم بسنتي وسنة الخلفاء الراشدين",
  "أخبرني بعمل يدخلني الجنة",
  "إن الله فرض فرائض فلا تضيعوها",
  "ازهد في الدنيا يحبك الله",
  "لا ضرر ولا ضرار",
  "البينة على المدعي واليمين على من أنكر",
  "من رأى منكم منكرًا فليغيره",
  "لا تحاسدوا ولا تباغضوا",
  "من نفّس عن مؤمن كربة",
  "إن الله كتب الحسنات والسيئات",
  "من عادى لي وليًّا فقد آذنته بالحرب",
  "إن الله تجاوز لي عن أمتي الخطأ والنسيان",
  "كن في الدنيا كأنك غريب أو عابر سبيل",
  "لا يؤمن أحدكم حتى يكون هواه تبعًا لما جئت به",
  "يا ابن آدم إنك ما دعوتني ورجوتني",
];

/** Titles for the Qudsi forty, each a phrase from the hadith itself. */
const QUDSI_TITLES = [
  "إن رحمتي تغلب غضبي",
  "كذّبني ابن آدم وشتمني",
  "أصبح من عبادي مؤمن بي وكافر",
  "يسبّ بنو آدم الدهر وأنا الدهر",
  "أنا أغنى الشركاء عن الشرك",
  "أول الناس يُقضى عليه يوم القيامة",
  "يعجب ربك من راعي غنم",
  "قسمت الصلاة بيني وبين عبدي",
  "أول ما يحاسب به العبد صلاته",
  "الصوم لي وأنا أجزي به",
  "أنفق يا ابن آدم أُنفق عليك",
  "نحن أحق بذلك منك، تجاوزوا عنه",
  "اتقوا النار ولو بشق تمرة",
  "ملائكة سيّارة يتتبعون مجالس الذكر",
  "أنا عند ظن عبدي بي",
  "إن الله كتب الحسنات والسيئات",
  "يا عبادي إني حرمت الظلم على نفسي",
  "مرضت فلم تعدني",
  "الكبرياء ردائي والعظمة إزاري",
  "تُفتح أبواب الجنة يوم الاثنين والخميس",
  "ثلاثة أنا خصمهم يوم القيامة",
  "لا يحقر أحدكم نفسه",
  "أين المتحابون بجلالي",
  "إذا أحب الله عبدًا دعا جبريل",
  "من عادى لي وليًّا فقد آذنته بالحرب",
  "إن أغبط أوليائي عندي",
  "أرواح الشهداء في جوف طير خضر",
  "بادرني عبدي بنفسه",
  "ما لعبدي المؤمن عندي جزاء إلا الجنة",
  "إذا أحب عبدي لقائي أحببت لقاءه",
  "من ذا الذي يتألّى عليّ",
  "أسرف رجل على نفسه",
  "أذنب عبد ذنبًا",
  "يا ابن آدم إنك ما دعوتني ورجوتني",
  "يتنزّل ربنا كل ليلة إلى سماء الدنيا",
  "يجتمع المؤمنون يوم القيامة",
  "أعددت لعبادي الصالحين ما لا عين رأت",
  "حُفّت الجنة بالمكاره",
  "احتجّت الجنة والنار",
  "أُحلّ عليكم رضواني",
];

const LINE_BREAK = /<br\s*\/?>/i;
const HARAKAT = /[ؐ-ًؚ-ٰٟ]/g;

export function tidyMarkup(text) {
  if (!text.includes("<")) return text;
  const [head = "", ...tails] = text.split(LINE_BREAK);
  const lines = [head.trim()];
  for (const tail of tails) {
    let line = tail.trim().replace(/^[.:،]\s*/, "");
    if (!line) continue;
    if (line.startsWith("[")) {
      if (lines.join(" ").replace(HARAKAT, "").includes("رواه")) continue;
      line = line.replace(/\]\s*،?\s*\[/g, " ").replace(/[[\]]/g, "").trim();
    }
    lines.push(line);
  }
  // Any other markup: drop the angle brackets themselves (no tag is ever kept).
  return lines.join("\n").replace(/[<>]/g, "");
}

/**
 * The Nawawi forty also wraps its attributions in brackets inline
 * («… دِينَكُمْ . [رَوَاهُ مُسْلِمٌ]»): unbracket them, put a closing
 * attribution on its own line, and drop empty «[رقم:]» marks.
 */
export function tidyAttribution(text) {
  return text
    .replace(/\[(رَوَاهُ[^\]]*)\]\s*،\s*\[(وَ[^\]]*)\]/g, "$1 $2")
    .replace(/\[(رَوَاهُ[^\]]*)\]/g, "$1")
    .replace(/\s*\[رقم:\s*\]/g, "")
    .replace(/([.؟?"]) *(رَوَاهُ [^\n]*)$/, "$1\n$2");
}

export function refsOf(hadiths) {
  const printed = hadiths.some((h) => typeof h.a === "string");
  let inIntro = printed;
  let intro = 0;
  let prevKey = null;
  const keys = [];
  for (const h of hadiths) {
    if (inIntro && typeof h.a === "string") inIntro = false;
    if (inIntro) {
      keys.push(null);
      continue;
    }
    const key = printed && typeof h.a === "number" && prevKey ? prevKey : String(h.a).split(".")[0];
    keys.push(key);
    prevKey = key;
  }
  const size = new Map();
  for (const k of keys) if (k) size.set(k, (size.get(k) ?? 0) + 1);
  const seen = new Map();
  return keys.map((k) => {
    if (!k) return `i${++intro}`;
    if (size.get(k) < 2) return k;
    const i = (seen.get(k) ?? 0) + 1;
    seen.set(k, i);
    return `${k}/${i}`;
  });
}

function main() {
  const counts = {};
  for (const key of BOOKS) {
    const path = join(DIR, `${key}.json`);
    const pack = JSON.parse(readFileSync(path, "utf8"));
    const before = pack.hadiths.length;
    pack.hadiths = pack.hadiths.filter((h) => h.t.trim()).map((h) => ({ ...h, t: tidyMarkup(h.t) }));
    const titles = key === "nawawi" ? NAWAWI_TITLES : key === "qudsi" ? QUDSI_TITLES : null;
    if (titles) {
      if (titles.length !== pack.hadiths.length) throw new Error(`${key}: ${titles.length} titles for ${pack.hadiths.length} hadiths`);
      pack.hadiths = pack.hadiths.map((h, i) => ({ n: h.n, a: h.a, s: h.s, ti: titles[i], t: tidyAttribution(h.t), g: h.g }));
    }
    if (key === "malik") pack.description = MUWATTA_DESCRIPTION;
    pack.count = pack.hadiths.length;
    counts[key] = pack.count;
    writeFileSync(path, JSON.stringify(pack), "utf8");
    console.log(`${key}: ${before} → ${pack.count}`);
  }

  const indexPath = join(PUBLIC, "index.json");
  const books = JSON.parse(readFileSync(indexPath, "utf8")).map((b) => ({
    ...b,
    count: counts[b.key] ?? b.count,
    description: b.key === "malik" ? MUWATTA_DESCRIPTION : b.description,
  }));
  writeFileSync(indexPath, JSON.stringify(books, null, 2), "utf8");

  console.log("index.json updated; run hadith-bundle-v2.mjs and hadith-books.mjs next");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
