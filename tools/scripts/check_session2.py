#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check full session summary section."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

idx = content.find('mushaf-session-card')
print(repr(content[idx:idx+2000]))
