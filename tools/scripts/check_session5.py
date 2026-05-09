#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add session ayahs to summary - correct pattern."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Get the exact bytes from the file:
idx = content.find('{toArabicNumeral(sessionDurationMin)}')
chunk = content[idx:idx+390]
print(repr(chunk))
print('---')
# Use a simpler replacement: just find the span end and insert after
old = 'return todayAyahs > 0 ? <span> · {toArabicNumeral(todayAyahs)} \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</span> : null;'
new = 'return todayAyahs > 0 ? <span style={{ opacity: 0.55 }}> · {toArabicNumeral(todayAyahs)} \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</span> : null;'
count = content.count(old)
print(f'Pattern: {count}')
