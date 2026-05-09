#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 26: Add frequency rank badge to QuranVocab flashcard back."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Add SORTED_BY_FREQ constant after QURAN_VOCAB import ────────────────
# Insert a constant that ranks words by frequency
old_getDailyWord = 'function getDailyWordId(): number {'
new_getDailyWord = (
    '// Words sorted by frequency descending for rank computation\n'
    'const SORTED_IDS_BY_FREQ = [...QURAN_VOCAB]\n'
    '  .sort((a, b) => b.frequency - a.frequency)\n'
    '  .map((w) => w.id);\n\n'
    'function getFreqRankPct(id: number): number {\n'
    '  const rank = SORTED_IDS_BY_FREQ.indexOf(id);\n'
    '  if (rank < 0) return 0;\n'
    '  return Math.round(((rank + 1) / QURAN_VOCAB.length) * 100);\n'
    '}\n\n'
    'function getDailyWordId(): number {'
)

count = content.count(old_getDailyWord)
print(f'1. Insert helper: {count}')
if count == 1:
    content = content.replace(old_getDailyWord, new_getDailyWord, 1)

# ─── 2. Replace the simple frequency line on the card back with richer display ───
old_freq = (
    '                {card.frequency > 0 && (\n'
    '                  <p className="text-xs opacity-70">\u062a\u0643\u0631\u0651\u0631 \u0641\u064a \u0627\u0644\u0642\u0631\u0622\u0646 ~{card.frequency} \u0645\u0631\u0629</p>\n'
    '                )}'
)
new_freq = (
    '                {card.frequency > 0 && (() => {\n'
    '                  const rankPct = getFreqRankPct(card.id);\n'
    '                  const label = rankPct <= 10 ? "\u0627\u0644\u0623\u0643\u062b\u0631 \u062a\u0643\u0631\u0627\u0631\u0627\u064b" : rankPct <= 30 ? "\u0634\u0627\u0626\u0639 \u062c\u062f\u0627\u064b" : rankPct <= 60 ? "\u0634\u0627\u0626\u0639" : "\u0623\u0642\u0644 \u0634\u064a\u0648\u0639\u0627\u064b";\n'
    '                  const color = rankPct <= 10 ? "#22c55e" : rankPct <= 30 ? "#ffd780" : undefined;\n'
    '                  return (\n'
    '                    <div className="flex items-center justify-center gap-1.5 text-xs">\n'
    '                      <span className="opacity-50">\u062a\u0643\u0631\u0651\u0631: {card.frequency.toLocaleString("ar-EG")} \u0645\u0631\u0629</span>\n'
    '                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: color ? `color-mix(in srgb, ${color} 18%, transparent)` : "rgba(255,255,255,0.08)", color: color ?? "rgba(255,255,255,0.55)" }}>{label}</span>\n'
    '                    </div>\n'
    '                  );\n'
    '                })()}'
)

count2 = content.count(old_freq)
print(f'2. Freq line: {count2}')
if count2 == 1:
    content = content.replace(old_freq, new_freq, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
