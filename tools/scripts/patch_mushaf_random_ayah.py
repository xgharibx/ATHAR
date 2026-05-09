#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 56: Add 'Shuffle' icon import + random ayah button in Mushaf settings panel."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add Shuffle to lucide imports
OLD_IMPORT = '  Radio, Timer, Download, SlidersHorizontal,\n} from "lucide-react";'
NEW_IMPORT = '  Radio, Timer, Download, SlidersHorizontal, Shuffle,\n} from "lucide-react";'
c1 = content.count(OLD_IMPORT)
print(f'1. Import: {c1}')
if c1 == 1:
    content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Add random ayah button in settings panel after font scale row
# Anchor: right after the font scale flex row closing div
OLD_FONT_ROW = (
    '            {/* Q3: Translation */}\n'
    '            <div className="flex items-center justify-between mb-3">'
)
NEW_FONT_ROW = (
    '            {/* Phase 56: Random Ayah jump */}\n'
    '            <button\n'
    '              type="button"\n'
    '              className="mushaf-btn-secondary w-full flex items-center gap-2 justify-center mb-3"\n'
    '              onClick={() => {\n'
    '                if (!quranDB || quranDB.length === 0) return;\n'
    '                const randomSurah = quranDB[Math.floor(Math.random() * quranDB.length)]!;\n'
    '                const randomAyah = Math.floor(Math.random() * randomSurah.ayahs.length) + 1;\n'
    '                setShowSettings(false);\n'
    '                navigate(`/mushaf?surah=${randomSurah.id}&ayah=${randomAyah}`);\n'
    '              }}\n'
    '            >\n'
    '              <Shuffle size={14} />\n'
    '              \u0622\u064a\u0629 \u0639\u0634\u0648\u0627\u0626\u064a\u0629\n'
    '            </button>\n'
    '            {/* Q3: Translation */}\n'
    '            <div className="flex items-center justify-between mb-3">'
)
c2 = content.count(OLD_FONT_ROW)
print(f'2. Random ayah button: {c2}')
if c2 == 1:
    content = content.replace(OLD_FONT_ROW, NEW_FONT_ROW, 1)

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
