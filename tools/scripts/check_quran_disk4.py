#!/usr/bin/env python3
# Find "quranDailyAyahs" in the stats section on disk
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Find the third occurrence of quranDailyAyahs (around JSX usage)
idx = 0
for i in range(3):
    idx = content.find('quranDailyAyahs', idx + 1)
    print(f'Occurrence {i+1} at {idx}')

if idx > 0:
    print('\nContext around third occurrence:')
    ctx = content[max(0, idx-200):idx+300]
    print(ctx)
