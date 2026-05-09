"""Fix missed Mic2 chip icons in Mushaf.tsx"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(BASE, 'src/pages/Mushaf.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

patches = [
    (
        '                      <Mic2 size={14} />\n                      {r.label}',
        '                      <Mic2 size={14} aria-hidden="true" />\n                      {r.label}',
        'Mic2 reciter chip'
    ),
    (
        '              <Mic2 size={14} />\n              {QURAN_RECITERS',
        '              <Mic2 size={14} aria-hidden="true" />\n              {QURAN_RECITERS',
        'Mic2 settings reciter button'
    ),
]

ok = 0
for old, new, label in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'OK [{label}]')
        ok += 1
    else:
        print(f'MISS [{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'{ok} patched')
