"""Find useMemo optimization opportunities in Settings.tsx."""
import re

with open('src/pages/Settings.tsx', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines, 1):
    s = l.strip()
    if (re.match(r'const\s+\w+\s*=\s*themes', s) or 
        ('filter(' in s or 'sort(' in s or 'map(' in s) and
        'useMemo' not in s and 'useCallback' not in s and
        s.startswith('const ')):
        print(f'L{i}: {s[:100]}')
