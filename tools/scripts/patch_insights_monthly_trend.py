#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 61: Monthly Quran ayah trend (last 6 months) bar chart in Insights.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add quranMonthlyTrend memo (after quranMonthTotal)
OLD_MEMO = (
    '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n'
    '  const quranGoal = Math.max(1, quranDailyGoal ?? 10);\n'
    '\n'
    '  // Day-of-week reading pattern (0=Sun ... 6=Sat)'
)
NEW_MEMO = (
    '  const todayQuranAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n'
    '  const quranGoal = Math.max(1, quranDailyGoal ?? 10);\n'
    '\n'
    '  // Phase 61: Monthly reading trend (last 6 months)\n'
    '  const quranMonthlyTrend = React.useMemo(() => {\n'
    '    const now = new Date();\n'
    '    return Array.from({ length: 6 }, (_, i) => {\n'
    '      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);\n'
    '      const y = d.getFullYear();\n'
    '      const m = String(d.getMonth() + 1).padStart(2, "0");\n'
    '      const prefix = `${y}-${m}-`;\n'
    '      const total = Object.entries(quranDailyAyahs)\n'
    '        .filter(([k]) => k.startsWith(prefix))\n'
    '        .reduce((s, [, v]) => s + (v ?? 0), 0);\n'
    '      const MONTHS_AR = ["\u064a\u0646", "\u0641\u0628", "\u0645\u0627\u0631", "\u0623\u0628\u0631", "\u0645\u0627\u064a", "\u064a\u0648\u0646", "\u064a\u0648\u0644", "\u0623\u063a", "\u0633\u0628", "\u0623\u0643\u062a", "\u0646\u0648\u0641", "\u062f\u064a\u0633"];\n'
    '      const isCurrent = i === 5;\n'
    '      return { label: MONTHS_AR[d.getMonth()] ?? "", total, isCurrent };\n'
    '    });\n'
    '  }, [quranDailyAyahs]);\n'
    '\n'
    '  // Day-of-week reading pattern (0=Sun ... 6=Sat)'
)
c1 = content.count(OLD_MEMO)
print(f'Memo anchor: {c1}')
if c1 == 1:
    content = content.replace(OLD_MEMO, NEW_MEMO, 1)

# 2. Insert monthly chart after the weekly comparison chart, before heatmap
# Anchor: after weekly comparison chart block ends (before juz completion)
OLD_CHART = (
    '          {/* Per-juz reading completion */}\n'
    '          {quranJuzCompletion.some((j) => j.pct > 0) && ('
)
NEW_CHART = (
    '          {/* Phase 61: Monthly reading trend */}\n'
    '          {quranMonthlyTrend.some((m) => m.total > 0) && (() => {\n'
    '            const maxM = Math.max(...quranMonthlyTrend.map((m) => m.total), 1);\n'
    '            return (\n'
    '              <div className="mt-4">\n'
    '                <div className="text-xs opacity-50 mb-2">\u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0634\u0647\u0631\u064a\u0629 (6 \u0623\u0634\u0647\u0631)</div>\n'
    '                <div className="flex items-end gap-1.5 h-20">\n'
    '                  {quranMonthlyTrend.map((mo) => (\n'
    '                    <div key={mo.label} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%", justifyContent: "flex-end" }}>\n'
    '                      {mo.total > 0 && <span className="text-[9px] opacity-60 tabular-nums">{mo.total.toLocaleString("ar-EG")}</span>}\n'
    '                      <div\n'
    '                        className="w-full rounded-t-md transition-all duration-500"\n'
    '                        style={{\n'
    '                          height: mo.total > 0 ? `${Math.max(4, Math.round((mo.total / maxM) * 56))}px` : "3px",\n'
    '                          background: mo.isCurrent ? "var(--accent)" : mo.total > 0 ? "color-mix(in srgb, var(--accent) 38%, transparent)" : "var(--card)",\n'
    '                          opacity: mo.total === 0 ? 0.35 : 1,\n'
    '                        }}\n'
    '                        title={`${mo.label}: ${mo.total.toLocaleString("ar-EG")} \u0622\u064a\u0629`}\n'
    '                      />\n'
    '                      <span className="text-[9px] leading-none opacity-45 text-center">{mo.label}</span>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '          {/* Per-juz reading completion */}\n'
    '          {quranJuzCompletion.some((j) => j.pct > 0) && ('
)
c2 = content.count(OLD_CHART)
print(f'Chart anchor: {c2}')
if c2 == 1:
    content = content.replace(OLD_CHART, NEW_CHART, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
