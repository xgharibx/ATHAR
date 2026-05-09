#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 52: 30-day reading consistency score in Insights.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add the quranConsistency30 memo after quranStats/overallQuranProgress
OLD_REVEAL = '  // Meccan vs Medinan reading breakdown'
NEW_REVEAL = (
    '  // Phase 52: 30-day reading consistency score\n'
    '  const quranConsistency30 = React.useMemo(() => {\n'
    '    const today = new Date();\n'
    '    let daysRead = 0;\n'
    '    for (let i = 0; i < 30; i++) {\n'
    '      const d = new Date(today.getTime() - i * 86400000);\n'
    '      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;\n'
    '      if ((quranDailyAyahs[key] ?? 0) > 0) daysRead++;\n'
    '    }\n'
    '    return { daysRead, pct: Math.round((daysRead / 30) * 100) };\n'
    '  }, [quranDailyAyahs]);\n'
    '\n'
    '  // Meccan vs Medinan reading breakdown'
)
c1 = content.count(OLD_REVEAL)
print(f'1. Consistency memo: {c1}')
if c1 == 1:
    content = content.replace(OLD_REVEAL, NEW_REVEAL, 1)

# 2. Insert consistency chip after the stats grid in the Quran analytics card
# Target: after the grid closes, before the Meccan/Medinan section
OLD_GRID_END = (
    '          {/* Meccan vs Medinan breakdown */}\n'
    '          {quranStats.started > 0 && ('
)
NEW_GRID_END = (
    '          {/* Phase 52: Reading consistency chip */}\n'
    '          {quranConsistency30.daysRead > 0 && (() => {\n'
    '            const { daysRead, pct } = quranConsistency30;\n'
    '            const grade = pct >= 80 ? "\u0645\u0645\u062a\u0627\u0632" : pct >= 60 ? "\u062c\u064a\u062f \u062c\u062f\u0627\u064b" : pct >= 40 ? "\u062c\u064a\u062f" : pct >= 20 ? "\u0645\u0642\u0628\u0648\u0644" : "\u0627\u0628\u062f\u0623";\n'
    '            const gradeColor = pct >= 80 ? "var(--ok)" : pct >= 60 ? "var(--accent)" : pct >= 40 ? "#fb923c" : "#f87171";\n'
    '            return (\n'
    '              <div className="mb-4 rounded-xl p-3 border" style={{ background: "color-mix(in srgb, var(--card) 80%, var(--bg))", borderColor: "color-mix(in srgb, var(--stroke) 40%, transparent)" }}>\n'
    '                <div className="flex items-center justify-between mb-2">\n'
    '                  <span className="text-[11px] opacity-60">\u0627\u0646\u062a\u0638\u0627\u0645 30 \u064a\u0648\u0645</span>\n'
    '                  <span className="text-[11px] font-bold tabular-nums" style={{ color: gradeColor }}>{pct.toLocaleString("ar-EG")}\u066a &mdash; {grade}</span>\n'
    '                </div>\n'
    '                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 50%, transparent)" }}>\n'
    '                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: gradeColor }} />\n'
    '                </div>\n'
    '                <p className="text-[10px] opacity-45 mt-1">{daysRead.toLocaleString("ar-EG")} \u0645\u0646 30 \u064a\u0648\u0645 \u0642\u0631\u0623\u062a \u0641\u064a\u0647\u0627</p>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '          {/* Meccan vs Medinan breakdown */}\n'
    '          {quranStats.started > 0 && ('
)
c2 = content.count(OLD_GRID_END)
print(f'2. Consistency chip: {c2}')
if c2 == 1:
    content = content.replace(OLD_GRID_END, NEW_GRID_END, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
