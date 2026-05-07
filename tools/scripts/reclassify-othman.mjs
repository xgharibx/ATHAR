/**
 * reclassify-othman.mjs
 * Quick pass: re-classify all عثمان الخميس videos with fixed keyword map
 * and rebuild his topic buckets. Does NOT re-fetch any videos.
 * Run: node tools/scripts/reclassify-othman.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");
const CH_ID = "othman-alkamees";

// ─── Fixed keyword map (no over-broad biography triggers) ─────────────────────

const KEYWORD_MAP = [
  // Refutations / anti-innovation — very specific to this channel
  ["anti-innovation", [
    "رافضة","شيعة","الشيعة","صفوي","الصفوية",
    "أهل البيت والأصحاب",
    "ناصبي","خوارج","معتزلة","أشاعرة","صوفي","صوفية",
    "بدعة","البدع","ابتداع","محدثات",
    "الرد على","نقد الشبهات","دحض","تفنيد","مناظرة",
    "الغلو","القبور","التبرك","الاستغاثة بغير الله",
  ]],

  // Aqeedah
  ["aqeedah", [
    "عقيدة","توحيد","الأسماء والصفات","صفات الله","أسماء الله",
    "الإيمان بالله","القدر","القضاء والقدر","اعتقاد",
    "أصول الإيمان","التوحيد","تجسيم","تأويل الصفات",
    "أهل السنة والجماعة","الفرقة الناجية",
    "الولاء والبراء","التكفير","الإرجاء",
    "قواعد في التوحيد","الأسماء الحسنى",
    "التكليف","سقوط التكليف","نواقض الإسلام",
    "الإيمان يزيد","العقائد",
    "علامات الإيمان","قوة الإيمان","ضعف الإيمان",
    "نصرة الله","أتباع الرسل","توكل على الله",
  ]],

  // Fiqh — dominant topic on his channel
  ["fiqh", [
    "فقه","أحكام","حكم","فتوى","فتاوى","حلال","حرام",
    "هل يجوز","هل يصح","ما حكم","متى يحق","يجوز للعبد",
    "صلاة","وضوء","طهارة","نجاسة","تيمم",
    "صيام","صوم","رمضان","اعتكاف",
    "زكاة","نصاب","زكاة الفطر",
    "حج","عمرة","مناسك","إحرام","طواف","سعي",
    "نكاح","مهر","عقد الزواج","طلاق","خلع","عدة",
    "بيع","شراء","ربا","معاملات","إجارة","وقف","هبة","لقطة","رهن","وكالة","وصايا","عتق",
    "دليل الطالب","منهج السالكين","عمدة الطالب",
    "كتاب الصلاة","كتاب الصيام","كتاب الزكاة","كتاب الحج",
    "كتاب البيوع","كتاب النكاح","كتاب الطلاق",
    "كتاب العتق","كتاب الوصايا","كتاب اللقطة","كتاب الرهن",
    "كتاب الوكالة","أسئلة تهم كل صائم","فقه الحج",
    "صفة وضوء النبي","صفة الحج",
    // Q&A fiqh patterns
    "النذر","نذر","أولياء الدم","القصاص","الدية","القاضي","الحدود",
    "التعزير","الوقف","دفن","الجنازة","المسجد","الصفح",
    "شروط صحة","مسح على الخف","خفين","مسح على",
    "عروض تجارة","زكاة عروض","الأغنام","الإبل","الماشية",
    "التجارة","العروض",
  ]],

  // Hadith sciences — second signature topic
  ["hadith", [
    "مصطلح الحديث","علوم الحديث","شرح مصطلح",
    "صحيح البخاري","صحيح مسلم","مختصر صحيح",
    "مجالس سماع","سماع الحديث",
    "جرح","تعديل","إسناد","رجال الحديث",
    "ضعيف","موضوع","تصحيح وتضعيف","درجة الحديث",
    "الأربعين النووية","شرح الحديث",
  ]],

  // Tafseer — covers his dominant video format "تفسير قوله تعالى: ..."
  ["tafseer", [
    "تفسير سورة","شرح سورة","تفسير قوله تعالى","في قوله تعالى",
    "معنى قوله تعالى","شرح قوله تعالى","تفسير الآية",
    "قوله تعالى:","﴿","عند نزول قوله","نزول الآية",
    "سورة النحل","سورة الفاتحة","سورة المائدة",
    "سورة البينة","سورة القدر","سورة الشرح",
    "سورة التين","سورة الفيل","سورة العلق",
    "سورة البلد","سورة الشمس","سورة الليل",
    "تدبر القرآن","تأمل الآيات","مفاتح الطلب",
    "آيات الأحكام","الحروف المقطعة","السبع المثاني",
    "موسوعة التفسير","علوم التفسير",
    "بلدة طيبة","وأنذر عشيرتك",
    // Quranic stories classification
    "أصحاب الأيكة","أصحاب الحجر","سبب تسمية","المراد بالسبع",
    "تسمية العقل حجرا","قوم لوط","قوم عاد","قوم ثمود",
    "الأمم السابقة","إهلاك الأمم","ديار قوم",
    "عليه السلام آية","موسى عليه السلام في","صالح عليه السلام",
    "المقصود ب","المعاني التي يحتملها","معاني قول",
  ]],

  // Quran
  ["quran", [
    "علوم القرآن","تلاوة","تجويد","حفظ القرآن",
    "تحفيظ","ختمة","وقف وابتداء",
  ]],

  // Seerah (Prophet's biography)
  ["seerah", [
    "السيرة النبوية","سيرة النبي ﷺ","سيرة المصطفى",
    "غزوة بدر","غزوة أحد","غزوة الخندق","فتح مكة","غزوة تبوك",
    "المغازي","الهجرة النبوية","ولادة النبي","وفاة النبي",
    "الإسراء والمعراج",
    "العهد المكي","العهد المدني","مراحل الدعوة في مكة",
    "الصحابة النبيَّ","سأل النبي",
  ]],

  // Biographies — requires SPECIFIC proper nouns
  ["biography", [
    "الصديقة أم المؤمنين","أم المؤمنين عائشة",
    "أبو بكر الصديق","عمر بن الخطاب","عثمان بن عفان","علي بن أبي طالب",
    "دورة آل البيت والأصحاب",
    "ترجمة ","تراجم العلماء",
    "ابن تيمية","ابن القيم","ابن كثير","ابن حجر","ابن عثيمين",
    "قصص الأنبياء","نبي الله موسى","نبي الله إبراهيم","نبي الله عيسى",
    // Stories of scholars/Sahaba
    "قصة في فراسة","قصة تظهر فراسة","فراسة عمر",
    "قصة في كرم","قصة في شجاعة","قصة في علم",
    "الشافعي والشيباني","جرير البجلي",
  ]],

  // Tazkiyah — covers his Q&A on spiritual matters
  ["tazkiyah", [
    "تزكية النفس","أمراض القلوب","علاج القلوب",
    "التوبة","التوبة والإنابة","تاب إلى الله","الإخلاص لله","التقوى",
    "الزهد","الورع","الخشوع في الصلاة",
    "الغيبة والنميمة","الحسد","الكبر","الرياء",
    "ضيق الصدر","انشراح الصدر","ثبات القلب",
    "التسبيح","الذكر والدعاء","الصبر والاحتساب",
    "التلذذ بالعبادة","محبة الله","خشية الله",
    "الاعتداء في الدعاء","صور الاعتداء",
    "الأمور المعينة","أسباب ضيق",
    "شروط صحة التوبة","من تاب إلى الله",
  ]],

  // Aqeedah extras — cover theological Q&A he often does — merged into aqeedah above

  // Family
  ["family", [
    "تربية الأبناء","تربية الأولاد","حقوق الزوجة",
    "العلاقة الزوجية","الأسرة المسلمة","تربية البنات",
    "الأمومة","الأبوة","بناء الأسرة",
  ]],

  // Daawah / lectures
  ["daawah", [
    "الدعوة إلى الله","الدعاة إلى الله","خطبة الجمعة","خطب الجمعة",
    "محاضرة عامة","نصيحة للمسلمين","موعظة",
    "اصدع بالحق","الداعية","مراحل الدعوة",
  ]],
];

function classify(title, playlistContext = "") {
  // Strip Arabic diacritics (tashkeel) so "نَذَرَتْ" matches "نذر"
  const normalize = (s) => s.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, "");
  const text = normalize(title + " " + playlistContext).toLowerCase();
  const scores = {};
  for (const [topic, words] of KEYWORD_MAP) {
    let score = 0;
    for (const w of words) {
      if (text.includes(w.toLowerCase())) score += w.length > 7 ? 5 : w.length > 4 ? 3 : 1;
    }
    if (score > 0) scores[topic] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return ["general"];
  return sorted.slice(0, 3).map(([t]) => t);
}

const TOPIC_COURSES = [
  { suffix: "topic-anti-innovation", topicId: "anti-innovation", title: "الردود والعقيدة — عثمان الخميس", order: 1010 },
  { suffix: "topic-aqeedah",         topicId: "aqeedah",         title: "العقيدة — عثمان الخميس",           order: 1020 },
  { suffix: "topic-fiqh",            topicId: "fiqh",            title: "الفقه — عثمان الخميس",             order: 1030 },
  { suffix: "topic-hadith",          topicId: "hadith",          title: "الحديث — عثمان الخميس",            order: 1040 },
  { suffix: "topic-tafseer",         topicId: "tafseer",         title: "التفسير — عثمان الخميس",           order: 1050 },
  { suffix: "topic-quran",           topicId: "quran",           title: "القرآن — عثمان الخميس",            order: 1060 },
  { suffix: "topic-seerah",          topicId: "seerah",          title: "السيرة النبوية — عثمان الخميس",    order: 1070 },
  { suffix: "topic-biography",       topicId: "biography",       title: "تراجم — عثمان الخميس",             order: 1080 },
  { suffix: "topic-tazkiyah",        topicId: "tazkiyah",        title: "التزكية — عثمان الخميس",           order: 1090 },
  { suffix: "topic-family",          topicId: "family",          title: "الأسرة — عثمان الخميس",            order: 1100 },
  { suffix: "topic-daawah",          topicId: "daawah",          title: "الدعوة — عثمان الخميس",            order: 1110 },
];

async function main() {
  console.log("🏷  Re-classifying عثمان الخميس with fixed keyword map…\n");
  const db = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  const videosMap = new Map(db.videos.map((v) => [v.id, v]));
  const coursesMap = new Map(db.courses.map((c) => [c.id, c]));

  // Build video → real playlist context map
  const videoPlTitles = new Map();
  for (const c of db.courses) {
    if (c.channelId !== CH_ID || c.isGenerated || c.isUploads) continue;
    for (const vid of (c.videoIds || [])) {
      if (!videoPlTitles.has(vid)) videoPlTitles.set(vid, []);
      videoPlTitles.get(vid).push(c.title);
    }
  }
  for (const v of videosMap.values()) {
    if (v.channelId !== CH_ID) continue;
    for (const cid of (v.courseIds || [])) {
      const c = coursesMap.get(cid);
      if (c && !c.isGenerated && !c.isUploads) {
        if (!videoPlTitles.has(v.id)) videoPlTitles.set(v.id, []);
        videoPlTitles.get(v.id).push(c.title);
      }
    }
  }

  // Re-classify all channel videos
  let changed = 0;
  const chVideos = db.videos.filter(v => v.channelId === CH_ID);
  for (const v of chVideos) {
    const plContext = (videoPlTitles.get(v.id) || []).join(" ");
    const newTopics = classify(v.title, plContext);
    if (JSON.stringify(newTopics) !== JSON.stringify(v.topicIds)) { v.topicIds = newTopics; changed++; }
  }
  console.log(`✓ Re-classified ${changed} / ${chVideos.length} videos`);

  // Remove old topic-bucket courseIds from all channel videos, then rebuild
  const allBucketIds = new Set(TOPIC_COURSES.map(tc => `${CH_ID}-${tc.suffix}`));
  for (const v of chVideos) {
    v.courseIds = (v.courseIds || []).filter(cid => !allBucketIds.has(cid));
  }

  // Rebuild topic buckets
  console.log("\n📁 Rebuilding topic buckets:");
  for (const tc of TOPIC_COURSES) {
    const courseId = `${CH_ID}-${tc.suffix}`;
    const matching = chVideos.filter(v => v.topicIds.includes(tc.topicId));
    for (const v of matching) v.courseIds.push(courseId);
    const videoIds = matching.map(v => v.id);

    const course = {
      id: courseId, channelId: CH_ID, title: tc.title,
      description: `${videoIds.length} فيديو مصنف ضمن موضوع ${tc.title.split(" — ")[0]}`,
      topicIds: [tc.topicId], videoIds,
      thumbnail: videosMap.get(videoIds[0])?.thumbnail || null,
      order: tc.order, isGenerated: true,
    };

    const idx = db.courses.findIndex(c => c.id === courseId);
    if (idx !== -1) db.courses[idx] = course;
    else db.courses.push(course);
    console.log(`  ✓ ${tc.title}: ${videoIds.length}`);
  }

  // Remove any stale generated courses not in TOPIC_COURSES
  const stale = db.courses.filter(c => c.channelId === CH_ID && c.isGenerated && !allBucketIds.has(c.id)).map(c => c.id);
  if (stale.length) {
    console.log(`\n🗑  Removing stale buckets: ${stale.join(", ")}`);
    db.courses = db.courses.filter(c => !stale.includes(c.id));
    for (const v of chVideos) v.courseIds = v.courseIds.filter(cid => !stale.includes(cid));
  }

  // Sample check — show 10 videos per unclassified (general) to see what's uncovered
  const general = chVideos.filter(v => v.topicIds[0] === "general");
  console.log(`\nℹ️  Unclassified (general): ${general.length} videos`);
  if (general.length > 0) general.slice(0, 10).forEach(v => console.log(`   - ${v.title.slice(0, 70)}`));

  db.syncedAt = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log(`\n✅  Written: ${OUT_FILE}`);
  console.log(`   Total DB: ${db.videos.length} videos | ${db.courses.length} courses`);
}

main().catch(e => { console.error(e); process.exit(1); });
