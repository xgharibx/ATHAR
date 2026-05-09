#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add session ayah count to summary card."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

idx = content.find('{toArabicNumeral(sessionDurationMin)}')
chunk = content[idx:idx+400]
print(repr(chunk))
