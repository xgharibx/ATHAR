/**
 * Quran reciters — everyayah.com folders.
 *
 * Each entry now has a `category` so the picker can group them:
 *   - "murattal": Hafs reading at tartil speed
 *   - "mujawwad": Hafs reading with tajweed/maqamat
 *   - "legacy":   Older historic recordings
 */
export type ReciterCategory = "murattal" | "mujawwad" | "legacy";

export type Reciter = {
  id: string;
  label: string;
  category: ReciterCategory;
  /** Optional descriptive sub-label shown in the picker. */
  sub?: string;
};

export const QURAN_RECITERS: Reciter[] = [
  // ── Murattal (tartil, contemporary) ─────────────────────────────────
  { id: "Alafasy_128kbps",            label: "مشاري العفاسي",        category: "murattal", sub: "إمام الحرم المكي" },
  { id: "Hudhaify_128kbps",            label: "عبدالرحمن الحذيفي",     category: "murattal", sub: "إمام الحرم النبوي" },
  { id: "Abu_Bakr_Ash-Shaatree_128kbps", label: "أبو بكر الشاطري",      category: "murattal", sub: "إمام المسجد الحرام" },
  { id: "Nasser_Alqatami_128kbps",     label: "ناصر القطامي",         category: "murattal" },
  { id: "Yasser_Ad-Dussary_128kbps",   label: "ياسر الدوسري",         category: "murattal" },
  { id: "Maher_AlMuaiqly_128kbps",     label: "ماهر المعيقلي",        category: "murattal", sub: "جودة عالية" },
  { id: "Maher_AlMuaiqly_64kbps",      label: "ماهر المعيقلي",        category: "murattal" },
  { id: "Abdurrahmaan_As-Sudais_64kbps", label: "عبد الرحمن السديس",   category: "murattal", sub: "إمام الحرم المكي" },
  { id: "Saood_ash-Shuraym_64kbps",    label: "سعود الشريم",          category: "murattal", sub: "إمام الحرم المكي" },
  { id: "Muhammad_Ayyoub_128kbps",     label: "محمد أيوب",             category: "murattal" },
  { id: "Muhammad_Jibreel_128kbps",    label: "محمد جبريل",            category: "murattal" },
  { id: "Hani_Rifai_192kbps",          label: "هاني الرفاعي",          category: "murattal" },
  { id: "Ghamadi_40kbps",              label: "سعد الغامدي",          category: "murattal" },
  { id: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net", label: "أحمد العجمي", category: "murattal" },
  { id: "Abdullah_Basfar_192kbps",     label: "عبدالله بصفر",          category: "murattal" },
  { id: "Minshawy_Murattal_128kbps",   label: "محمد المنشاوي (مرتل)",  category: "murattal" },
  { id: "Fares_Abbad_64kbps",          label: "فارس عباد",             category: "murattal" },
  { id: "Mohammad_al_Tablawi_128kbps", label: "محمد الطبلاوي",         category: "murattal", sub: "إمام مسجد الحسين" },

  // ── Mujawwad (tajweed-heavy) ────────────────────────────────────────
  { id: "Husary_128kbps",              label: "محمود الحصري",          category: "mujawwad", sub: "مجوّد" },
  { id: "Husary_Mujawwad_128kbps",     label: "محمود الحصري (مجوّد)",   category: "mujawwad" },
  { id: "Abdul_Basit_Murattal_192kbps", label: "عبد الباسط المرتل",     category: "mujawwad" },
  { id: "Abdul_Basit_Mujawwad_128kbps", label: "عبد الباسط (مجوّد)",    category: "mujawwad" },
  { id: "Minshawy_Mujawwad_192kbps",   label: "محمد المنشاوي (مجوّد)",   category: "mujawwad" },

  // ── Legacy / historic ──────────────────────────────────────────────
  { id: "AbdulSamad_64kbps",           label: "عبد الباسط عبد الصمد",   category: "legacy", sub: "قديم (١٩٦٠s)" },
  { id: "Khalefa_Taniji_48kbps",       label: "خليفة الطنيجي",          category: "legacy", sub: "قديم" },
  { id: "Sahl_Yasin_48kbps",           label: "سهل ياسين",              category: "legacy", sub: "قديم" },
  { id: "Ibrahim_Akhdar_32kbps",       label: "إبراهيم الأخضر",         category: "legacy", sub: "قديم" },
];

export const RECITER_CATEGORY_LABELS: Record<ReciterCategory, string> = {
  murattal: "المرتلون",
  mujawwad: "المجودون",
  legacy: "تسجيلات قديمة",
};

/** Filter + group reciters for a picker UI. Returns ordered map of
 *  category → ordered reciters in that category that match `query` (if any). */
export function groupReciters(query: string = ""): Array<{ category: ReciterCategory; items: Reciter[] }> {
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const q = norm(query);
  const filtered = q
    ? QURAN_RECITERS.filter((r) => norm(r.label).includes(q) || norm(r.id).includes(q) || (r.sub && norm(r.sub).includes(q)))
    : QURAN_RECITERS;
  const order: ReciterCategory[] = ["murattal", "mujawwad", "legacy"];
  return order
    .map((category) => ({
      category,
      items: filtered.filter((r) => r.category === category),
    }))
    .filter((g) => g.items.length > 0);
}

export function getReciter(id: string): Reciter | undefined {
  return QURAN_RECITERS.find((r) => r.id === id);
}