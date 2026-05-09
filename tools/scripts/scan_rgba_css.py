"""Find rgba(7,8,11,...) in globals.css that might not be on --bg backgrounds"""
import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    lines = f.readlines()

hits = []
for i, line in enumerate(lines):
    s = line.strip()
    if re.search(r'rgba\(\s*7\s*,\s*8\s*,\s*11\s*,', s):
        # Get preceding context (up to 5 lines) to understand what element it's on
        context = []
        for j in range(max(0, i-3), i+1):
            context.append('L'+str(j+1)+': '+lines[j].rstrip()[:70])
        hits.append('\n'.join(context))

print(f'Found {len(hits)} rgba(7,8,11,...) usages in CSS:')
for h in hits:
    print(h)
    print()
