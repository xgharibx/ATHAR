#!/usr/bin/env python3
import re
with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')
# Find quranDailyAyahs usage
for m in re.finditer('quranDailyAyahs', content):
    pos = m.start()
    print(f'\n--- at {pos} ---')
    print(repr(content[max(0,pos-40):pos+120]))

# Also search for today in various forms
print('\n=== today variants ===')
for m in re.finditer(r'today|Today|TODAY', content):
    pos = m.start()
    print(repr(content[max(0,pos-20):pos+80]))
