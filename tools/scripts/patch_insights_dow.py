#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 28: Add day-of-week Quran reading pattern to Insights.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Add dayOfWeekPattern memo after quranMonthTotal ─────────────────────
old_streak = '  const quranStreak = useNoorStore((s) => s.quranStreak);'
new_streak = (
    '  const quranStreak = useNoorStore((s) => s.quranStreak);\n'
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
    '  }, [quranDailyAyahs]);'
)

count = content.count(old_streak)
print(f'1. Memo: {count}')
if count == 1:
    content = content.replace(old_streak, new_streak, 1)

# ─── 2. Add the day-of-week chart after the 7-day bar chart closing </> ─────
# Find the closing of quranWeekTotal block right before </Card>
old_week_end = (
    '            </>\n'
    '          )}\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */'
)
new_week_end = (
    '            </>\n'
    '          )}\n'
    '          {/* Day-of-week Quran reading pattern */}\n'
    '          {quranDowPattern.some((v) => v > 0) && (() => {\n'
    '            const DAY_NAMES_AR = ["\u0623\u062d", "\u0627\u062b", "\u062b\u0644", "\u0623\u0631", "\u062e\u0645", "\u062c\u0645", "\u0633\u0628"];\n'
    '            const maxDow = Math.max(1, ...quranDowPattern);\n'
    '            const bestDow = quranDowPattern.indexOf(Math.max(...quranDowPattern));\n'
    '            return (\n'
    '              <div className="mt-4">\n'
    '                <div className="text-xs opacity-50 mb-2 flex items-center justify-between">\n'
    '                  <span>\u0646\u0645\u0637 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u062d\u0633\u0628 \u0627\u0644\u064a\u0648\u0645</span>\n'
    '                  <span className="text-[10px]" style={{ color: "var(--accent)" }}>\u0623\u0643\u062b\u0631 \u064a\u0648\u0645: {DAY_NAMES_AR[bestDow]}</span>\n'
    '                </div>\n'
    '                <div className="flex items-end gap-1.5" style={{ height: "48px" }} role="img" aria-label="\u0646\u0645\u0637 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u062d\u0633\u0628 \u0623\u064a\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639">\n'
    '                  {quranDowPattern.map((v, i) => (\n'
    '                    <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%", justifyContent: "flex-end" }}>\n'
    '                      <div\n'
    '                        className="w-full rounded-t-sm transition-all"\n'
    '                        style={{\n'
    '                          height: v > 0 ? `${Math.max(4, Math.round((v / maxDow) * 36))}px` : "3px",\n'
    '                          background: i === bestDow ? "var(--accent)" : v > 0 ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--card)",\n'
    '                        }}\n'
    '                      />\n'
    '                      <span className="text-[9px] leading-none opacity-40">{DAY_NAMES_AR[i]}</span>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */'
)

count2 = content.count(old_week_end)
print(f'2. Week end: {count2}')
if count2 == 1:
    content = content.replace(old_week_end, new_week_end, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
