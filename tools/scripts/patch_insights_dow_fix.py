#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix: move quranDowPattern memo after quranDailyAyahs declaration."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Remove the prematurely-placed DOW pattern memo
old_premature = (
    '\n'
    '  // Day-of-week reading pattern (0=Sun ... 6=Sat)\n'
    '  const quranDowPattern = React.useMemo(() => {\n'
    '    const totals = [0, 0, 0, 0, 0, 0, 0];\n'
    '    const counts = [0, 0, 0, 0, 0, 0, 0];\n'
    '    for (const [k, v] of Object.entries(quranDailyAyahs)) {\n'
    '      if (!v) continue;\n'
    '      const d = new Date(k + "T00:00:00");\n'
    '      const dow = d.getDay();\n'
    '      totals[dow] += v;\n'
    '      counts[dow]++;\n'
    '    }\n'
    '    return totals.map((t, i) => (counts[i] > 0 ? Math.round(t / counts[i]) : 0));\n'
    '  }, [quranDailyAyahs]);\n'
    '  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);'
)
new_premature = '  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);'

count = content.count(old_premature)
print(f'1. Remove premature: {count}')
if count == 1:
    content = content.replace(old_premature, new_premature, 1)

# Now add it after quranMonthTotal (which depends on quranDailyAyahs)
old_anchor = '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n  const quranGoal = Math.max(1, quranDailyGoal ?? 10);'
new_anchor = (
    '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n'
    '  const quranGoal = Math.max(1, quranDailyGoal ?? 10);\n\n'
    '  // Day-of-week reading pattern (0=Sun ... 6=Sat)\n'
    '  const quranDowPattern = React.useMemo(() => {\n'
    '    const totals = [0, 0, 0, 0, 0, 0, 0];\n'
    '    const counts = [0, 0, 0, 0, 0, 0, 0];\n'
    '    for (const [k, v] of Object.entries(quranDailyAyahs)) {\n'
    '      if (!v) continue;\n'
    '      const d = new Date(k + "T00:00:00");\n'
    '      const dow = d.getDay();\n'
    '      totals[dow] += v;\n'
    '      counts[dow]++;\n'
    '    }\n'
    '    return totals.map((t, i) => (counts[i] > 0 ? Math.round(t / counts[i]) : 0));\n'
    '  }, [quranDailyAyahs]);'
)

count2 = content.count(old_anchor)
print(f'2. Add after goal: {count2}')
if count2 == 1:
    content = content.replace(old_anchor, new_anchor, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
