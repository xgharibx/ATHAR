#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix the progress grid footer count (started includes completed)."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

old_footer = '            {quranStats.completed.toLocaleString("ar-EG")} \u0645\u0643\u062a\u0645\u0644\u0629 · {quranStats.started.toLocaleString("ar-EG")} \u0628\u062f\u0623\u062a · {(114 - quranStats.started - quranStats.completed).toLocaleString("ar-EG")} \u0644\u0645 \u062a\u0628\u062f\u0623'
new_footer = '            {quranStats.completed.toLocaleString("ar-EG")} \u0645\u0643\u062a\u0645\u0644\u0629 · {(quranStats.started - quranStats.completed).toLocaleString("ar-EG")} \u062c\u0627\u0631\u064a · {(114 - quranStats.started).toLocaleString("ar-EG")} \u0644\u0645 \u062a\u0628\u062f\u0623'

count = content.count(old_footer)
print(f'Footer pattern: {count}')
if count == 1:
    content = content.replace(old_footer, new_footer, 1)
    print('Fixed')

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
