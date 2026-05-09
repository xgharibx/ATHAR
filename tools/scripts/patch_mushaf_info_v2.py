#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 54: Replace surah info grid with enriched version including ayah count + reading time."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

old = (
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
    '                  ))}'
)

new = (
    '                  {(() => {\n'
    '                    const _sd = quranDB?.find((s) => s.id === lastItem.surahId);\n'
    '                    const _ac = _sd?.ayahs.length ?? 0;\n'
    '                    const _rm = _ac > 0 ? Math.max(1, Math.round(_ac / 8)) : 0;\n'
    '                    const rows: [string, string][] = [\n'
    '                      ["\u0627\u0644\u0633\u0648\u0631\u0629", lastItem.surahName],\n'
    '                      ["\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629", pageSurahEnglish || ""],\n'
    '                      ["\u0627\u0644\u0646\u0648\u0639", getSurahRevelationLabel(lastItem.surahId)],\n'
    '                      ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                      ["\u0631\u0642\u0645 \u0627\u0644\u0633\u0648\u0631\u0629", String(lastItem.surahId)],\n'
    '                    ];\n'
    '                    if (_ac > 0) rows.push(["\u0639\u062f\u062f \u0627\u0644\u0622\u064a\u0627\u062a", _ac.toLocaleString("ar-EG")]);\n'
    '                    if (_rm > 0) rows.push(["\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629", `~${_rm.toLocaleString("ar-EG")} \u062f\u0642\u064a\u0642\u0629`]);\n'
    '                    rows.push(["\u0627\u0644\u0635\u0641\u062d\u0629", String(currentPage)], ["\u0645\u0646 \u0623\u0635\u0644", String(totalPages)]);\n'
    '                    return rows.map(([label, val]) => (\n'
    '                      <div key={label}>\n'
    '                        <div className="text-[11px] opacity-50 mb-1">{label}</div>\n'
    '                        <div className="font-semibold text-xs arabic-text">{val}</div>\n'
    '                      </div>\n'
    '                    ));\n'
    '                  })()}'
)

c = content.count(old)
print(f'Grid match: {c}')
if c == 1:
    content = content.replace(old, new, 1)
    with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
else:
    # Show a portion of the file around the expected area for debugging
    idx = content.find('showSurahInfo && lastItem')
    print(f'showSurahInfo idx: {idx}')
    print(repr(content[idx:idx+800]))
