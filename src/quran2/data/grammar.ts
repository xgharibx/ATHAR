/**
 * «القرآن ٢» — the Quranic Arabic Corpus tags, in the terms of Arabic grammar.
 * Tag set: corpus.quran.com/documentation/tagset.jsp, with the additions of the
 * mustafa0x/quran-morphology edition (NV, ATT, DIST, ADDR, ACT_PCPL, PASS_PCPL).
 */

export type Q2Pos = "N" | "V" | "P";

/** Kinds of noun. */
const NOUN_KIND: Record<string, string> = {
  PN: "اسم علم",
  PRON: "ضمير",
  DEM: "اسم إشارة",
  REL: "اسم موصول",
  T: "ظرف زمان",
  LOC: "ظرف مكان",
  VN: "مصدر",
  ACT_PCPL: "اسم فاعل",
  PASS_PCPL: "اسم مفعول",
  NV: "اسم فعل",
  COND: "اسم شرط",
  INTG: "اسم استفهام",
};

/** Kinds of particle. */
const PARTICLE_KIND: Record<string, string> = {
  P: "حرف جر",
  CONJ: "حرف عطف",
  SUB: "حرف مصدري",
  ACC: "حرف نصب",
  NEG: "حرف نفي",
  EMPH: "لام التوكيد",
  REM: "حرف استئناف",
  RES: "أداة حصر",
  COND: "أداة شرط",
  INTG: "أداة استفهام",
  VOC: "حرف نداء",
  CERT: "حرف تحقيق",
  RSLT: "حرف واقع في جواب الشرط",
  PRO: "حرف نهي",
  PRP: "لام التعليل",
  CIRC: "واو الحال",
  PREV: "حرف كافّ",
  FUT: "حرف استقبال",
  AMD: "حرف استدراك",
  RET: "حرف إضراب",
  EXP: "أداة استثناء",
  CAUS: "حرف سببية",
  EXL: "حرف تفصيل",
  ANS: "حرف جواب",
  INC: "حرف ابتداء",
  INT: "حرف تفسير",
  EXH: "حرف تحضيض",
  SUR: "حرف فجاءة",
  AVR: "حرف ردع",
  INL: "حروف مقطّعة",
  EQ: "حرف تسوية",
  COM: "واو المعيّة",
  SUP: "حرف زائد",
  ATT: "حرف تنبيه",
  ADDR: "حرف خطاب",
  DIST: "لام البُعد",
  DET: "أداة التعريف",
  IMPV: "لام الأمر",
};

const VERB_TENSE: Record<string, string> = { PERF: "فعل ماضٍ", IMPF: "فعل مضارع", IMPV: "فعل أمر" };
const CASE: Record<string, string> = { NOM: "مرفوع", ACC: "منصوب", GEN: "مجرور" };
const MOOD: Record<string, string> = { "MOOD:IND": "مرفوع", "MOOD:SUBJ": "منصوب", "MOOD:JUS": "مجزوم" };
const FAMILY: Record<string, string> = { "FAM:كَان": "من أخوات «كان»", "FAM:إِنّ": "من أخوات «إنّ»", "FAM:كَاد": "من أخوات «كاد»" };
const FORMS = ["", "فَعَلَ", "فَعَّلَ", "فاعَلَ", "أَفْعَلَ", "تَفَعَّلَ", "تَفاعَلَ", "انْفَعَلَ", "افْتَعَلَ", "افْعَلَّ", "اسْتَفْعَلَ", "افْعالَّ", "افْعَوْعَلَ"];
const PERSON: Record<string, string> = { "1": "متكلم", "2": "مخاطب", "3": "غائب" };
const NUMBER: Record<string, string> = { S: "مفرد", D: "مثنى", P: "جمع" };
const GENDER: Record<string, string> = { M: "مذكر", F: "مؤنث" };

export type Q2SegmentInfo = {
  /** سابقة · الكلمة · لاحقة */
  role: string;
  kind: string;
  details: string[];
};

/** Person, number and gender codes: 3MS, 2MP, 1S, MS, FP, MD, D, M … */
function agreement(tag: string): string | null {
  const m = /^([123])?([MF])?([SDP])?$/.exec(tag);
  if (!m || !tag || (!m[1] && !m[2] && !m[3])) return null;
  return [m[1] && PERSON[m[1]], m[3] && NUMBER[m[3]], m[2] && GENDER[m[2]]].filter(Boolean).join(" ");
}

export function describeSegment(pos: Q2Pos, tags: string[]): Q2SegmentInfo {
  const role = tags.includes("PREF") ? "سابقة" : tags.includes("SUFF") ? "لاحقة" : "الكلمة";
  const details: string[] = [];
  let kind = pos === "N" ? "اسم" : pos === "V" ? "فعل" : "حرف";

  if (pos === "V") {
    const tense = tags.find((t) => VERB_TENSE[t]);
    if (tense) kind = VERB_TENSE[tense]!;
    if (tags.includes("PASS")) details.push("مبني للمجهول");
    const form = tags.find((t) => t.startsWith("VF:"));
    if (form) {
      const n = Number(form.slice(3));
      if (FORMS[n]) details.push(n === 1 ? "مجرّد (فَعَلَ)" : `مزيد على وزن ${FORMS[n]}`);
    }
    const mood = tags.find((t) => MOOD[t]);
    if (mood) details.push(MOOD[mood]!);
  } else if (pos === "N") {
    const special = tags.find((t) => NOUN_KIND[t]);
    if (special) kind = NOUN_KIND[special]!;
    if (tags.includes("ADJ")) details.push("صفة");
    const c = tags.find((t) => CASE[t]);
    if (c) details.push(CASE[c]!);
    if (tags.includes("INDEF")) details.push("نكرة");
    const form = tags.find((t) => t.startsWith("VF:"));
    if (form && FORMS[Number(form.slice(3))] && Number(form.slice(3)) > 1) details.push(`من وزن ${FORMS[Number(form.slice(3))]}`);
  } else {
    const special = tags.find((t) => PARTICLE_KIND[t] && t !== "IMPV");
    if (special) kind = PARTICLE_KIND[special]!;
  }

  const family = tags.find((t) => FAMILY[t]);
  if (family) details.push(FAMILY[family]!);
  for (const t of tags) {
    const a = agreement(t);
    if (a) details.push(a);
  }
  return { role, kind, details: [...new Set(details)] };
}
