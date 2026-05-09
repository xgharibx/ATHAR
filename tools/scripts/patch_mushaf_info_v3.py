#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 54: Add ayah count + arabicize reading time in Mushaf surah info panel."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add عدد الآيات after الجزء, and fix reading time to use Arabic numerals
OLD_ROW = (
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629", `~${Math.ceil((quranDB?.find((s) => s.id === lastItem.surahId)?.ayahs.length ?? 0) / 8)} \u062f\u0642\u064a\u0642\u0629`],'
)
NEW_ROW = (
    '                    ["\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz(lastItem.surahId))],\n'
    '                    ["\u0639\u062f\u062f \u0627\u0644\u0622\u064a\u0627\u062a", (quranDB?.find((s) => s.id === lastItem.surahId)?.ayahs.length ?? 0).toLocaleString("ar-EG")],\n'
    '                    ["\u0648\u0642\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629", `~${Math.max(1, Math.ceil((quranDB?.find((s) => s.id === lastItem.surahId)?.ayahs.length ?? 0) / 8)).toLocaleString("ar-EG")} \u062f\u0642\u064a\u0642\u0629`],'
)
c = content.count(OLD_ROW)
print(f'Row match: {c}')
if c == 1:
    content = content.replace(OLD_ROW, NEW_ROW, 1)
    with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
else:
    # Show the relevant section for debugging
    idx = content.find('\u0627\u0644\u062c\u0632\u0621", String(getSurahJuz')
    if idx >= 0:
        print('Found الجزء at:', idx)
        print(repr(content[idx:idx+200]))
