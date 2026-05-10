#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 58: 'remaining ayahs' chip in 'nearly' sort mode in Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

OLD = (
    '                      {sortMode === "unread" && (() => {\n'
    '                        const mins = Math.max(1, Math.round(s.ayahs.length / 8));\n'
    '                        return <span>\u00b7 ~{mins.toLocaleString("ar-EG")} \u062f\u0642</span>;\n'
    '                      })()}'
)
NEW = (
    '                      {sortMode === "unread" && (() => {\n'
    '                        const mins = Math.max(1, Math.round(s.ayahs.length / 8));\n'
    '                        return <span>\u00b7 ~{mins.toLocaleString("ar-EG")} \u062f\u0642</span>;\n'
    '                      })()}\n'
    '                      {sortMode === "nearly" && maxRead > 0 && maxRead < s.ayahs.length && (\n'
    '                        <span className="tabular-nums" style={{ color: "var(--accent)" }}>\n'
    '                          \u00b7 {(s.ayahs.length - maxRead).toLocaleString("ar-EG")} \u0622\u064a\u0629 \u0645\u062a\u0628\u0642\u064a\u0629\n'
    '                        </span>\n'
    '                      )}'
)

c = content.count(OLD)
print(f'Anchor count: {c}')
if c == 1:
    content = content.replace(OLD, NEW, 1)
    with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
