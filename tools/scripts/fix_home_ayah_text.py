#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix ayah.text -> ayah (ayahs are strings, not objects)."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Fix the .text property access
count = content.count('{ayah.text}')
print(f'.text occurrences: {count}')
if count == 1:
    content = content.replace('{ayah.text}', '{ayah}', 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print('Saved')
