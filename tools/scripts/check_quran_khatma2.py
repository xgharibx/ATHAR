#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add khatma-finished card in Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Find the today's khatma reading target section and add a finished card right after it
# The section ends with closing )} and then verse of day follows
# Find: {/* ── Today's khatma reading target ─
marker = "      {/* \u2500\u2500 Today's khatma reading target"
pos = content.find(marker)
print(f'khatma section at {pos}')

# Find the verse of day comment after it
verse_marker = "      {/* \u2500\u2500 Verse of the Day"
verse_pos = content.find(verse_marker, pos)
print(f'verse section at {verse_pos}')

# The text between them contains the khatma card
between = content[pos:verse_pos]
print(f'Between: {repr(between[:80])}')
print(f'Between ends: {repr(between[-100:])}')
