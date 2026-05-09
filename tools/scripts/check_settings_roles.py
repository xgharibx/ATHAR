import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
total = len(lines)
print(f'Total lines: {total}')
for i, line in enumerate(lines):
    if 'HomeWidgetsCard' in line or 'role=' in line:
        print(f'{i+1}: {line.rstrip()}')
