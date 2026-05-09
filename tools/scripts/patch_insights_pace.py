#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 38: Insights — reading pace projection for khatma completion."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add pace projection after the estimated reading time block
old_anchor = (
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
new_anchor = (
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
    '          })()}\n'
    '          {/* Reading pace projection */}\n'
    '          {quranStats.totalAyahs > 0 && (() => {\n'
    '            const activeDays = Object.values(quranDailyAyahs).filter((v) => (v ?? 0) > 0).length;\n'
    '            if (activeDays < 3) return null; // Need enough data\n'
    '            const avgPerDay = Math.round(quranStats.totalAyahs / activeDays);\n'
    '            if (avgPerDay < 1) return null;\n'
    '            const remaining = Math.max(0, TOTAL_QURAN_AYAHS - quranStats.totalAyahs);\n'
    '            const daysLeft = Math.ceil(remaining / avgPerDay);\n'
    '            const months = Math.floor(daysLeft / 30);\n'
    '            const weeksLeft = Math.ceil((daysLeft % 30) / 7);\n'
    '            const timeLabel = months >= 12\n'
    '              ? `${Math.round(months / 12).toLocaleString("ar-EG")} \u0633\u0646\u0629`\n'
    '              : months >= 2\n'
    '              ? `${months.toLocaleString("ar-EG")} \u0634\u0647\u0631`\n'
    '              : weeksLeft > 0\n'
    '              ? `${weeksLeft.toLocaleString("ar-EG")} \u0623\u0633\u0628\u0648\u0639`\n'
    '              : `${daysLeft.toLocaleString("ar-EG")} \u064a\u0648\u0645`;\n'
    '            return (\n'
    '              <div className="mb-3 -mt-2 flex items-center gap-1.5 text-[11px] opacity-50">\n'
    '                <span>\ud83d\udcc8</span>\n'
    '                <span>\u0628\u0645\u0639\u062f\u0644\u0643 \u0627\u0644\u062d\u0627\u0644\u064a ({avgPerDay.toLocaleString("ar-EG")} \u0622\u064a\u0629/\u064a\u0648\u0645):</span>\n'
    '                <span className="font-semibold opacity-100" style={{ color: daysLeft < 365 ? "var(--ok)" : undefined }}>\n'
    '                  {remaining === 0 ? "\u062e\u062a\u0645\u062a \u0627\u0644\u0642\u0631\u0622\u0646 \ud83c\udf1f" : `\u062e\u062a\u0645\u0629 \u062e\u0644\u0627\u0644 ~${timeLabel}`}\n'
    '                </span>\n'
    '              </div>\n'
    '            );\n'
    '          })()}'
)

count = content.count(old_anchor)
print(f'1. Anchor: {count}')
if count == 1:
    content = content.replace(old_anchor, new_anchor, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
