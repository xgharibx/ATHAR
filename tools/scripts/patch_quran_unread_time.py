#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 50: Show estimated reading time for each surah in 'unread' mode, and
also add 'best day' stat to Insights quran card."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'Quran.tsx size: {len(content)} bytes')

# Add "~N min" reading time estimate in the surah meta row, visible in unread mode
# Insert after the ayah count span
OLD_META = (
    '                      <span className="tabular-nums" aria-label={`\u0639\u062f\u062f \u0622\u064a\u0627\u062a \u0627\u0644\u0633\u0648\u0631\u0629: ${s.ayahs.length}`}>{s.ayahs.length.toLocaleString("ar-EG")} \u0622\u064a\u0629</span>\n'
    '                    </div>'
)
NEW_META = (
    '                      <span className="tabular-nums" aria-label={`\u0639\u062f\u062f \u0622\u064a\u0627\u062a \u0627\u0644\u0633\u0648\u0631\u0629: ${s.ayahs.length}`}>{s.ayahs.length.toLocaleString("ar-EG")} \u0622\u064a\u0629</span>\n'
    '                      {sortMode === "unread" && (() => {\n'
    '                        const mins = Math.max(1, Math.round(s.ayahs.length / 8));\n'
    '                        return <span>\u00b7 ~{mins.toLocaleString("ar-EG")} \u062f\u0642</span>;\n'
    '                      })()}\n'
    '                    </div>'
)
c1 = content.count(OLD_META)
print(f'1. Meta anchor: {c1}')
if c1 == 1:
    content = content.replace(OLD_META, NEW_META, 1)

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved Quran.tsx ({len(content)} bytes)')

# Now update Insights.tsx - add best day stat
with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content2 = f.read()

print(f'Insights.tsx size: {len(content2)} bytes')

# Add best day to the quran stats grid - replace the 4-col grid
OLD_GRID = (
    '          <div className="grid grid-cols-4 gap-2 mb-4">\n'
    '            <MiniStatSmall label="\u0627\u0644\u064a\u0648\u0645" value={todayQuranAyahs.toLocaleString("ar-EG")} accent />\n'
    '            <MiniStatSmall label="\u0627\u0644\u0623\u0633\u0628\u0648\u0639" value={quranWeekTotal.toLocaleString("ar-EG")} />\n'
    '            <MiniStatSmall label="\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" value={quranStats.totalAyahs.toLocaleString("ar-EG")} />\n'
    '            {quranStreak > 0 && <MiniStatSmall label="\u0633\u0644\u0633\u0644\u0629 \u0623\u064a\u0627\u0645" value={quranStreak.toLocaleString("ar-EG")} />}\n'
    '          </div>'
)
NEW_GRID = (
    '          {(() => {\n'
    '            const bestDay = Object.values(quranDailyAyahs).reduce((mx, v) => Math.max(mx, v ?? 0), 0);\n'
    '            const activeDaysCount = Object.values(quranDailyAyahs).filter((v) => (v ?? 0) > 0).length;\n'
    '            return (\n'
    '              <div className="grid grid-cols-4 gap-2 mb-4">\n'
    '                <MiniStatSmall label="\u0627\u0644\u064a\u0648\u0645" value={todayQuranAyahs.toLocaleString("ar-EG")} accent />\n'
    '                <MiniStatSmall label="\u0627\u0644\u0623\u0633\u0628\u0648\u0639" value={quranWeekTotal.toLocaleString("ar-EG")} />\n'
    '                <MiniStatSmall label="\u0623\u0641\u0636\u0644 \u064a\u0648\u0645" value={bestDay > 0 ? bestDay.toLocaleString("ar-EG") : "\u2014"} />\n'
    '                <MiniStatSmall label="\u0623\u064a\u0627\u0645 \u0646\u0634\u0637\u0629" value={activeDaysCount.toLocaleString("ar-EG")} />\n'
    '              </div>\n'
    '            );\n'
    '          })()}'
)
c2 = content2.count(OLD_GRID)
print(f'2. Grid anchor: {c2}')
if c2 == 1:
    content2 = content2.replace(OLD_GRID, NEW_GRID, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content2)
print(f'Saved Insights.tsx ({len(content2)} bytes)')
