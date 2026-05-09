#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove duplicate quranStreak memo and fix grid value."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Remove the duplicate useMemo for quranStreak (already in store)
old_memo = (
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
    '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;'
)
new_memo = '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;'

count = content.count(old_memo)
print(f'1. Remove dup memo: {count}')
if count == 1:
    content = content.replace(old_memo, new_memo, 1)

# 2. Fix the grid value (remove the stray Arabic-1 digit at end)
old_grid_val = (
    '            {quranStreak > 0 && <MiniStatSmall label="\u0633\u0644\u0633\u0644\u0629 \u0623\u064a\u0627\u0645" value={`${quranStreak.toLocaleString("ar-EG")} \u0661`} />}'
)
new_grid_val = (
    '            {quranStreak > 0 && <MiniStatSmall label="\u0633\u0644\u0633\u0644\u0629 \u0623\u064a\u0627\u0645" value={quranStreak.toLocaleString("ar-EG")} />}'
)

count2 = content.count(old_grid_val)
print(f'2. Fix grid val: {count2}')
if count2 == 1:
    content = content.replace(old_grid_val, new_grid_val, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
