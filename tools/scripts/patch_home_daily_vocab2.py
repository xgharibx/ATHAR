#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix: add dailyVocabWord memo to Home.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

old_anchor = '  const civilTodayKey = useTodayKey();\n  const worshipDayKey = useTodayKey({'
new_anchor = (
    '  const civilTodayKey = useTodayKey();\n'
    '  const dailyVocabWord = React.useMemo(() => {\n'
    '    const dayNum = Math.floor(Date.now() / 86400000);\n'
    '    const id = (dayNum % QURAN_VOCAB.length) + 1;\n'
    '    return QURAN_VOCAB.find((w) => w.id === id) ?? QURAN_VOCAB[0];\n'
    '  }, []);\n'
    '  const worshipDayKey = useTodayKey({'
)

count = content.count(old_anchor)
print(f'1. Anchor: {count}')
if count == 1:
    content = content.replace(old_anchor, new_anchor, 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
