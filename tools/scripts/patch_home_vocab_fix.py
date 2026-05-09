#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix: remove non-existent 'root' field from Home.tsx vocab widget."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Remove the root lines
old_root = (
    '              {dailyVocabWord.root && (\n'
    '                <div className="text-[11px] opacity-40 mt-0.5" lang="ar">\u062c\u0630\u0631: {dailyVocabWord.root}</div>\n'
    '              )}\n'
)

count = content.count(old_root)
print(f'Root block: {count}')
if count == 1:
    content = content.replace(old_root, '', 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
