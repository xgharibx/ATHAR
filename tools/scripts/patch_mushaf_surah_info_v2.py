#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 60: Improve surah info panel in Mushaf.tsx settings sheet.
   Replace 'رقم السورة' with ayah count + add reading time, plus share button."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Replace the static info panel with a dynamic one that includes ayah count + reading time
OLD = (
    '              {showSurahInfo && lastItem && (\n'
    '                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/4 border border-white/8 text-center text-sm">\n'
    '                  {[\n'
    '                    ["\u0627\u0644\u0633\u0648\u0631\u0629", lastItem.surahName],\n'
    '                    ["\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629", pageSurahEnglish || ""],\n'
    '                    ["\u0627\u0644\u0646\u0648\u0639", getSurahRevelationLabel(lastItem.surahId)],\n'
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0631\u0642\u0645 \u0627\u0644\u0633\u0648\u0631\u0629", String(lastItem.surahId)],\n'
    '                    ["\u0627\u0644\u0635\u0641\u062d\u0629", String(currentPage)],\n'
    '                    ["\u0645\u0646 \u0623\u0635\u0644", String(totalPages)],\n'
    '                  ].map(([label, val]) => (\n'
    '                    <div key={label}>\n'
    '                      <div className="text-[11px] opacity-50 mb-1">{label}</div>\n'
    '                      <div className="font-semibold text-xs arabic-text">{val}</div>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>\n'
    '              )}'
)
NEW = (
    '              {showSurahInfo && lastItem && (() => {\n'
    '                const infoSurah = quranDB?.find((s) => s.id === lastItem.surahId);\n'
    '                const ayahCount = infoSurah?.ayahs.length ?? 0;\n'
    '                const readMins = ayahCount > 0 ? Math.max(1, Math.round(ayahCount / 8)) : 0;\n'
    '                const rows: [string, string][] = [\n'
    '                  ["\u0627\u0644\u0633\u0648\u0631\u0629", lastItem.surahName],\n'
    '                  ["\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629", pageSurahEnglish || "—"],\n'
    '                  ["\u0627\u0644\u0646\u0648\u0639", getSurahRevelationLabel(lastItem.surahId)],\n'
    '                  ["\u0627\u0644\u062c\u0632\u0621", toArabicNumeral(getSurahJuz(lastItem.surahId))],\n'
    '                  ["\u0639\u062f\u062f \u0627\u0644\u0622\u064a\u0627\u062a", ayahCount > 0 ? ayahCount.toLocaleString("ar-EG") : "—"],\n'
    '                  ["\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629", readMins > 0 ? `~${readMins.toLocaleString("ar-EG")} \u062f\u0642` : "—"],\n'
    '                  ["\u0627\u0644\u0635\u0641\u062d\u0629", toArabicNumeral(currentPage)],\n'
    '                  ["\u0645\u0646 \u0623\u0635\u0644", toArabicNumeral(totalPages)],\n'
    '                ];\n'
    '                return (\n'
    '                  <div>\n'
    '                    <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/4 border border-white/8 text-center text-sm">\n'
    '                      {rows.map(([label, val]) => (\n'
    '                        <div key={label}>\n'
    '                          <div className="text-[11px] opacity-50 mb-1">{label}</div>\n'
    '                          <div className="font-semibold text-xs arabic-text">{val}</div>\n'
    '                        </div>\n'
    '                      ))}\n'
    '                    </div>\n'
    '                    <button\n'
    '                      type="button"\n'
    '                      className="mt-2 w-full text-[11px] py-2 rounded-xl opacity-55 hover:opacity-80 transition flex items-center justify-center gap-1.5"\n'
    '                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}\n'
    '                      onClick={async () => {\n'
    '                        const text = `\u0642\u0631\u0623\u062a \u0633\u0648\u0631\u0629 ${lastItem.surahName} \u2022 \u0635\u0641\u062d\u0629 ${currentPage.toLocaleString("ar-EG")} \u0645\u0646 ${totalPages.toLocaleString("ar-EG")} \u2022 \u062a\u0637\u0628\u064a\u0642 \u0646\u0648\u0631 \u0627\u0644\u0630\u0643\u0631`;\n'
    '                        if (navigator.share) { await navigator.share({ text }).catch(() => {}); }\n'
    '                        else { await navigator.clipboard.writeText(text).catch(() => {}); }\n'
    '                      }}\n'
    '                      aria-label="\u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0633\u0648\u0631\u0629"\n'
    '                    >\n'
    '                      <Share2 size={11} aria-hidden="true" />\n'
    '                      \u0645\u0634\u0627\u0631\u0643\u0629\n'
    '                    </button>\n'
    '                  </div>\n'
    '                );\n'
    '              })()}'
)
c = content.count(OLD)
print(f'Anchor: {c}')
if c == 1:
    content = content.replace(OLD, NEW, 1)
    with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
