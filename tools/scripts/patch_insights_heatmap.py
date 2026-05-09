#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 43: Insights — Quran reading heatmap (7-week grid)."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add quranHeatmap memo after quranDowPattern
old_dow_end = (
    '  // Day-of-week reading pattern (0=Sun ... 6=Sat)\n'
    '  const quranDowPattern = React.useMemo(() => {'
)
# We need to find a good place to insert the new memo — let's look at what's between
# quranDowPattern and quranJuzCompletion
old_juz_start = '  const quranJuzCompletion = React.useMemo(() => {'
new_juz_start = (
    '  // 7-week Quran reading heatmap data\n'
    '  const quranHeatmap = React.useMemo(() => {\n'
    '    const days: { key: string; count: number; isToday: boolean }[] = [];\n'
    '    const today = new Date();\n'
    '    for (let i = 48; i >= 0; i--) {\n'
    '      const d = new Date(today.getTime() - i * 86400000);\n'
    '      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;\n'
    '      days.push({ key, count: quranDailyAyahs[key] ?? 0, isToday: i === 0 });\n'
    '    }\n'
    '    return days;\n'
    '  }, [quranDailyAyahs]);\n\n'
    '  const quranJuzCompletion = React.useMemo(() => {'
)
count = content.count(old_juz_start)
print(f'1. Juz start: {count}')
if count == 1:
    content = content.replace(old_juz_start, new_juz_start, 1)

# 2. Insert heatmap chart UI inside the Quran card, after juz completion block
# Find the closing of the juz block: the "</Card>\n      )}" that closes the quran card
old_quran_card_close = (
    '                )}\n'
    '              </div>\n'
    '            </div>\n'
    '          )}\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */}'
)
new_quran_card_close = (
    '                )}\n'
    '              </div>\n'
    '            </div>\n'
    '          )}\n'
    '          {/* Quran reading heatmap — last 7 weeks */}\n'
    '          {quranHeatmap.some((d) => d.count > 0) && (() => {\n'
    '            const maxCount = Math.max(...quranHeatmap.map((d) => d.count), 1);\n'
    '            const DOW_SHORT = ["\u0623\u062d", "\u0627\u062b", "\u062b\u0644", "\u0623\u0631", "\u062e\u0645", "\u062c\u0645", "\u0633\u0628"];\n'
    '            return (\n'
    '              <div className="mt-4">\n'
    '                <div className="text-xs opacity-50 mb-2">\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 (7 \u0623\u0633\u0627\u0628\u064a\u0639)</div>\n'
    '                <div className="grid grid-cols-7 gap-0.5 mb-0.5">\n'
    '                  {DOW_SHORT.map((l) => <div key={l} className="text-center text-[8px] opacity-40">{l}</div>)}\n'
    '                </div>\n'
    '                <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>\n'
    '                  {quranHeatmap.map((d) => {\n'
    '                    const intensity = d.count === 0 ? 0 : Math.min(1, d.count / Math.max(1, maxCount * 0.6));\n'
    '                    const alpha = d.count === 0 ? 0 : 0.15 + intensity * 0.75;\n'
    '                    return (\n'
    '                      <div\n'
    '                        key={d.key}\n'
    '                        className={`aspect-square rounded-sm ${d.isToday ? "ring-1 ring-[var(--accent)]" : ""}`}\n'
    '                        style={{\n'
    '                          background: d.count === 0 ? "var(--card)" : `color-mix(in srgb, var(--ok) ${Math.round(alpha * 100)}%, transparent)`,\n'
    '                        }}\n'
    '                        title={`${d.key}: ${d.count.toLocaleString("ar-EG")} \u0622\u064a\u0629`}\n'
    '                      />\n'
    '                    );\n'
    '                  })}\n'
    '                </div>\n'
    '                <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] opacity-45">\n'
    '                  <span>\u0642\u0644\u064a\u0644</span>\n'
    '                  {[0.15, 0.4, 0.65, 0.9].map((a, i) => (\n'
    '                    <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `color-mix(in srgb, var(--ok) ${Math.round(a * 100)}%, transparent)` }} />\n'
    '                  ))}\n'
    '                  <span>\u0643\u062b\u064a\u0631</span>\n'
    '                </div>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */}'
)
count = content.count(old_quran_card_close)
print(f'2. Quran card close: {count}')
if count == 1:
    content = content.replace(old_quran_card_close, new_quran_card_close, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
