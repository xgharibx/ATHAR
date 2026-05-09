#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 45b: Insert weekly chart — correct anchor."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

old_dow_close = (
    '                      <span className="text-[9px] leading-none opacity-40">{DAY_NAMES_AR[i]}</span>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '          {/* Per-juz reading completion */}\n'
    '          {quranJuzCompletion.some((j) => j.pct > 0) && ('
)
new_dow_close = (
    '                      <span className="text-[9px] leading-none opacity-40">{DAY_NAMES_AR[i]}</span>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '          {/* Weekly comparison chart */}\n'
    '          {quranWeeklyBreakdown.some((w) => w.total > 0) && (() => {\n'
    '            const maxWeek = Math.max(...quranWeeklyBreakdown.map((w) => w.total), 1);\n'
    '            return (\n'
    '              <div className="mt-4">\n'
    '                <div className="text-xs opacity-50 mb-2">\u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064a\u0629 (4 \u0623\u0633\u0627\u0628\u064a\u0639)</div>\n'
    '                <div className="flex items-end gap-2 h-20">\n'
    '                  {quranWeeklyBreakdown.map((wk) => (\n'
    '                    <div key={wk.label} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%", justifyContent: "flex-end" }}>\n'
    '                      {wk.total > 0 && <span className="text-[9px] opacity-60 tabular-nums">{wk.total.toLocaleString("ar-EG")}</span>}\n'
    '                      <div\n'
    '                        className="w-full rounded-t-md"\n'
    '                        style={{\n'
    '                          height: wk.total > 0 ? `${Math.max(4, Math.round((wk.total / maxWeek) * 56))}px` : "3px",\n'
    '                          background: wk.isCurrent ? "var(--accent)" : wk.total > 0 ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--card)",\n'
    '                          opacity: wk.total === 0 ? 0.4 : 1,\n'
    '                        }}\n'
    '                        title={`${wk.label}: ${wk.total.toLocaleString("ar-EG")} \u0622\u064a\u0629`}\n'
    '                      />\n'
    '                      <span className="text-[9px] leading-none opacity-45 text-center">{wk.label}</span>\n'
    '                    </div>\n'
    '                  ))}\n'
    '                </div>\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '          {/* Per-juz reading completion */}\n'
    '          {quranJuzCompletion.some((j) => j.pct > 0) && ('
)
count = content.count(old_dow_close)
print(f'1. DOW close: {count}')
if count == 1:
    content = content.replace(old_dow_close, new_dow_close, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
