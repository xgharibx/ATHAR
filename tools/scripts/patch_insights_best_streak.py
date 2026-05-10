#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 59: Best Quran reading streak computed from quranDailyAyahs, shown in analytics card header."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add quranBestStreak memo after quranConsistency30
OLD_MEMO = (
    '  // Phase 52: 30-day reading consistency score\n'
    '  const quranConsistency30 = React.useMemo(() => {'
)
NEW_MEMO = (
    '  // Phase 59: Best Quran reading streak (all-time)\n'
    '  const quranBestStreak = React.useMemo(\n'
    '    () => computeBestStreak(quranDailyAyahs as Record<string, number>),\n'
    '    [quranDailyAyahs]\n'
    '  );\n'
    '\n'
    '  // Phase 52: 30-day reading consistency score\n'
    '  const quranConsistency30 = React.useMemo(() => {'
)
c1 = content.count(OLD_MEMO)
print(f'Memo anchor: {c1}')
if c1 == 1:
    content = content.replace(OLD_MEMO, NEW_MEMO, 1)

# 2. In the card header, show bestStreak alongside current streak
# Current header shows:
#   {quranStreak > 0 && (
#     <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-accent-10 border border-accent-20">
#       <Flame size={11} className="text-[var(--accent)]" aria-hidden="true" />
#       <span className="tabular-nums">{quranStreak.toLocaleString("ar-EG")} يوم</span>
#     </div>
#   )}
OLD_HEADER = (
    '            {quranStreak > 0 && (\n'
    '              <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-accent-10 border border-accent-20">\n'
    '                <Flame size={11} className="text-[var(--accent)]" aria-hidden="true" />\n'
    '                <span className="tabular-nums">{quranStreak.toLocaleString("ar-EG")} \u064a\u0648\u0645</span>\n'
    '              </div>\n'
    '            )}'
)
NEW_HEADER = (
    '            <div className="flex items-center gap-1.5">\n'
    '              {quranStreak > 0 && (\n'
    '                <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-accent-10 border border-accent-20">\n'
    '                  <Flame size={11} className="text-[var(--accent)]" aria-hidden="true" />\n'
    '                  <span className="tabular-nums">{quranStreak.toLocaleString("ar-EG")} \u064a\u0648\u0645</span>\n'
    '                </div>\n'
    '              )}\n'
    '              {quranBestStreak > quranStreak && quranBestStreak > 1 && (\n'
    '                <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg opacity-55" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>\n'
    '                  <span>\u2605</span>\n'
    '                  <span className="tabular-nums">{quranBestStreak.toLocaleString("ar-EG")}</span>\n'
    '                </div>\n'
    '              )}\n'
    '            </div>'
)
c2 = content.count(OLD_HEADER)
print(f'Header anchor: {c2}')
if c2 == 1:
    content = content.replace(OLD_HEADER, NEW_HEADER, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
