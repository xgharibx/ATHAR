#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 54: Add estimated reading time and ayah count to Mushaf surah info panel."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add ayah count and reading time to the surah info grid
# The grid array currently ends with ["من أصل", String(totalPages)]
OLD_GRID = (
    '                  {[\n'
    '                    ["\u0627\u0644\u0633\u0648\u0631\u0629", lastItem.surahName],\n'
    '                    ["\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629", pageSurahEnglish || ""],\n'
    '                    ["\u0627\u0644\u0646\u0648\u0639", getSurahRevelationLabel(lastItem.surahId)],\n'
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0631\u0642\u0645 \u0627\u0644\u0633\u0648\u0631\u0629", String(lastItem.surahId)],\n'
    '                    ["\u0627\u0644\u0635\u0641\u062d\u0629", String(currentPage)],\n'
    '                    ["\u0645\u0646 \u0623\u0635\u0644", String(totalPages)],\n'
    '                  ].map(([label, val]) => ('
)
NEW_GRID = (
    '                {(() => {\n'
    '                    const _surahData = quranDB?.find((s) => s.id === lastItem.surahId);\n'
    '                    const _ayahCount = _surahData?.ayahs.length ?? 0;\n'
    '                    const _readMin = _ayahCount > 0 ? Math.max(1, Math.round(_ayahCount / 8)) : 0;\n'
    '                    return [\n'
    '                    ["\u0627\u0644\u0633\u0648\u0631\u0629", lastItem.surahName],\n'
    '                    ["\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629", pageSurahEnglish || ""],\n'
    '                    ["\u0627\u0644\u0646\u0648\u0639", getSurahRevelationLabel(lastItem.surahId)],\n'
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0631\u0642\u0645 \u0627\u0644\u0633\u0648\u0631\u0629", String(lastItem.surahId)],\n'
    '                    ...(_ayahCount > 0 ? [["\u0639\u062f\u062f \u0627\u0644\u0622\u064a\u0627\u062a", _ayahCount.toLocaleString("ar-EG")]] : []),\n'
    '                    ...(_readMin > 0 ? [["\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629", `~${_readMin.toLocaleString("ar-EG")} \u062f\u0642\u064a\u0642\u0629`]] : []),\n'
    '                    ["\u0627\u0644\u0635\u0641\u062d\u0629", String(currentPage)],\n'
    '                    ["\u0645\u0646 \u0623\u0635\u0644", String(totalPages)],\n'
    '                    ];\n'
    '                  })().map(([label, val]) => ('
)
c1 = content.count(OLD_GRID)
print(f'1. Grid: {c1}')
if c1 == 1:
    content = content.replace(OLD_GRID, NEW_GRID, 1)

# Fix closing of the map: need to change )} to )} and close the IIFE properly
# The original closing was:  ))}
# After the map the div closes. Now we need to close the IIFE too.
OLD_CLOSE = (
    '                    <div key={label}>\n'
    '                      <div className="text-[11px] opacity-50 mb-1">{label}</div>\n'
    '                      <div className="font-semibold text-xs arabic-text">{val}</div>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>'
)
NEW_CLOSE = (
    '                    <div key={label}>\n'
    '                      <div className="text-[11px] opacity-50 mb-1">{label}</div>\n'
    '                      <div className="font-semibold text-xs arabic-text">{val}</div>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                }\n'
    '                </div>'
)
c2 = content.count(OLD_CLOSE)
print(f'2. Close fix: {c2}')
if c2 == 1:
    content = content.replace(OLD_CLOSE, NEW_CLOSE, 1)

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
