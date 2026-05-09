#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 29: Add ayah count to surah list meta line in Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add ayah count after the revelation type badge
old_meta = (
    '                    <div className="mt-0.5 flex items-center gap-2 text-[11px] opacity-45">\n'
    '                      {s.englishName && <span lang="en">{s.englishName}</span>}\n'
    '                      {s.englishName && <span>\xb7</span>}\n'
    '                      <span className={`surah-type-${isMedinan ? "madani" : "maki"} px-1.5 py-0 rounded-full border text-[9px]`}>\n'
    '                        {isMedinan ? "\u0645\u062f\u0646\u064a\u0629" : "\u0645\u0643\u064a\u0629"}\n'
    '                      </span>\n'
    '                    </div>'
)
new_meta = (
    '                    <div className="mt-0.5 flex items-center gap-2 text-[11px] opacity-45">\n'
    '                      {s.englishName && <span lang="en">{s.englishName}</span>}\n'
    '                      {s.englishName && <span>\xb7</span>}\n'
    '                      <span className={`surah-type-${isMedinan ? "madani" : "maki"} px-1.5 py-0 rounded-full border text-[9px]`}>\n'
    '                        {isMedinan ? "\u0645\u062f\u0646\u064a\u0629" : "\u0645\u0643\u064a\u0629"}\n'
    '                      </span>\n'
    '                      <span>\xb7</span>\n'
    '                      <span className="tabular-nums" aria-label={`\u0639\u062f\u062f \u0622\u064a\u0627\u062a \u0627\u0644\u0633\u0648\u0631\u0629: ${s.ayahs.length}`}>{s.ayahs.length.toLocaleString("ar-EG")} \u0622\u064a\u0629</span>\n'
    '                    </div>'
)

count = content.count(old_meta)
print(f'1. Meta line: {count}')
if count == 1:
    content = content.replace(old_meta, new_meta, 1)

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
