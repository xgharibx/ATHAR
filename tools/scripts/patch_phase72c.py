"""Phase 72c: Sebha history button aria-expanded + aria-controls."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'Sebha.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    (
        '              aria-label="سجل الجلسات"\n              aria-pressed={showHistory}',
        '              aria-label="سجل الجلسات"\n              aria-expanded={showHistory}\n              aria-controls="sebha-history-panel"',
        'Sebha history button aria-expanded + aria-controls'
    ),
    (
        '      {showHistory && (\n        <Card className="p-4">',
        '      {showHistory && (\n        <Card id="sebha-history-panel" className="p-4">',
        'Sebha history panel id'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
