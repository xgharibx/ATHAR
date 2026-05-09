#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add session ayah count to the summary."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Enhance the existing line to also show session-specific ayahs
old = (
    '{toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 · {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629\n'
    '              {(() => {\n'
    '                const todayKey = new Date().toISOString().slice(0, 10);\n'
    '                const todayAyahs = quranDailyAyahs?.[todayKey] ?? 0;\n'
    '                return todayAyahs > 0 ? <span> · {toArabicNumeral(todayAyahs)} \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</span> : null;\n'
    '              })()\n'
    '}\n'
    '            </d'
)

new = (
    '{toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 · {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629\n'
    '              {sessionAyahCountRef.current > 0 && <span> · {toArabicNumeral(sessionAyahCountRef.current)} \u0622\u064a\u0629</span>}\n'
    '              {(() => {\n'
    '                const todayKey = new Date().toISOString().slice(0, 10);\n'
    '                const todayAyahs = quranDailyAyahs?.[todayKey] ?? 0;\n'
    '                return todayAyahs > 0 ? <span style={{ opacity: 0.55 }}> · {toArabicNumeral(todayAyahs)} \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</span> : null;\n'
    '              })()\n'
    '}\n'
    '            </d'
)

count = content.count(old)
print(f'Pattern: {count}')
if count == 1:
    content = content.replace(old, new, 1)
    print('Applied')

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
