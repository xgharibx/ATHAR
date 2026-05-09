#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 46: Home.tsx — implement dailyVerse widget."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Replace the dailyVerse null with actual implementation
old_widget = (
    '        if (widgetKey === "dailyVerse") {\n'
    '          return null;\n'
    '        }'
)
new_widget = (
    '        if (widgetKey === "dailyVerse") {\n'
    '          if (!quran.data) return null;\n'
    '          const dayNum = Math.floor(Date.now() / 86400000);\n'
    '          // Cycle through a curated list of meaningful ayahs by day\n'
    '          const VERSE_REFS: Array<{ s: number; a: number }> = [\n'
    '            { s: 2, a: 152 }, { s: 2, a: 186 }, { s: 2, a: 255 }, { s: 2, a: 286 },\n'
    '            { s: 3, a: 139 }, { s: 3, a: 160 }, { s: 6, a: 54 }, { s: 7, a: 56 },\n'
    '            { s: 13, a: 28 }, { s: 14, a: 7 }, { s: 16, a: 97 }, { s: 17, a: 9 },\n'
    '            { s: 18, a: 10 }, { s: 20, a: 132 }, { s: 23, a: 1 }, { s: 29, a: 45 },\n'
    '            { s: 33, a: 41 }, { s: 39, a: 53 }, { s: 40, a: 60 }, { s: 49, a: 13 },\n'
    '            { s: 55, a: 13 }, { s: 65, a: 3 }, { s: 94, a: 5 }, { s: 112, a: 1 },\n'
    '          ];\n'
    '          const ref = VERSE_REFS[dayNum % VERSE_REFS.length]!;\n'
    '          const surah = quran.data.find((s) => s.id === ref.s);\n'
    '          const ayah = surah?.ayahs[ref.a - 1];\n'
    '          if (!surah || !ayah) return null;\n'
    '          return (\n'
    '            <button\n'
    '              type="button"\n'
    '              key={widgetKey}\n'
    '              onClick={() => navigate(`/mushaf?surah=${ref.s}&ayah=${ref.a}`)}\n'
    '              className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] p-4"\n'
    '              style={{\n'
    '                background: "color-mix(in srgb, var(--accent) 5%, var(--card))",\n'
    '                borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)",\n'
    '              }}\n'
    '              aria-label="\u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 \u0627\u0646\u062a\u0642\u0644 \u0644\u0644\u0645\u0635\u062d\u0641"\n'
    '            >\n'
    '              <div className="text-[10px] font-semibold opacity-40 mb-2 tracking-wide">\ud83c\udf1f \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</div>\n'
    '              <div\n'
    '                className="text-base leading-8 mb-2 text-right"\n'
    '                style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--fg)" }}\n'
    '                lang="ar"\n'
    '                dir="rtl"\n'
    '              >\n'
    '                {ayah.text}\n'
    '              </div>\n'
    '              <div className="text-[10px] opacity-45 flex items-center justify-between">\n'
    '                <span>{surah.name} \u2014 \u0622\u064a\u0629 {ref.a.toLocaleString("ar-EG")}</span>\n'
    '                <span className="opacity-50">\u276e</span>\n'
    '              </div>\n'
    '            </button>\n'
    '          );\n'
    '        }'
)
count = content.count(old_widget)
print(f'1. Widget: {count}')
if count == 1:
    content = content.replace(old_widget, new_widget, 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
