#!/usr/bin/env python3
with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')
# Search for daily ayah related text
import re
for term in ['quranDailyAyahs', 'dailyAyahs', 'todayAyah', 'today_', 'quranStreak', 'khatmaStart']:
    matches = [m.start() for m in re.finditer(term, content)]
    print(f'{term}: {len(matches)} matches')
    if matches:
        pos = matches[0]
        print(f'  First: {repr(content[max(0,pos-30):pos+80])}')
