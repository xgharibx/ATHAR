/** Where the app's earlier Quran addresses lead in «القرآن الكريم» (see redirects.tsx). */
const toNumber = (raw: string | null): number | null => {
  if (!raw) return null;
  const n = Number(raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Where an earlier address leads, or null for the Quran's home. */
export function quranTargetFor(from: "mushaf" | "q2" | "tafsir", pathname: string, search: string, hash = ""): string {
  const q = new URLSearchParams(search);
  const surah = toNumber(q.get("surah"));
  const ayah = toNumber(q.get("ayah"));
  const validSurah = surah && surah <= 114 ? surah : null;
  if (from === "q2") return pathname.replace(/^\/q2(?=\/|$)/, "/quran") + search;
  if (from === "tafsir") {
    if (validSurah && ayah) return `/quran/tafsir/${validSurah}/${ayah}`;
    if (validSurah) return `/quran/tafsir/read/${validSurah}`;
    return "/quran/tafsir";
  }
  // «/mushaf?surah=18&ayah=10» → the surah at its ayah; «/mushaf/293» → the printed page.
  if (validSurah) return `/quran/read/${validSurah}${ayah ? `?a=${ayah}` : ""}`;
  if (q.get("khatma")) return "/quran/khatma";
  const page = toNumber(pathname.split("/")[2] ?? null) ?? toNumber(q.get("page")) ?? toNumber(new URLSearchParams(hash.replace(/^#/, "")).get("page"));
  if (page && page <= 604) return `/quran/page/${page}`;
  return "/quran/page";
}

