#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Integrate sessionAyahCountRef into the existing session summary."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# The existing summary shows: duration · pages · today ayahs (from store)
# We want to add: · {sessionAyahCountRef.current} آية هذه الجلسة (only if > 0 and different from today total)
old_line = '              {toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 · {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629\n              {(() => {\n                const todayKey = new Date().toISOString().slice(0, 10);\n                const todayAyahs = quranDailyAyahs?.[todayKey] ?? 0;\n                return todayAyahs > 0 ? <span> · {toArabicNumeral(todayAyahs)} \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</span> : null;\n              })()} '
print(f'Pattern found: {content.count(old_line)}')

# simpler approach: just find the line and check what's there
idx = content.find('{toArabicNumeral(sessionDurationMin)}')
print(repr(content[idx:idx+300]))
