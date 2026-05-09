#!/usr/bin/env python3
with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Find all occurrences of todayISO
import re
matches = [(m.start(), content[max(0,m.start()-100):m.start()+200]) for m in re.finditer('todayISO', content)]
print(f'Found {len(matches)} occurrences')
for i, (pos, ctx) in enumerate(matches[:5]):
    print(f'\n--- Match {i+1} at {pos} ---')
    print(repr(ctx))
