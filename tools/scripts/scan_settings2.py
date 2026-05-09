"""Find raw filter/map/sort/reduce in Settings.tsx not inside useMemo blocks."""
import re

with open('src/pages/Settings.tsx', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Track useMemo depth
in_memo_depth = 0
memo_ranges = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'useMemo' in line or 'useCallback' in line:
        depth = 0
        for j in range(i, min(i+100, len(lines))):
            depth += lines[j].count('{') - lines[j].count('}')
            if j > i and depth <= 0:
                memo_ranges.append((i, j))
                break
    i += 1

def in_memo(lineno):
    for start, end in memo_ranges:
        if start <= lineno <= end:
            return True
    return False

print("Lines with raw computes outside useMemo:\n")
for i, line in enumerate(lines):
    stripped = line.strip()
    if re.search(r'\.(filter|map|sort|reduce)\s*\(', stripped):
        if not in_memo(i):
            print(f'L{i+1}: {stripped[:90]}')
