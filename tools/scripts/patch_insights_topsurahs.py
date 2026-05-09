#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 44: Insights — top 5 most-read surahs ranking."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add topReadSurahs memo after quranHeatmap memo
old_juz_comp = '  const quranJuzCompletion = React.useMemo(() => {'
new_juz_comp = (
    '  // Top surahs by reading completion\n'
    '  const topReadSurahs = React.useMemo(() => {\n'
    '    if (!quranData) return [];\n'
    '    return quranData\n'
    '      .map((s) => {\n'
    '        const maxRead = quranReadingHistory[String(s.id)] ?? 0;\n'
    '        const pct = Math.min(100, Math.round((maxRead / Math.max(1, s.ayahs.length)) * 100));\n'
    '        return { id: s.id, name: s.name, pct, maxRead, total: s.ayahs.length };\n'
    '      })\n'
    '      .filter((s) => s.maxRead > 0)\n'
    '      .sort((a, b) => b.pct - a.pct || b.maxRead - a.maxRead)\n'
    '      .slice(0, 5);\n'
    '  }, [quranData, quranReadingHistory]);\n\n'
    '  const quranJuzCompletion = React.useMemo(() => {'
)
count = content.count(old_juz_comp)
print(f'1. Juz comp: {count}')
if count == 1:
    content = content.replace(old_juz_comp, new_juz_comp, 1)

# 2. Add top surahs card between quran card and prayer card
old_prayer_anchor = '      {/* I2: Prayer consistency chart (28 days) */}\n      <Card className="p-5">'
new_prayer_anchor = (
    '      {/* Top surahs */}\n'
    '      {topReadSurahs.length > 0 && (\n'
    '        <Card className="p-5">\n'
    '          <div className="flex items-center gap-2 mb-3">\n'
    '            <Trophy size={14} className="text-[var(--accent)]" aria-hidden="true" />\n'
    '            <div className="font-semibold text-sm">\u0623\u0643\u062b\u0631 \u0633\u0648\u0631 \u0642\u0631\u0627\u0621\u0629</div>\n'
    '          </div>\n'
    '          <div className="space-y-2">\n'
    '            {topReadSurahs.map((s, i) => (\n'
    '              <div key={s.id} className="flex items-center gap-2">\n'
    '                <span className="text-[11px] font-bold opacity-40 w-4 text-center tabular-nums">{(i + 1).toLocaleString("ar-EG")}</span>\n'
    '                <div className="flex-1 min-w-0">\n'
    '                  <div className="flex items-center justify-between mb-0.5">\n'
    '                    <span className="text-xs font-medium truncate">{s.name}</span>\n'
    '                    <span className="text-[10px] opacity-55 tabular-nums shrink-0 mr-1">{s.pct.toLocaleString("ar-EG")}\u066a</span>\n'
    '                  </div>\n'
    '                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card)" }}>\n'
    '                    <div\n'
    '                      className="h-full rounded-full"\n'
    '                      style={{\n'
    '                        width: `${s.pct}%`,\n'
    '                        background: s.pct >= 100 ? "var(--ok)" : "color-mix(in srgb, var(--accent) 65%, transparent)",\n'
    '                      }}\n'
    '                    />\n'
    '                  </div>\n'
    '                </div>\n'
    '              </div>\n'
    '            ))}\n'
    '          </div>\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */}\n'
    '      <Card className="p-5">'
)
count = content.count(old_prayer_anchor)
print(f'2. Prayer anchor: {count}')
if count == 1:
    content = content.replace(old_prayer_anchor, new_prayer_anchor, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
