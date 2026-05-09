#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 33: Insights per-juz reading completion mini chart."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Insert quranJuzCompletion memo after overallQuranProgress
old_memo_anchor = (
    '  const overallQuranProgress = React.useMemo(\n'
    '    () => Math.min(100, Math.round((quranStats.totalAyahs / TOTAL_QURAN_AYAHS) * 100)),\n'
    '    [quranStats.totalAyahs]\n'
    '  );'
)
new_memo_anchor = (
    '  const overallQuranProgress = React.useMemo(\n'
    '    () => Math.min(100, Math.round((quranStats.totalAyahs / TOTAL_QURAN_AYAHS) * 100)),\n'
    '    [quranStats.totalAyahs]\n'
    '  );\n'
    '\n'
    '  // Per-juz reading completion (juz 1-30)\n'
    '  const quranJuzCompletion = React.useMemo(() => {\n'
    '    if (!quranData) return [] as { juz: number; pct: number; complete: boolean }[];\n'
    '    const totals: Record<number, number> = {};\n'
    '    const reads: Record<number, number> = {};\n'
    '    for (const s of quranData) {\n'
    '      const juz = SURAH_JUZ[s.id] ?? 1;\n'
    '      totals[juz] = (totals[juz] ?? 0) + s.ayahs.length;\n'
    '      reads[juz] = (reads[juz] ?? 0) + Math.min(quranReadingHistory[String(s.id)] ?? 0, s.ayahs.length);\n'
    '    }\n'
    '    return Array.from({ length: 30 }, (_, i) => {\n'
    '      const juz = i + 1;\n'
    '      const total = totals[juz] ?? 0;\n'
    '      const read = reads[juz] ?? 0;\n'
    '      const pct = total > 0 ? Math.round((read / total) * 100) : 0;\n'
    '      return { juz, pct, complete: total > 0 && read >= total };\n'
    '    });\n'
    '  }, [quranData, quranReadingHistory]);'
)

count1 = content.count(old_memo_anchor)
print(f'1. Memo insert: {count1}')
if count1 == 1:
    content = content.replace(old_memo_anchor, new_memo_anchor, 1)

# 2. Add juz chart after DOW chart pattern, just before the closing </Card>
old_end_card = (
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
    '        </Card>'
)
new_end_card = (
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
    '          {/* Per-juz reading completion */}\n'
    '          {quranJuzCompletion.some((j) => j.pct > 0) && (\n'
    '            <div className="mt-4">\n'
    '              <div className="text-xs opacity-50 mb-2 flex items-center justify-between">\n'
    '                <span>\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0623\u062c\u0632\u0627\u0621 (1-30)</span>\n'
    '                <span className="text-[10px]" style={{ color: "var(--ok)" }}>\n'
    '                  {quranJuzCompletion.filter((j) => j.complete).length} / 30 \u0645\u0643\u062a\u0645\u0644\n'
    '                </span>\n'
    '              </div>\n'
    '              <div className="flex items-end gap-0.5" style={{ height: "44px" }} role="img" aria-label="\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0623\u062c\u0632\u0627\u0621">\n'
    '                {quranJuzCompletion.map(({ juz, pct, complete }) => (\n'
    '                  <div key={juz} className="flex-1 flex flex-col items-center gap-0.5" style={{ height: "100%", justifyContent: "flex-end" }} title={`\u062c\u0632\u0621 ${juz}: ${pct}\u066a`}>\n'
    '                    <div\n'
    '                      className="w-full rounded-t-sm"\n'
    '                      style={{\n'
    '                        height: pct > 0 ? `${Math.max(3, Math.round((pct / 100) * 36))}px` : "2px",\n'
    '                        background: complete ? "var(--ok)" : pct > 0 ? "color-mix(in srgb, var(--accent) 55%, transparent)" : "var(--card)",\n'
    '                      }}\n'
    '                    />\n'
    '                    {(juz % 5 === 1 || juz === 30) && (\n'
    '                      <span className="text-[8px] leading-none opacity-35">{juz}</span>\n'
    '                    )}\n'
    '                  </div>\n'
    '                ))}\n'
    '              </div>\n'
    '            </div>\n'
    '          )}\n'
    '        </Card>'
)

count2 = content.count(old_end_card)
print(f'2. Juz chart: {count2}')
if count2 == 1:
    content = content.replace(old_end_card, new_end_card, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
