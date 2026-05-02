import { HADITHS } from "@/data/hadiths";
import type { IslamicLibraryDB, LibraryCollection, LibraryEntry, LibraryGrade } from "@/data/libraryTypes";

const DORAR_SEARCH_BASE = "https://dorar.net/hadith/search?q=";

function verifyUrl(query: string) {
  return `${DORAR_SEARCH_BASE}${encodeURIComponent(query)}`;
}

const HADITH_TAGS: Record<number, string[]> = {
  1: ["النية", "الإخلاص", "الأعمال"],
  2: ["النصيحة", "الدين", "الأمانة"],
  3: ["اللسان", "الصمت", "الإيمان"],
  4: ["الأخوة", "الإيمان", "سلامة الصدر"],
  5: ["المداومة", "العمل", "التدرج"],
  6: ["التوبة", "الرجوع", "الرحمة"],
  7: ["الطهارة", "الذكر", "الميزان"],
  8: ["المعروف", "البشاشة", "الأخلاق"],
  9: ["التقوى", "الحسنات", "الأخلاق"],
  10: ["حسن الخلق", "الإيمان", "الأسرة"],
  11: ["القرآن", "التعليم", "الخيرية"],
  12: ["القرآن", "الحسنات", "التلاوة"],
  13: ["الصدقة", "الأثر", "الزراعة"],
  14: ["العلم", "الصدقة الجارية", "الأثر"],
  15: ["الكلمة الطيبة", "الصدقة", "اللسان"],
  16: ["تفريج الكرب", "الرحمة", "الإحسان"],
  17: ["الابتسامة", "الصدقة", "القلوب"],
  18: ["الصلاة", "الفجر", "الأمان"],
  19: ["الوضوء", "المساجد", "الدرجات"],
  20: ["الذكر", "التسبيح", "المغفرة"],
  21: ["اللسان", "المحاسبة", "الخطر"],
  22: ["الصلاة", "رمضان", "المغفرة"],
  23: ["الحج", "المغفرة", "الشعائر"],
  24: ["الكبر", "القلب", "التواضع"],
  25: ["الظن", "العلاقات", "الأخلاق"],
  26: ["الغضب", "الصبر", "القوة"],
  27: ["الدعاء", "الهم", "الاستعاذة"],
  28: ["العلم", "الجنة", "الطلب"],
  29: ["المساجد", "الأسواق", "المحبة"],
  30: ["بر الوالدين", "الصلاة", "الأعمال"],
  31: ["لقاء الله", "الشوق", "الآخرة"],
  32: ["الصبر", "الشكر", "المؤمن"],
  33: ["الصيام", "المحرم", "التطوع"],
  34: ["الأسرة", "الرحمة", "حسن العشرة"],
  35: ["الصدقة", "البركة", "اليقين"],
  36: ["الظلم", "الدعاء", "العدل"],
  37: ["الغضب", "الحلم", "الجنة"],
  38: ["الإتقان", "العمل", "الأمانة"],
  39: ["العفو", "الصلة", "الإحسان"],
  40: ["الرفق", "الرحمة", "الأخلاق"],
  41: ["الدنيا", "الآخرة", "الزهد"],
  42: ["الغربة", "الاستعداد", "الآخرة"],
  43: ["الشكر", "العافية", "الأمان"],
  44: ["القلب", "الإخلاص", "العمل"],
  45: ["الفقه", "العلم", "الخيرية"],
  46: ["الجنة", "النار", "المجاهدة"],
  47: ["الصاحب", "الصحبة", "الإحسان"],
  48: ["الآخرة", "الدنيا", "النية"],
  49: ["محبة الله", "القبول", "الإيمان"],
  50: ["حسن الخلق", "الميزان", "الآخرة"],
};

const HADITH_CHAPTERS: Record<number, string> = {
  1: "intentions", 2: "adab", 3: "adab", 4: "adab", 5: "worship", 6: "heart", 7: "worship", 8: "adab", 9: "adab", 10: "family",
  11: "quran", 12: "quran", 13: "impact", 14: "impact", 15: "adab", 16: "impact", 17: "adab", 18: "salah", 19: "salah", 20: "dhikr",
  21: "adab", 22: "salah", 23: "worship", 24: "heart", 25: "adab", 26: "heart", 27: "dua", 28: "knowledge", 29: "salah", 30: "family",
  31: "heart", 32: "heart", 33: "worship", 34: "family", 35: "impact", 36: "adab", 37: "heart", 38: "impact", 39: "adab", 40: "adab",
  41: "heart", 42: "heart", 43: "heart", 44: "intentions", 45: "knowledge", 46: "heart", 47: "adab", 48: "intentions", 49: "heart", 50: "adab",
};

function gradeFromSource(source: string): LibraryGrade {
  if (source.includes("متفق")) return "agreed";
  if (source.includes("مسلم") || source.includes("البخاري")) return "sahih";
  if (source.includes("الترمذي")) return "hasan";
  return "curated";
}

function benefitForHadith(id: number): string[] {
  const tags = HADITH_TAGS[id] ?? ["الإيمان", "العمل"];
  return [
    `يربط هذا النص باب ${tags[0]} بالسلوك اليومي، فلا يبقى العلم معلومة بعيدة عن العمل.`,
    tags[1] ? `يمكن جعله معياراً سريعاً لمحاسبة النفس في باب ${tags[1]}.` : "يصلح أن يكون تذكرة يومية قصيرة قبل العمل.",
  ];
}

function toHadithEntry(hadithId: number, collectionId: string, entryIdPrefix: string): LibraryEntry {
  const hadith = HADITHS.find((item) => item.id === hadithId)!;
  const tags = HADITH_TAGS[hadith.id] ?? ["حديث", "تربية"];
  return {
    id: `${entryIdPrefix}_${hadith.id}`,
    collectionId,
    chapterId: HADITH_CHAPTERS[hadith.id] ?? "general",
    kind: "hadith",
    title: tags[0] ?? "حديث",
    arabic: hadith.arabic,
    narrator: hadith.narrator,
    source: {
      title: hadith.source,
      reference: "",
      verificationUrl: verifyUrl(hadith.arabic.slice(0, 70)),
    },
    grade: gradeFromSource(hadith.source),
    tags,
    benefits: benefitForHadith(hadith.id),
    explanation: "مختصر تربوي داخل التطبيق، مكتوب بصياغة خاصة لمساعدة القارئ على تحويل النص إلى عمل.",
    verificationQuery: hadith.arabic.slice(0, 70),
  };
}

const CHAPTERS = [
  { id: "intentions", title: "النية والإخلاص", description: "تصحيح الوجهة قبل العمل" },
  { id: "heart", title: "أعمال القلوب", description: "الخوف والرجاء والصبر والشكر" },
  { id: "adab", title: "الآداب والأخلاق", description: "اللسان، الصحبة، الرحمة، وحسن المعاملة" },
  { id: "worship", title: "العبادة والطاعات", description: "أبواب عملية للثبات اليومي" },
  { id: "salah", title: "الصلاة والطهارة", description: "حفظ الصلاة وما يتصل بها" },
  { id: "quran", title: "القرآن", description: "تعلم القرآن وتلاوته وتعظيمه" },
  { id: "knowledge", title: "العلم والفقه", description: "فضل العلم والتفقه في الدين" },
  { id: "family", title: "الأسرة والوالدان", description: "بر وصلة وحسن عشرة" },
  { id: "impact", title: "الأثر والصدقة", description: "أبواب الخير المتعدي" },
  { id: "dhikr", title: "الذكر", description: "الأذكار الجامعة وأثرها" },
  { id: "dua", title: "الدعاء", description: "أدعية نبوية جامعة" },
  { id: "general", title: "متفرقات", description: "فوائد عامة" },
];

const coreHadithIds = [1, 2, 3, 4, 5, 6, 9, 11, 14, 16, 28, 32, 44, 45, 50];
const muslimHadithIds = HADITHS.filter((item) => item.source.includes("مسلم")).map((item) => item.id).slice(0, 18);
const adabHadithIds = [3, 4, 8, 9, 10, 15, 17, 21, 24, 25, 26, 34, 36, 37, 39, 40, 47, 50];

const guideEntries: LibraryEntry[] = [
  {
    id: "guide_verify_sources",
    collectionId: "reader_guides",
    chapterId: "general",
    kind: "guide",
    title: "كيف تتثبت من الحديث؟",
    arabic: "ابدأ بالنظر إلى المصدر، ثم درجة الحديث، ثم موضعه في كتب السنة، ولا تبنِ حكماً عملياً على نص لم تعرف درجته أو لم تسأل عنه أهل العلم.",
    narrator: "",
    source: { title: "إرشاد داخل التطبيق", reference: "", verificationUrl: "https://dorar.net/hadith" },
    grade: "curated",
    tags: ["التثبت", "الحديث", "المنهج"],
    benefits: ["يعين القارئ على التفريق بين القراءة التعبدية وبين الاستدلال العلمي.", "يفتح باب المراجعة عبر مصادر الحديث الموثوقة دون إخراج تجربة القراءة من التطبيق."],
    explanation: "هذا الدليل ليس حكماً على حديث بعينه، بل طريقة قراءة مسؤولة داخل المكتبة.",
    verificationQuery: "",
  },
  {
    id: "guide_reading_plan",
    collectionId: "reader_guides",
    chapterId: "knowledge",
    kind: "guide",
    title: "خطة قراءة قصيرة",
    arabic: "اقرأ حديثاً واحداً، واستخرج منه عملاً واحداً، ثم اربطه بوقت محدد من يومك؛ فالعلم النافع يبدأ صغيراً ويثبت بالمداومة.",
    narrator: "",
    source: { title: "إرشاد داخل التطبيق", reference: "", verificationUrl: "" },
    grade: "curated",
    tags: ["طلب العلم", "المداومة", "العمل"],
    benefits: ["تمنع تراكم القراءة بلا أثر.", "تجعل المكتبة رفيقاً عملياً لا مجرد أرشيف."],
    explanation: "صيغت هذه الفقرة لتنسجم مع روح التطبيق: ذكر، قرآن، أثر يومي، ثم عادة ثابتة.",
    verificationQuery: "",
  },
  {
    id: "guide_adab_before_search",
    collectionId: "reader_guides",
    chapterId: "adab",
    kind: "guide",
    title: "أدب البحث في المسائل",
    arabic: "إذا بحثت عن مسألة فاجمع بين الدليل وفهم أهل العلم، واحذر أن تجعل أول نتيجة تراها هي آخر ما تعتمد عليه.",
    narrator: "",
    source: { title: "إرشاد داخل التطبيق", reference: "", verificationUrl: "" },
    grade: "curated",
    tags: ["البحث", "العلم", "الأدب"],
    benefits: ["يربي على التثبت قبل المشاركة.", "يناسب قارئ الهاتف الذي ينتقل بسرعة بين النتائج."],
    explanation: "المكتبة تعطيك مدخلاً منظماً، أما الفتوى والتنزيل فمرجعها أهل العلم.",
    verificationQuery: "",
  },
  {
    id: "guide_family_action",
    collectionId: "reader_guides",
    chapterId: "family",
    kind: "benefit",
    title: "حوّل حديث الأسرة إلى فعل",
    arabic: "اختر من كل نص متعلق بالأهل عملاً صغيراً: كلمة طيبة، سؤال، خدمة، أو عفو؛ ثم اجعله عادة أسبوعية لا خاطرة عابرة.",
    narrator: "",
    source: { title: "إرشاد داخل التطبيق", reference: "", verificationUrl: "" },
    grade: "curated",
    tags: ["الأسرة", "الصلة", "الأثر"],
    benefits: ["يقرب النصوص من الحياة اليومية.", "يجعل القراءة سبباً لتحسين العلاقة لا مجرد إعجاب عابر."],
    explanation: "هذه فائدة تطبيقية مبنية على معاني الأحاديث العامة في البر وحسن الخلق.",
    verificationQuery: "",
  },
  {
    id: "guide_heart_check",
    collectionId: "reader_guides",
    chapterId: "heart",
    kind: "benefit",
    title: "مراجعة القلب",
    arabic: "قبل النوم اسأل نفسك: ما العمل الذي أصلحت فيه النية اليوم؟ وما الكلمة التي كان ينبغي أن تُترك؟ وما الباب الذي أحتاج فيه إلى توبة؟",
    narrator: "",
    source: { title: "إرشاد داخل التطبيق", reference: "", verificationUrl: "" },
    grade: "curated",
    tags: ["محاسبة النفس", "التوبة", "النية"],
    benefits: ["يجمع بين أبواب النية واللسان والتوبة.", "يناسب مراجعة يومية قصيرة داخل التطبيق."],
    explanation: "ليست ورداً مخصوصاً، بل أداة محاسبة مستفادة من مقاصد النصوص.",
    verificationQuery: "",
  },
  {
    id: "guide_quran_link",
    collectionId: "reader_guides",
    chapterId: "quran",
    kind: "guide",
    title: "اربط الحديث بالقرآن",
    arabic: "إذا قرأت حديثاً في الرحمة أو الصبر أو التقوى، فافتح آية قريبة من المعنى؛ هكذا تتكامل المكتبة مع المصحف داخل التطبيق.",
    narrator: "",
    source: { title: "إرشاد داخل التطبيق", reference: "", verificationUrl: "" },
    grade: "curated",
    tags: ["القرآن", "التدبر", "الربط"],
    benefits: ["يدعم القراءة الموضوعية.", "يجعل المكتبة بوابة للمصحف لا بديلاً عنه."],
    explanation: "هذا ينسجم مع بنية التطبيق التي تجعل القرآن والذكر والمكتبة في تجربة واحدة.",
    verificationQuery: "",
  },
];

function collection(id: string, title: string, subtitle: string, description: string, icon: string, accent: string, entryIds: number[], prefix: string): LibraryCollection {
  return {
    id,
    title,
    subtitle,
    description,
    icon,
    accent,
    sourceNote: "نصوص مختارة داخل التطبيق مع روابط تحقق اختيارية إلى الدرر عند توفرها. ليست نسخة من قاعدة الدرر.",
    chapters: CHAPTERS,
    entries: entryIds.map((hadithId) => toHadithEntry(hadithId, id, prefix)),
  };
}

export const ISLAMIC_LIBRARY_DB: IslamicLibraryDB = {
  version: 1,
  sourcePolicy: "محتوى المكتبة مخزن داخل التطبيق ومختار بعناية من نصوص مشهورة ومصادر عامة. روابط الدرر اختيارية للتحقق فقط وليست مصدراً تشغيلياً للمكتبة.",
  collections: [
    collection(
      "nawawi_core",
      "الجوامع النبوية",
      "أحاديث قصيرة تبني اليوم",
      "مختارات جامعة تصلح للحفظ والعمل والمراجعة اليومية.",
      "📚",
      "#22c55e",
      coreHadithIds,
      "core"
    ),
    collection(
      "sahih_muslim_selected",
      "مختارات من صحيح مسلم",
      "أحاديث صحيحة بروح عملية",
      "مجموعة مركزة من الأحاديث التي يظهر فيها أثر العبادة، الخلق، والعلم.",
      "🕌",
      "#06b6d4",
      muslimHadithIds,
      "muslim"
    ),
    collection(
      "adab_raqaiq",
      "الآداب والرقائق",
      "قلب، لسان، وصحبة",
      "نصوص تربوية تساعد على تهذيب اللسان، علاج الغضب، وإصلاح العلاقات.",
      "🌿",
      "#a3e635",
      adabHadithIds,
      "adab"
    ),
    {
      id: "reader_guides",
      title: "دليل القارئ",
      subtitle: "كيف تقرأ وتعمل؟",
      description: "فوائد قصيرة مكتوبة للتطبيق تساعدك على التثبت، ترتيب القراءة، وتحويل النص إلى أثر.",
      icon: "✨",
      accent: "#f59e0b",
      sourceNote: "فوائد تحريرية داخل التطبيق وليست نقلاً من موقع خارجي.",
      chapters: CHAPTERS,
      entries: guideEntries,
    },
  ],
};
