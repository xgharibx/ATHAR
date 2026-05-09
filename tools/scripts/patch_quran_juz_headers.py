#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 37: Quran.tsx — juz section headers in surah list (mushaf order)."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Wrap surah list item with fragment and add juz header
old_map = (
    '            {sortedFiltered.map((s, idx) => {\n'
    '              const maxRead = readingHistory[String(s.id)] ?? 0;\n'
    '              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;\n'
    '              const isMedinan = SURAH_REVELATION[s.id] === "medinan";\n'
    '              const isCurrent = lastRead?.surahId === s.id;\n'
    '              return (\n'
    '                <div key={s.id} role="listitem" ref={isCurrent ? currentSurahRef : undefined}>'
)
new_map = (
    '            {sortedFiltered.map((s, idx) => {\n'
    '              const maxRead = readingHistory[String(s.id)] ?? 0;\n'
    '              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;\n'
    '              const isMedinan = SURAH_REVELATION[s.id] === "medinan";\n'
    '              const isCurrent = lastRead?.surahId === s.id;\n'
    '              const currJuz = getSurahJuz(s.id);\n'
    '              const prevJuz = idx > 0 ? getSurahJuz(sortedFiltered[idx - 1]!.id) : null;\n'
    '              const showJuzHeader = sortMode === "mushaf" && !filterJuz && !query && (idx === 0 || currJuz !== prevJuz);\n'
    '              return (\n'
    '                <React.Fragment key={s.id}>\n'
    '                  {showJuzHeader && (\n'
    '                    <div\n'
    '                      className="px-5 py-1.5 text-[10px] font-semibold opacity-35 tracking-wider"\n'
    '                      style={idx > 0 ? { borderTop: "1px solid color-mix(in srgb, var(--stroke) 40%, transparent)", marginTop: "4px" } : undefined}\n'
    '                      role="separator"\n'
    '                      aria-label={`\u0627\u0644\u062c\u0632\u0621 ${currJuz}`}\n'
    '                    >\n'
    '                      \u062c\u0632\u0621 {toArabicNumeral(currJuz)}\n'
    '                    </div>\n'
    '                  )}\n'
    '                <div role="listitem" ref={isCurrent ? currentSurahRef : undefined}>'
)

count = content.count(old_map)
print(f'1. Map wrap: {count}')
if count == 1:
    content = content.replace(old_map, new_map, 1)

# Close the fragment after the closing </div> of the surah button wrapper
# Pattern: each surah ends with `</div>\n              );`  then `})}` later
# We need to close </React.Fragment> before the );
old_close = (
    '                </div>\n'
    '              );\n'
    '            })}'
)
new_close = (
    '                </div>\n'
    '                </React.Fragment>\n'
    '              );\n'
    '            })}'
)

count2 = content.count(old_close)
print(f'2. Close fragment: {count2}')
if count2 == 1:
    content = content.replace(old_close, new_close, 1)

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
