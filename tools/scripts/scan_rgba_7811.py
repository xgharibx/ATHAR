"""Scan for rgba(7,8,11,...) usage on non-accent backgrounds"""
import re, glob

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
hits = []

for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        lines = f.readlines()
    fname = fpath.replace('src\\', '').replace('src/', '')
    
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith('//') or s.startswith('*'): continue
        # rgba(7,8,11,...) — hardcoded dark color
        if re.search(r'rgba\(\s*7\s*,\s*8\s*,\s*11\s*,', s):
            hits.append((fname, i+1, s[:80]))

print(f'Found {len(hits)} rgba(7,8,11,...) usages in TSX:')
for fname, lineno, text in hits:
    print(f'  {fname}:L{lineno}: {text}')
