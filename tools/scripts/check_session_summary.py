#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix session summary UI."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Find exact pattern from disk
idx = content.find('mushaf-session-card')
print(repr(content[idx:idx+600]))
