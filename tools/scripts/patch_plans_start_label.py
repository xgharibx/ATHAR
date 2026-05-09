#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 36: QuranPlans — show today's starting surah/ayah label."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranPlans.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add todayStartRef memo after activePlan computation
old_anchor = (
    '    return Math.min(100, Math.round((activePlan.todayAyahs / activePlan.dailyAyahs) * 100));\n'
    '  }, [activePlan]);'
)
new_anchor = (
    '    return Math.min(100, Math.round((activePlan.todayAyahs / activePlan.dailyAyahs) * 100));\n'
    '  }, [activePlan]);\n'
    '\n'
    '  const todayStartRef = React.useMemo(() => {\n'
    '    if (!activePlan) return null;\n'
    '    const startGlobal = Math.max(1, activePlan.targetTotal - activePlan.dailyAyahs + 1);\n'
    '    const ref = globalAyahToRef(startGlobal);\n'
    '    if (!ref || !quranData) return null;\n'
    '    const surahName = quranData.find((s) => s.id === ref.surahId)?.name ?? null;\n'
    '    return { ...ref, surahName };\n'
    '  }, [activePlan, globalAyahToRef, quranData]);'
)

count1 = content.count(old_anchor)
print(f'1. Memo: {count1}')
if count1 == 1:
    content = content.replace(old_anchor, new_anchor, 1)

# 2. Add surah label below the "ورد اليوم" progress bar
old_progress = (
    '            </div>\n'
    '          </div>\n'
    '\n'
    '          {/* Mark today done / CTA */}'
)
new_progress = (
    '            </div>\n'
    '          </div>\n'
    '          {/* Today start position */}\n'
    '          {todayStartRef && !activePlan.doneToday && (\n'
    '            <div className="text-[11px] opacity-55 text-center -mt-1">\n'
    '              \u0627\u0628\u062f\u0623 \u0645\u0646: <span className="font-semibold arabic-text">{todayStartRef.surahName}</span> \u0622\u064a\u0629 {todayStartRef.ayahIndex.toLocaleString("ar-EG")}\n'
    '            </div>\n'
    '          )}\n'
    '\n'
    '          {/* Mark today done / CTA */}'
)

count2 = content.count(old_progress)
print(f'2. Label insert: {count2}')
if count2 == 1:
    content = content.replace(old_progress, new_progress, 1)

with open('src/pages/QuranPlans.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
