#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 43 part 2: Insert heatmap UI into Insights Quran card (corrected anchor)."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

old_close = (
    '                  </div>\n'
    '                ))}\n'
    '              </div>\n'
    '            </div>\n'
    '          )}\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */}'
)
new_close = (
    '                  </div>\n'
    '                ))}\n'
    '              </div>\n'
    '            </div>\n'
    '          )}\n'
    '          {/* Quran reading heatmap \u2014 last 7 weeks */}\n'
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
    '                  {([0.15, 0.4, 0.65, 0.9] as number[]).map((a, i) => (\n'
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
count = content.count(old_close)
print(f'1. Close: {count}')
if count == 1:
    content = content.replace(old_close, new_close, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
