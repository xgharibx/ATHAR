#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 48: Meccan vs Medinan reading breakdown in Insights.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add SURAH_REVELATION to import
OLD_IMPORT = 'import { TOTAL_QURAN_AYAHS, SURAH_JUZ } from "@/lib/quranMeta";'
NEW_IMPORT = 'import { TOTAL_QURAN_AYAHS, SURAH_JUZ, SURAH_REVELATION } from "@/lib/quranMeta";'
c1 = content.count(OLD_IMPORT)
print(f'1. Import anchor: {c1}')
if c1 == 1:
    content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Add quranRevelationStats memo after overallQuranProgress memo
MEMO_ANCHOR = '  // Per-juz reading completion (juz 1-30)'
REVELATION_MEMO = '''  // Meccan vs Medinan reading breakdown
  const quranRevelationStats = React.useMemo(() => {
    if (!quranData) return { meccanRead: 0, meccanTotal: 0, medinanRead: 0, medinanTotal: 0 };
    let meccanRead = 0, meccanTotal = 0, medinanRead = 0, medinanTotal = 0;
    for (const s of quranData) {
      const isMedinan = SURAH_REVELATION[s.id] === "medinan";
      const maxRead = quranReadingHistory[String(s.id)] ?? 0;
      const hasStarted = maxRead > 0;
      if (isMedinan) {
        medinanTotal++;
        if (hasStarted) medinanRead++;
      } else {
        meccanTotal++;
        if (hasStarted) meccanRead++;
      }
    }
    return { meccanRead, meccanTotal, medinanRead, medinanTotal };
  }, [quranData, quranReadingHistory]);

'''
c2 = content.count(MEMO_ANCHOR)
print(f'2. Memo anchor: {c2}')
if c2 == 1:
    content = content.replace(MEMO_ANCHOR, REVELATION_MEMO + MEMO_ANCHOR, 1)

# 3. Add revelation breakdown inside quran analytics card, after the 4-stat grid
# Find the grid closing div followed by Monthly ayahs section
CARD_ANCHOR = '          {/* Monthly ayahs */}'
REVELATION_UI = '''          {/* Meccan vs Medinan breakdown */}
          {quranStats.started > 0 && (
            <div className="mb-4 mt-1 grid grid-cols-2 gap-2" aria-label="\u0645\u0643\u064a\u0629 \u0648\u0645\u062f\u0646\u064a\u0629">
              {([
                { label: "\u0645\u0643\u064a\u0629", read: quranRevelationStats.meccanRead, total: quranRevelationStats.meccanTotal, color: "var(--accent)" },
                { label: "\u0645\u062f\u0646\u064a\u0629", read: quranRevelationStats.medinanRead, total: quranRevelationStats.medinanTotal, color: "var(--ok)" },
              ] as const).map(({ label, read, total, color }) => {
                const pct = total > 0 ? Math.round((read / total) * 100) : 0;
                return (
                  <div key={label} className="rounded-xl p-2.5 border" style={{ background: "color-mix(in srgb, var(--card) 80%, var(--bg))", borderColor: "color-mix(in srgb, var(--stroke) 40%, transparent)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                      <span className="text-[10px] opacity-55 tabular-nums">{read.toLocaleString("ar-EG")} / {total.toLocaleString("ar-EG")}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 50%, transparent)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
'''
c3 = content.count(CARD_ANCHOR)
print(f'3. Card anchor: {c3}')
if c3 == 1:
    content = content.replace(CARD_ANCHOR, REVELATION_UI + CARD_ANCHOR, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
