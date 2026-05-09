#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add khatma-finished card in Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Insert a khatma-finished card right before the Verse of the Day section
verse_marker = '      {/* \u2500\u2500 Verse of the Day'
verse_pos = content.find(verse_marker)
print(f'verse section at {verse_pos}')

if verse_pos < 0:
    print('Verse marker not found')
else:
    new_card = (
        '      {/* \u2500\u2500 Khatma finished celebration \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n'
        '      {mode === "surahs" && !query && khatma?.isFinished && (\n'
        '        <div\n'
        '          className="w-full text-center rounded-3xl border p-5 space-y-2"\n'
        '          style={{\n'
        '            background: "color-mix(in srgb, var(--ok, #3ddc97) 8%, var(--card))",\n'
        '            borderColor: "color-mix(in srgb, var(--ok, #3ddc97) 25%, transparent)",\n'
        '          }}\n'
        '        >\n'
        '          <div className="text-2xl" aria-hidden="true">\U0001f3c6</div>\n'
        '          <div className="text-sm font-bold" style={{ color: "var(--ok, #3ddc97)" }}>\u0645\u0628\u0627\u0631\u0643! \u0623\u062a\u0645\u0645\u062a \u0627\u0644\u062e\u062a\u0645\u0629</div>\n'
        '          <div className="text-xs opacity-55">\u062c\u0639\u0644\u0647\u0627 \u0627\u0644\u0644\u0647 \u0641\u064a \u0645\u064a\u0632\u0627\u0646 \u062d\u0633\u0646\u0627\u062a\u0643</div>\n'
        '          <button type="button"\n'
        '            onClick={() => navigate("/quran/plans")}\n'
        '            className="mt-1 text-xs opacity-60 hover:opacity-100 transition underline underline-offset-2"\n'
        '          >\n'
        '            \u0627\u0628\u062f\u0623 \u062e\u062a\u0645\u0629 \u062c\u062f\u064a\u062f\u0629\n'
        '          </button>\n'
        '        </div>\n'
        '      )}\n\n'
    )
    content = content[:verse_pos] + new_card + content[verse_pos:]
    print('Khatma-finished card inserted')

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
