"""Phase 70d: HadithBooks loading state role=status."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/HadithBooks.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    (
        '        <div className="flex flex-col items-center py-12 gap-3 text-[var(--muted)]">\n'
        '          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-h',
        '        <div className="flex flex-col items-center py-12 gap-3 text-[var(--muted)]" role="status">\n'
        '          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-h',
        'HadithBooks loading role=status'
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
