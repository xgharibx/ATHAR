#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add session ayahs - working version."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# 1. Add session ayah inline in the subtitle line
old_subtitle = '{toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 · {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629\n              {(() => {'
new_subtitle = '{toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 · {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629\n              {sessionAyahCountRef.current > 0 && <span> · {toArabicNumeral(sessionAyahCountRef.current)} \u0622\u064a\u0629</span>}\n              {(() => {'

count = content.count(old_subtitle)
print(f'Subtitle pattern: {count}')
if count == 1:
    content = content.replace(old_subtitle, new_subtitle, 1)
    print('Applied')

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
