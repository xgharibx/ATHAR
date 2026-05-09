"""Phase 69: Check for positive tabIndex values (anti-pattern) and missing keyboard handlers."""
import sys, os, glob
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/*.tsx')
issues = []
for f in files:
    with open(f, encoding='utf-8') as fp:
        lines = fp.readlines()
    for i, line in enumerate(lines, 1):
        if 'tabIndex={' in line and 'tabIndex={-1}' not in line and 'tabIndex={0}' not in line:
            issues.append((f, i, line.strip()[:120]))
print('Positive tabIndex values (anti-pattern):')
for f, i, l in issues:
    print(f'  {os.path.relpath(f)} L{i}: {l}')
print(f'Total: {len(issues)}')
print()

# Also check onClick without keyboard handler on non-interactive elements
print('Checking div/span onClick without role or button:')
for f in files:
    with open(f, encoding='utf-8') as fp:
        lines = fp.readlines()
    for i, line in enumerate(lines, 1):
        l = line.strip()
        if 'onClick' in l and ('<div' in l or '<span' in l) and 'role=' not in l and 'button' not in l.lower():
            print(f'  {os.path.relpath(f)} L{i}: {l[:100]}')
