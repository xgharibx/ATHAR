#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 35: Insights — total estimated reading time in Quran card."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add estimated time chip after the monthly ayahs block
old_monthly = (
    '          {/* Monthly ayahs */}\n'
    '          {quranMonthTotal > 0 && (\n'
    '            <div className="mb-4 -mt-2 flex items-center gap-1.5 text-[11px] opacity-50">\n'
    '              <span>\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631:</span>\n'
    '              <span className="tabular-nums font-semibold opacity-100" style={{ color: "var(--accent)" }}>{quranMonthTotal.toLocaleString("ar-EG")}</span>\n'
    '              <span>\u0622\u064a\u0629</span>\n'
    '            </div>\n'
    '          )}'
)
new_monthly = (
    '          {/* Monthly ayahs */}\n'
    '          {quranMonthTotal > 0 && (\n'
    '            <div className="mb-4 -mt-2 flex items-center gap-1.5 text-[11px] opacity-50">\n'
    '              <span>\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631:</span>\n'
    '              <span className="tabular-nums font-semibold opacity-100" style={{ color: "var(--accent)" }}>{quranMonthTotal.toLocaleString("ar-EG")}</span>\n'
    '              <span>\u0622\u064a\u0629</span>\n'
    '            </div>\n'
    '          )}\n'
    '          {/* Estimated total reading time */}\n'
    '          {quranStats.totalAyahs >= 8 && (() => {\n'
    '            const totalMins = Math.round(quranStats.totalAyahs / 8);\n'
    '            const hrs = Math.floor(totalMins / 60);\n'
    '            const mins = totalMins % 60;\n'
    '            return (\n'
    '              <div className="mb-3 -mt-2 flex items-center gap-1.5 text-[11px] opacity-50">\n'
    '                <span>\u23f1</span>\n'
    '                <span>\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u062a\u0642\u062f\u064a\u0631\u064a:</span>\n'
    '                <span className="tabular-nums font-semibold opacity-100">\n'
    '                  {hrs > 0 ? `${hrs.toLocaleString("ar-EG")} \u0633\u0627\u0639\u0629${mins > 0 ? ` ${mins.toLocaleString("ar-EG")} \u062f\u0642` : ""}` : `${mins.toLocaleString("ar-EG")} \u062f\u0642\u064a\u0642\u0629`}\n'
    '                </span>\n'
    '              </div>\n'
    '            );\n'
    '          })()}'
)

count = content.count(old_monthly)
print(f'1. Monthly anchor: {count}')
if count == 1:
    content = content.replace(old_monthly, new_monthly, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
