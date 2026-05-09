#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 22: Add Quran reading streak to Insights.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Add quranStreak memo after quranMonthTotal ───────────────────────────
old_today_ayahs = (
    '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n'
    '  const quranGoal = Math.max(1, quranDailyGoal ?? 10);'
)
new_today_ayahs = (
    '  const quranStreak = React.useMemo(() => {\n'
    '    let streak = 0;\n'
    '    const today = new Date();\n'
    '    for (let i = 0; i < 365; i++) {\n'
    '      const d = new Date(today);\n'
    '      d.setDate(d.getDate() - i);\n'
    '      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;\n'
    '      if ((quranDailyAyahs[k] ?? 0) > 0) streak++;\n'
    '      else if (i > 0) break;\n'
    '    }\n'
    '    return streak;\n'
    '  }, [quranDailyAyahs]);\n\n'
    '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n'
    '  const quranGoal = Math.max(1, quranDailyGoal ?? 10);'
)

count = content.count(old_today_ayahs)
print(f'1. Streak memo: {count}')
if count == 1:
    content = content.replace(old_today_ayahs, new_today_ayahs, 1)

# ─── 2. Add streak MiniStatSmall in the 3-col grid ──────────────────────────
old_grid = (
    '          <div className="grid grid-cols-3 gap-2 mb-4">\n'
    '            <MiniStatSmall label="\u0627\u0644\u064a\u0648\u0645" value={todayQuranAyahs.toLocaleString("ar-EG")} accent />\n'
    '            <MiniStatSmall label="\u0627\u0644\u0623\u0633\u0628\u0648\u0639" value={quranWeekTotal.toLocaleString("ar-EG")} />\n'
    '            <MiniStatSmall label="\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" value={quranStats.totalAyahs.toLocaleString("ar-EG")} />\n'
    '          </div>'
)
new_grid = (
    '          <div className="grid grid-cols-4 gap-2 mb-4">\n'
    '            <MiniStatSmall label="\u0627\u0644\u064a\u0648\u0645" value={todayQuranAyahs.toLocaleString("ar-EG")} accent />\n'
    '            <MiniStatSmall label="\u0627\u0644\u0623\u0633\u0628\u0648\u0639" value={quranWeekTotal.toLocaleString("ar-EG")} />\n'
    '            <MiniStatSmall label="\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" value={quranStats.totalAyahs.toLocaleString("ar-EG")} />\n'
    '            {quranStreak > 0 && <MiniStatSmall label="\u0633\u0644\u0633\u0644\u0629 \u0623\u064a\u0627\u0645" value={`${quranStreak.toLocaleString("ar-EG")} \u0661`} />}\n'
    '          </div>'
)

count2 = content.count(old_grid)
print(f'2. Grid: {count2}')
if count2 == 1:
    content = content.replace(old_grid, new_grid, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
