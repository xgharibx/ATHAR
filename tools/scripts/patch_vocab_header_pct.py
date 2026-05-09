#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 30: QuranVocab header - show N/200 (X%) learned."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Update the stats subtitle line to show percentage
old_stat = '  {reviewMode ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u2022 " : ""}{(cardIndex + 1).toLocaleString("ar-EG")} / {deck.length.toLocaleString("ar-EG")} \u2022 {learned.size.toLocaleString("ar-EG")} \u0645\u062d\u0641\u0648\u0638\u0629'
new_stat = '  {reviewMode ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u2022 " : ""}{(cardIndex + 1).toLocaleString("ar-EG")} / {deck.length.toLocaleString("ar-EG")} \u2022 {learned.size.toLocaleString("ar-EG")}/{QURAN_VOCAB.length} \u0645\u062d\u0641\u0648\u0638\u0629 ({Math.round((learned.size / QURAN_VOCAB.length) * 100)}\u066a)'

count = content.count(old_stat)
print(f'1. Stat line: {count}')
if count == 1:
    content = content.replace(old_stat, new_stat, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
