import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Mushaf.tsx', encoding='utf-8') as f:
    content = f.read()

# Find all mushaf-jump-sheet divs
for m in re.finditer(r'<div[^\n]*mushaf-jump-sheet[^\n]*>', content):
    ln = content[:m.start()].count('\n') + 1
    print(f'Line {ln}: {repr(m.group(0)[:200])}')
    print()

print('---')
for m in re.finditer(r'<div[^\n]*mushaf-note-sheet[^\n]*>', content):
    ln = content[:m.start()].count('\n') + 1
    print(f'Line {ln}: {repr(m.group(0)[:200])}')
    print()
