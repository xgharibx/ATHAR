"""Scan VideoLibrary.tsx for non-JSX map/filter/sort/reduce outside useMemo."""
import re

with open('src/pages/VideoLibrary.tsx', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')

# Find useMemo/useCallback ranges
memo_ranges = []
for i, line in enumerate(lines):
    if re.search(r'useMemo|useCallback', line):
        depth = 0
        for j in range(i, min(i + 150, len(lines))):
            depth += lines[j].count('{') - lines[j].count('}')
            if j > i and depth <= 0:
                memo_ranges.append((i, j))
                break

def in_memo(lineno):
    for start, end in memo_ranges:
        if start <= lineno <= end:
            return True
    return False

# Find .filter( or .sort( outside JSX return (not preceded by return/&&/<)
print("Non-JSX filter/sort outside memos:\n")
for i, line in enumerate(lines):
    stripped = line.strip()
    # Only look for .filter( and .sort( since .map( is usually JSX
    if re.search(r'\.(filter|sort)\s*\(', stripped):
        if not in_memo(i):
            # Show context
            print(f'L{i+1}: {stripped[:90]}')
