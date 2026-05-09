#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 31: Add estimated reading time to Mushaf surah info panel."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add estimated reading time row
old_grid = (
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0631\u0642\u0645 \u0627\u0644\u0633\u0648\u0631\u0629", String(lastItem.surahId)],'
)
new_grid = (
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629", `~${Math.ceil((quranDB?.find((s) => s.id === lastItem.surahId)?.ayahs.length ?? 0) / 8)} \u062f\u0642\u064a\u0642\u0629`],\n'
    '                    ["\u0631\u0642\u0645 \u0627\u0644\u0633\u0648\u0631\u0629", String(lastItem.surahId)],'
)

count = content.count(old_grid)
print(f'1. Grid rows: {count}')
if count == 1:
    content = content.replace(old_grid, new_grid, 1)

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
