import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

path = os.path.join(base, 'src/pages/Mushaf.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    ('<Settings size={16} />', '<Settings size={16} aria-hidden="true" />', 'Settings'),
    ('<MoreVertical size={17} />', '<MoreVertical size={17} aria-hidden="true" />', 'MoreVertical'),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
