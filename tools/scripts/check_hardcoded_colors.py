"""Scan for hardcoded color values that should use CSS variables."""
import os
import re

issues = []
skip_files = {'sharePoster.ts', 'LogoMark.tsx'}

for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
    for fn in files:
        if not fn.endswith(('.tsx', '.ts')):
            continue
        if fn in skip_files:
            continue
        fp = os.path.join(root, fn)
        try:
            with open(fp, encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
        except Exception:
            continue
        for i, line in enumerate(lines, 1):
            # Look for hardcoded #000 / black text colors (not in comments)
            stripped = line.split('//')[0]
            if re.search(r'color:\s*["\']?(#000000|#000|black)["\']?', stripped):
                issues.append(f'BLACK {fp}:{i}: {line.rstrip()}')
            # Look for hardcoded white text colors
            if re.search(r'color:\s*["\']?(#ffffff|#fff|white)["\']?', stripped):
                issues.append(f'WHITE {fp}:{i}: {line.rstrip()}')

for x in issues[:30]:
    print(x)
print(f'\nTotal issues: {len(issues)}')
