"""Phase 72a: aria-describedby for Leaderboard import error messages."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'Leaderboard.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Khatma import input - add aria-describedby
    (
        '          <Input value={importCode} onChange={(e) => { setImportCode(e.target.value); setImportError(""); }} placeholder="الصق كود الختمة هنا" aria-label="كود الختمة" />\n'
        '          {importError && <div className="text-xs text-[var(--danger)]">{importError}</div>}',
        '          <Input value={importCode} onChange={(e) => { setImportCode(e.target.value); setImportError(""); }} placeholder="الصق كود الختمة هنا" aria-label="كود الختمة" aria-describedby="lb-khatma-import-error" />\n'
        '          <div id="lb-khatma-import-error" role="alert" className="text-xs text-[var(--danger)]">{importError}</div>',
        'khatma import error role=alert + id + aria-describedby'
    ),
    # Friends import input - add id and aria-describedby
    (
        '                aria-label="رمز الصديق للإضافة"\n              />\n',
        '                aria-label="رمز الصديق للإضافة"\n                aria-describedby="lb-friend-import-error"\n              />\n',
        'friends import input aria-describedby'
    ),
    (
        '            {importError && <div role="alert" className="mt-1 text-xs text-[var(--danger)]">{importError}</div>}',
        '            <div id="lb-friend-import-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">{importError}</div>',
        'friends import error always-rendered with id'
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
