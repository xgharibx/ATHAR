#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Find exact bytes of the stats line
idx = content.find('overallQuranProgress.toLocaleString("ar-EG")}')
if idx >= 0:
    snip = content[idx:idx+60]
    print(repr(snip))
    for i, c in enumerate(snip[:50]):
        print(f'  [{i}] U+{ord(c):04X} {c!r}')
