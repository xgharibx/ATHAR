/**
 * Dua catalog for the Sebha "دعاء" tab.
 * Each dua can be set as the active counter item; if `count` is provided,
 * tapping counts toward that target. `transliteration` is shown as a hint.
 */
export type Dua = {
  id: string;
  name: string;
  arabic: string;
  transliteration?: string;
  category: string;
  count?: number;
};

export const DUA_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "morning", label: "أدعية الصباح" },
  { id: "evening", label: "أدعية المساء" },
  { id: "general", label: "أدعية عامة" },
  { id: "forgiveness", label: "الاستغفار" },
  { id: "sleep", label: "أدعية النوم" },
  { id: "after_prayer", label: "بعد الصلاة" },
];

export const DUAS: Dua[] = [
  {
    id: "dua_istighfar",
    name: "الاستغفار",
    arabic: "أَسْتَغْفِرُ اللهَ الْعَظِيمَ",
    transliteration: "Astaghfirullah al-'Adheem",
    category: "forgiveness",
    count: 100,
  },
  {
    id: "dua_tahleel",
    name: "التهليل",
    arabic: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَه",
    transliteration: "La ilaha illallahu wahdahu la shareeka lah",
    category: "general",
    count: 100,
  },
  {
    id: "dua_salawat",
    name: "الصلاة على النبي",
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّد",
    transliteration: "Allahumma salli wa sallim 'ala Nabiyyina Muhammad",
    category: "general",
    count: 100,
  },
  {
    id: "dua_subhan_wa_bihamdih",
    name: "تسبيح بحمده",
    arabic: "سُبْحَانَ اللهِ وَبِحَمْدِه",
    transliteration: "Subhan Allahi wa bihamdih",
    category: "morning",
    count: 100,
  },
  {
    id: "dua_hasbuna",
    name: "حسبنا الله",
    arabic: "حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيل",
    transliteration: "Hasbunallahu wa ni'mal wakeel",
    category: "general",
    count: 33,
  },
  {
    id: "dua_la_hawla",
    name: "لا حول ولا قوة",
    arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِالله",
    transliteration: "La hawla wa la quwwata illa billah",
    category: "general",
    count: 33,
  },
  {
    id: "dua_ya_hayyu_ya_qayyum",
    name: "يا حي يا قيوم",
    arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيث",
    transliteration: "Ya Hayyu Ya Qayyum, birahmatika astaghith",
    category: "morning",
    count: 100,
  },
  {
    id: "dua_rabbi_ghfir",
    name: "رب اغفر لي",
    arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيم",
    transliteration: "Rabbi-ghfir li wa tub 'alayya innaka antal Tawwabur-Raheem",
    category: "after_prayer",
    count: 33,
  },
  {
    id: "dua_bismillah",
    name: "بسم الله",
    arabic: "بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيم",
    transliteration: "Bismillahir-Rahmanir-Raheem",
    category: "general",
    count: 7,
  },
  {
    id: "dua_alhamdulillah",
    name: "الحمد لله",
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِين",
    transliteration: "Alhamdulillah Rabbil 'Alameen",
    category: "morning",
    count: 33,
  },
  {
    id: "dua_allahu_akbar",
    name: "الله أكبر",
    arabic: "اللهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا وَسُبْحَانَ اللهِ بُكْرَةً وَأَصِيلًا",
    transliteration: "Allahu Akbar kabira, walhamdu lillahi kathira, wa subhan Allahi bukrata wa aseela",
    category: "evening",
    count: 33,
  },
  {
    id: "dua_audhu_bi",
    name: "أعوذ بالله",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَق",
    transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq",
    category: "evening",
    count: 3,
  },
  {
    id: "dua_sleep_tasbeeh",
    name: "تسبيح النوم",
    arabic: "سُبْحَانَ اللهِ (٣٣) الْحَمْدُ لِلَّهِ (٣٣) اللهُ أَكْبَرُ (٣٤)",
    transliteration: "Subhan Allah (33), Alhamdulillah (33), Allahu Akbar (34)",
    category: "sleep",
    count: 100,
  },
];

/**
 * Mascot (decorative icon) per phrase keyword. Purely cosmetic — the
 * Sebha page renders one of these next to the counter to give a little
 * visual variety when switching dhikr.
 */
export type MascotKey = "wave" | "sun" | "moon" | "drop" | "leaf" | "flame" | "heart" | "default";

export function mascotForPhrase(phrase: string): MascotKey {
  const p = phrase ?? "";
  if (/(سبحان|تنزيه)/.test(p)) return "wave";
  if (/(صلاة على|نبي)/.test(p)) return "leaf";
  if (/(حمد|شكر)/.test(p)) return "sun";
  // Moon (هلال) — used for the لا إله إلا الله / توحيد cluster. Was a
  // star previously; user feedback preferred no stars anywhere.
  if (/(إله إلا|توحيد|لا إله)/.test(p)) return "moon";
  if (/(أكبر|تكبير)/.test(p)) return "moon";
  if (/(استغفر|مغفرة)/.test(p)) return "drop";
  if (/(حسبنا|قوة|حول)/.test(p)) return "flame";
  if (/(حي قيوم|قيوم|رحمة)/.test(p)) return "heart";
  return "default";
}

/**
 * Sound profiles for the target-reached chime. Frequency (Hz) + duration
 * pattern; honors enableSounds + reduceMotion preferences.
 */
export type SoundProfileDef = {
  id: "chime_bell" | "soft_ping" | "rising_3" | "single_tap";
  label: string;
  notes: Array<{ freq: number; startOffset: number; duration: number }>;
};

export const SOUND_PROFILES: SoundProfileDef[] = [
  {
    id: "rising_3",
    label: "ثلاث نغمات صاعدة",
    notes: [
      { freq: 659.25, startOffset: 0, duration: 0.35 },
      { freq: 880, startOffset: 0.12, duration: 0.35 },
      { freq: 1318.5, startOffset: 0.24, duration: 0.4 },
    ],
  },
  {
    id: "chime_bell",
    label: "جرس هادئ",
    notes: [{ freq: 1318.5, startOffset: 0, duration: 0.9 }],
  },
  {
    id: "soft_ping",
    label: "رنة ناعمة",
    notes: [{ freq: 880, startOffset: 0, duration: 0.3 }],
  },
  {
    id: "single_tap",
    label: "نقرة خفيفة",
    notes: [{ freq: 1046.5, startOffset: 0, duration: 0.12 }],
  },
];